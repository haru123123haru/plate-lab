"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { accessiblePlateTypeWhere } from "@/lib/access-control";
import { prismaErrorCode } from "@/lib/prisma-error";
import { createPlateTypeSchema, resourceIdSchema } from "@/lib/validations";

export async function getPlateTypes() {
  const userId = await getCurrentUserId();

  return prisma.plateType.findMany({
    where: accessiblePlateTypeWhere(userId),
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function createPlateType(data: {
  name: string;
  rows: number;
  cols: number;
  maxDrops: number;
  layout: "SITTING" | "HANGING";
  description?: string;
}) {
  const userId = await getCurrentUserId();
  const parsed = createPlateTypeSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  return prisma.plateType.create({
    data: {
      name: parsed.data.name,
      rows: parsed.data.rows,
      cols: parsed.data.cols,
      maxDrops: parsed.data.maxDrops,
      layout: parsed.data.layout,
      description: parsed.data.description ?? null,
      createdById: userId,
      isDefault: false,
    },
  });
}

// 使っているプレートがあれば消さない。ゴミ箱のプレートも数える
export async function deletePlateType(
  id: string
): Promise<
  | { success: true }
  | { error: "Not found" }
  | { error: "In use"; count?: number }
> {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  // 数える前に持ち主を確かめる。他人のタイプの使用枚数を返さないため
  const plateType = await prisma.plateType.findFirst({
    where: { id: parsedId.data, createdById: userId, isDefault: false },
    select: { id: true },
  });
  if (!plateType) return { error: "Not found" };

  const count = await prisma.plate.count({
    where: { plateTypeId: parsedId.data },
  });
  if (count > 0) return { error: "In use", count };

  // 数えたあとに別のタブでプレートが作られても、外部キー（ON DELETE RESTRICT）が削除を拒む
  try {
    await prisma.plateType.delete({ where: { id: parsedId.data } });
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === "P2003") return { error: "In use" };
    if (code === "P2025") return { error: "Not found" };
    throw error;
  }
  return { success: true };
}
