"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import {
  createPlateSchema,
  resourceIdSchema,
  searchPlatesSchema,
  updatePlateSchema,
} from "@/lib/validations";
import {
  accessiblePlateTypeWhere,
  accessibleConditionTemplateWhere,
  activePlateWhere,
  getAccessibleConditionTemplate,
  trashedPlateWhere,
} from "@/lib/access-control";
import type { WellStatus } from "../../generated/prisma/client";

export async function getPlates() {
  const userId = await getCurrentUserId();
  return prisma.plate.findMany({
    where: {
      ...activePlateWhere(userId),
      plateType: accessiblePlateTypeWhere(userId),
    },
    include: {
      plateType: true,
      wells: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPlateById(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return null;

  const plate = await prisma.plate.findFirst({
    where: {
      id: parsedId.data,
      userId,
      plateType: accessiblePlateTypeWhere(userId),
      OR: [
        { reservoirTemplateId: null },
        { reservoirTemplate: accessibleConditionTemplateWhere(userId) },
      ],
      AND: [
        {
          OR: [
            { screeningTemplateId: null },
            { screeningTemplate: accessibleConditionTemplateWhere(userId) },
          ],
        },
      ],
    },
    include: {
      plateType: true,
      reservoirTemplate: {
        include: {
          wells: true,
        },
      },
      screeningTemplate: {
        include: {
          wells: true,
        },
      },
      wells: {
        orderBy: [{ row: "asc" }, { col: "asc" }],
        include: {
          drops: {
            orderBy: { slot: "asc" },
            include: { observations: { orderBy: { observedAt: "desc" } } },
          },
        },
      },
    },
  });

  if (!plate || plate.userId !== userId) {
    return null;
  }

  return plate;
}

export async function createPlate(data: {
  name: string;
  plateTypeId: string;
  sampleName?: string;
  reservoirTemplateId?: number | null;
  screeningTemplateId?: number | null;
  notes?: string;
  filledPositions?: string[];
}) {
  const userId = await getCurrentUserId();
  const parsed = createPlateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // プレートタイプの形からウェルを自動生成
  const plateType = await prisma.plateType.findFirst({
    where: {
      AND: [{ id: parsed.data.plateTypeId }, accessiblePlateTypeWhere(userId)],
    },
  });
  if (!plateType) return { error: "Not found" };

  const { rows, cols } = plateType;
  const requestedPositions = parsed.data.filledPositions ?? [];
  const hasInvalidPosition = requestedPositions.some((position) => {
    const [row, col] = position.split("-").map(Number);
    return row < 0 || row >= rows || col < 0 || col >= cols;
  });
  if (hasInvalidPosition) return { error: "Invalid well position" };

  const templateIds = [
    parsed.data.reservoirTemplateId,
    parsed.data.screeningTemplateId,
  ].filter((id): id is number => id !== null && id !== undefined);
  const accessibleTemplates = await Promise.all(
    templateIds.map((id) => getAccessibleConditionTemplate(id, userId))
  );
  if (accessibleTemplates.some((template) => !template)) {
    return { error: "Not found" };
  }

  const rowLabels = "ABCDEFGH";
  const filledSet = new Set(requestedPositions);

  const wells: {
    position: string;
    row: number;
    col: number;
    status: WellStatus;
  }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      wells.push({
        position: `${rowLabels[r]}${c + 1}`,
        row: r,
        col: c,
        status: filledSet.has(`${r}-${c}`) ? "FILLED" : "EMPTY",
      });
    }
  }

  return prisma.plate.create({
    data: {
      name: parsed.data.name,
      plateTypeId: parsed.data.plateTypeId,
      sampleName: parsed.data.sampleName ?? null,
      reservoirTemplateId: parsed.data.reservoirTemplateId ?? null,
      screeningTemplateId: parsed.data.screeningTemplateId ?? null,
      notes: parsed.data.notes,
      userId,
      wells: { create: wells },
    },
    include: {
      plateType: true,
      wells: true,
    },
  });
}

export async function updatePlate(
  id: string,
  data: {
    name?: string;
    notes?: string | null;
    sampleName?: string | null;
    reservoirTemplateId?: number | null;
    screeningTemplateId?: number | null;
  }
) {
  const userId = await getCurrentUserId();
  const parsed = updatePlateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const plate = await prisma.plate.findFirst({
    where: { id: parsedId.data, ...activePlateWhere(userId) },
    select: { id: true },
  });

  if (!plate) {
    return { error: "Not found" };
  }

  const templateIds = [
    parsed.data.reservoirTemplateId,
    parsed.data.screeningTemplateId,
  ].filter(
    (templateId): templateId is number =>
      templateId !== null && templateId !== undefined
  );
  const accessibleTemplates = await Promise.all(
    templateIds.map((templateId) =>
      getAccessibleConditionTemplate(templateId, userId)
    )
  );
  if (accessibleTemplates.some((template) => !template)) {
    return { error: "Not found" };
  }

  // 確認と更新の間にゴミ箱へ移された場合は更新しない
  return prisma.plate.update({
    where: { id: parsedId.data, deletedAt: null },
    data: parsed.data,
    include: {
      plateType: true,
      wells: true,
    },
  });
}

export async function searchPlates(query: string) {
  const userId = await getCurrentUserId();
  const parsed = searchPlatesSchema.safeParse(query);
  if (!parsed.success) return [];
  const normalizedQuery = parsed.data;
  if (!normalizedQuery) {
    return prisma.plate.findMany({
      where: {
        ...activePlateWhere(userId),
        plateType: accessiblePlateTypeWhere(userId),
      },
      include: { plateType: true, wells: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  return prisma.plate.findMany({
    where: {
      ...activePlateWhere(userId),
      plateType: accessiblePlateTypeWhere(userId),
      OR: [
        { name: { contains: normalizedQuery, mode: "insensitive" } },
        { sampleName: { contains: normalizedQuery, mode: "insensitive" } },
        {
          plateType: {
            name: { contains: normalizedQuery, mode: "insensitive" },
          },
        },
        { notes: { contains: normalizedQuery, mode: "insensitive" } },
      ],
    },
    include: { plateType: true, wells: true },
    orderBy: { updatedAt: "desc" },
  });
}

// ゴミ箱へ移す。物理削除は purgePlate だけが行う
export async function deletePlate(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const { count } = await prisma.plate.updateMany({
    where: { id: parsedId.data, ...activePlateWhere(userId) },
    data: { deletedAt: new Date() },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}

export async function getTrashedPlates() {
  const userId = await getCurrentUserId();
  return prisma.plate.findMany({
    where: {
      ...trashedPlateWhere(userId),
      // getPlates と揃え、一覧に出るのに詳細が開けないプレートを作らない
      plateType: accessiblePlateTypeWhere(userId),
    },
    include: { plateType: true },
    orderBy: { deletedAt: "desc" },
  });
}

export async function restorePlate(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const { count } = await prisma.plate.updateMany({
    where: { id: parsedId.data, ...trashedPlateWhere(userId) },
    data: { deletedAt: null },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}

// ゴミ箱に入っているプレートだけを物理削除する。ウェルは onDelete: Cascade で消える
export async function purgePlate(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const { count } = await prisma.plate.deleteMany({
    where: { id: parsedId.data, ...trashedPlateWhere(userId) },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}
