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

export function getAccessibleConditionTemplate(
  id: number,
  userId: string
) {
  return prisma.conditionTemplate.findFirst({
    where: {
      AND: [{ id }, accessibleConditionTemplateWhere(userId)],
    },
  });
}
