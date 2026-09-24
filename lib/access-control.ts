import type { Prisma } from "../generated/prisma/client";
import { prisma } from "@/lib/prisma";

export function accessiblePlateTypeWhere(
  userId: string
): Prisma.PlateTypeWhereInput {
  return {
    OR: [{ isDefault: true }, { createdById: userId }],
  };
}

export function accessibleConditionTemplateWhere(
  userId: string
): Prisma.ConditionTemplateWhereInput {
  return {
    OR: [{ isDefault: true }, { createdById: userId }],
  };
}

export function accessibleConditionSetWhere(
  userId: string
): Prisma.ConditionSetWhereInput {
  return {
    OR: [{ isDefault: true }, { createdById: userId }],
  };
}

// ゴミ箱の条件はここにだけ書く。各クエリで直書きすると除外漏れが起きる
export function activePlateWhere(userId: string) {
  return { userId, deletedAt: null } satisfies Prisma.PlateWhereInput;
}

export function trashedPlateWhere(userId: string) {
  return {
    userId,
    deletedAt: { not: null },
  } satisfies Prisma.PlateWhereInput;
}

// 編集できるのは、持ち主のゴミ箱に入っていないプレートのウェルとドロップだけ。
// ゴミ箱のプレートのドロップは読めるが、ここを通る書き込みはできない
export function editableWellWhere(userId: string) {
  return { plate: activePlateWhere(userId) } satisfies Prisma.WellWhereInput;
}

export function editableDropWhere(userId: string) {
  return { well: editableWellWhere(userId) } satisfies Prisma.DropWhereInput;
}

export function getAccessibleConditionTemplate(id: number, userId: string) {
  return prisma.conditionTemplate.findFirst({
    where: {
      AND: [{ id }, accessibleConditionTemplateWhere(userId)],
    },
  });
}
