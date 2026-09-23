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
  getAccessibleConditionTemplate,
} from "@/lib/access-control";
import type { PlateStatus, WellStatus } from "../../generated/prisma/client";

export async function getPlates() {
  const userId = await getCurrentUserId();
  return prisma.plate.findMany({
    where: {
      userId,
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

  // プレートタイプから wellCount を取得してウェルを自動生成
  const plateType = await prisma.plateType.findFirst({
    where: {
      AND: [{ id: parsed.data.plateTypeId }, accessiblePlateTypeWhere(userId)],
    },
  });
  if (!plateType) return { error: "Not found" };

  const geometry =
    plateType.wellCount === 24
      ? { rows: 4, cols: 6 }
      : plateType.wellCount === 96
        ? { rows: 8, cols: 12 }
        : null;
  if (!geometry) return { error: "Not found" };

  const { rows, cols } = geometry;
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
    status?: PlateStatus;
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
    where: { id: parsedId.data, userId },
    select: { id: true },
  });

  if (!plate) {
    throw new Error("Not found");
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
    throw new Error("Not found");
  }

  return prisma.plate.update({
    where: { id: parsedId.data },
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
        userId,
        plateType: accessiblePlateTypeWhere(userId),
      },
      include: { plateType: true, wells: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  return prisma.plate.findMany({
    where: {
      userId,
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

export async function deletePlate(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) throw new Error("Not found");
  const plate = await prisma.plate.findUnique({
    where: { id: parsedId.data },
    select: { userId: true },
  });

  if (!plate || plate.userId !== userId) {
    throw new Error("Not found");
  }

  return prisma.plate.delete({ where: { id: parsedId.data } });
}
