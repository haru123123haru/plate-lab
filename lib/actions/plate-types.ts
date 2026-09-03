"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { accessiblePlateTypeWhere } from "@/lib/access-control";
import { createPlateTypeSchema } from "@/lib/validations";

export async function getPlateTypes() {
  const userId = await getCurrentUserId();

  return prisma.plateType.findMany({
    where: accessiblePlateTypeWhere(userId),
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function createPlateType(data: {
  name: string;
  wellCount: number;
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
      wellCount: parsed.data.wellCount,
      description: parsed.data.description ?? null,
      createdById: userId,
      isDefault: false,
    },
  });
}
