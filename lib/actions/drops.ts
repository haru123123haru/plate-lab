"use server";

import { prisma } from "@/lib/prisma";
import { prismaErrorCode } from "@/lib/prisma-error";
import { getCurrentUserId } from "@/lib/auth";
import {
  activePlateWhere,
  editableDropWhere,
  editableWellWhere,
} from "@/lib/access-control";
import {
  addObservationSchema,
  createDropSchema,
  resourceIdSchema,
  updateDropSchema,
} from "@/lib/validations";
import type { Prisma } from "../../generated/prisma/client";
import type { CrystalMark } from "@/types";

// ドロップや観察を変えたら、プレートの更新日時も進める。一覧の「更新が新しい」順と、
// 詳細の「更新日」に出すため。@updatedAt はプレートの行を直したときしか進まない
function touchPlate(userId: string, where: Prisma.PlateWhereInput) {
  return prisma.plate.updateMany({
    where: { ...activePlateWhere(userId), ...where },
    data: { updatedAt: new Date() },
  });
}

export async function createDrop(data: {
  wellId: string;
  slot: number;
  sampleName: string;
  concentration: string;
  notes?: string | null;
}) {
  const userId = await getCurrentUserId();
  const parsed = createDropSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { wellId, ...drop } = parsed.data;

  const well = await prisma.well.findFirst({
    where: { id: wellId, ...editableWellWhere(userId) },
    select: {
      plate: { select: { plateType: { select: { maxDrops: true } } } },
    },
  });
  if (!well) return { error: "Not found" };
  if (drop.slot > well.plate.plateType.maxDrops) {
    return { error: "Invalid slot" };
  }

  // connect の条件にも認可を入れ、あいだにゴミ箱へ移されたウェルには作らない
  let created;
  try {
    created = await prisma.drop.create({
      data: {
        ...drop,
        well: { connect: { id: wellId, ...editableWellWhere(userId) } },
      },
    });
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === "P2002") return { error: "Slot in use" };
    if (code === "P2025") return { error: "Not found" };
    throw error;
  }
  await touchPlate(userId, { wells: { some: { id: wellId } } });
  return created;
}

export async function updateDrop(
  id: string,
  data: {
    sampleName?: string;
    concentration?: string;
    notes?: string | null;
  }
) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };
  const parsed = updateDropSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let updated;
  try {
    updated = await prisma.drop.update({
      where: { id: parsedId.data, ...editableDropWhere(userId) },
      data: parsed.data,
    });
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") return { error: "Not found" };
    throw error;
  }
  await touchPlate(userId, {
    wells: { some: { drops: { some: { id: parsedId.data } } } },
  });
  return updated;
}

export async function deleteDrop(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  // 消したあとはドロップからプレートをたどれないので、先に進める。
  // 消せないドロップなら、同じ条件でプレートも見つからない
  await touchPlate(userId, {
    wells: { some: { drops: { some: { id: parsedId.data } } } },
  });
  // 観察は onDelete: Cascade で消える
  const { count } = await prisma.drop.deleteMany({
    where: { id: parsedId.data, ...editableDropWhere(userId) },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}

export async function addObservation(data: {
  dropId: string;
  observedAt: string;
  notes: string;
  mark?: CrystalMark | null;
}) {
  const userId = await getCurrentUserId();
  const parsed = addObservationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { dropId, observedAt, notes, mark } = parsed.data;

  let created;
  try {
    created = await prisma.observation.create({
      data: {
        observedAt: new Date(`${observedAt}T00:00:00Z`),
        notes,
        mark: mark ?? null,
        drop: { connect: { id: dropId, ...editableDropWhere(userId) } },
      },
    });
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") return { error: "Not found" };
    throw error;
  }
  await touchPlate(userId, {
    wells: { some: { drops: { some: { id: dropId } } } },
  });
  return created;
}

export async function deleteObservation(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  // deleteDrop と同じく、消す前に進める
  await touchPlate(userId, {
    wells: {
      some: {
        drops: { some: { observations: { some: { id: parsedId.data } } } },
      },
    },
  });
  const { count } = await prisma.observation.deleteMany({
    where: { id: parsedId.data, drop: editableDropWhere(userId) },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}
