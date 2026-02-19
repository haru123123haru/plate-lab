"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export async function getPlateTypes() {
  return prisma.plateType.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function createPlateType(data: {
  name: string;
  wellCount: number;
  description?: string;
}) {
  const userId = await getCurrentUserId();

  return prisma.plateType.create({
    data: {
      name: data.name,
      wellCount: data.wellCount,
      description: data.description,
      createdById: userId,
    },
  });
}
