"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { createPlateSchema } from "@/lib/validations";
import type { PlateStatus, WellStatus } from "@prisma/client";

export async function getPlates() {
  const userId = await getCurrentUserId();
  return prisma.plate.findMany({
    where: { userId },
    include: {
      plateType: true,
      wells: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPlateById(id: string) {
  const userId = await getCurrentUserId();
  const plate = await prisma.plate.findUnique({
    where: { id },
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
  const parsed = createPlateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const userId = await getCurrentUserId();

  // プレートタイプから wellCount を取得してウェルを自動生成
  const plateType = await prisma.plateType.findUniqueOrThrow({
    where: { id: parsed.data.plateTypeId },
  });

  const rows = plateType.wellCount === 24 ? 4 : 8;
  const cols = plateType.wellCount === 24 ? 6 : 12;
  const rowLabels = "ABCDEFGH";
  const filledSet = new Set(parsed.data.filledPositions ?? []);

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
    notes?: string;
    sampleName?: string | null;
    reservoirTemplateId?: number | null;
    screeningTemplateId?: number | null;
  }
) {
  const userId = await getCurrentUserId();
  const plate = await prisma.plate.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!plate || plate.userId !== userId) {
    throw new Error("Not found");
  }

  return prisma.plate.update({
    where: { id },
    data,
    include: {
      plateType: true,
      wells: true,
    },
  });
}

export async function searchPlates(query: string) {
  const userId = await getCurrentUserId();
  return prisma.plate.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sampleName: { contains: query, mode: "insensitive" } },
        { plateType: { name: { contains: query, mode: "insensitive" } } },
        { notes: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { plateType: true, wells: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function deletePlate(id: string) {
  const userId = await getCurrentUserId();
  const plate = await prisma.plate.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!plate || plate.userId !== userId) {
    throw new Error("Not found");
  }

  return prisma.plate.delete({ where: { id } });
}
