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
  bulkCreateDropsSchema,
  createDropSchema,
  resourceIdSchema,
  updateDropSchema,
} from "@/lib/validations";

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
  try {
    return await prisma.drop.create({
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

  try {
    return await prisma.drop.update({
      where: { id: parsedId.data, ...editableDropWhere(userId) },
      data: parsed.data,
    });
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") return { error: "Not found" };
    throw error;
  }
}

export async function deleteDrop(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  // 観察は onDelete: Cascade で消える
  const { count } = await prisma.drop.deleteMany({
    where: { id: parsedId.data, ...editableDropWhere(userId) },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}

// 同じサンプルを複数のウェル・置き場所へまとめて入れる。既存のドロップは上書きしない
export async function bulkCreateDrops(data: {
  plateId: string;
  positions: string[];
  sampleName: string;
  drops: { slot: number; concentration: string }[];
}) {
  const userId = await getCurrentUserId();
  const parsed = bulkCreateDropsSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { plateId, sampleName, drops: slotDrops } = parsed.data;
  const positions = [...new Set(parsed.data.positions)];

  // ウェル ID ではなくプレート ID で受けるので、持ち主の確認はここの1回で済む
  const plate = await prisma.plate.findFirst({
    where: { id: plateId, ...activePlateWhere(userId) },
    select: {
      plateType: { select: { maxDrops: true } },
      wells: {
        where: { position: { in: positions } },
        select: { id: true },
      },
    },
  });
  if (!plate) return { error: "Not found" };
  if (plate.wells.length !== positions.length) {
    return { error: "Invalid well position" };
  }
  if (slotDrops.some(({ slot }) => slot > plate.plateType.maxDrops)) {
    return { error: "Invalid slot" };
  }

  // ponytail: 確認と作成のあいだにゴミ箱へ移されると作ってしまう。気になったらトランザクションで行ロックを取る
  const drops = plate.wells.flatMap((well) =>
    slotDrops.map(({ slot, concentration }) => ({
      wellId: well.id,
      slot,
      sampleName,
      concentration,
    }))
  );
  const { count } = await prisma.drop.createMany({
    data: drops,
    skipDuplicates: true,
  });
  return { created: count, skipped: drops.length - count };
}

export async function addObservation(data: {
  dropId: string;
  observedAt: string;
  notes: string;
}) {
  const userId = await getCurrentUserId();
  const parsed = addObservationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { dropId, observedAt, notes } = parsed.data;

  try {
    return await prisma.observation.create({
      data: {
        observedAt: new Date(`${observedAt}T00:00:00Z`),
        notes,
        drop: { connect: { id: dropId, ...editableDropWhere(userId) } },
      },
    });
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") return { error: "Not found" };
    throw error;
  }
}

export async function deleteObservation(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const { count } = await prisma.observation.deleteMany({
    where: { id: parsedId.data, drop: editableDropWhere(userId) },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}
