"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { WellStatus } from "../../generated/prisma/client";

export async function updateWell(
  id: string,
  data: {
    status?: WellStatus;
    protein?: string | null;
    concentration?: string | null;
    buffer?: string | null;
    ph?: string | null;
    precipitant?: string | null;
    notes?: string | null;
  }
) {
  const userId = await getCurrentUserId();
  const well = await prisma.well.findUnique({
    where: { id },
    include: { plate: { select: { userId: true } } },
  });

  if (!well || well.plate.userId !== userId) {
    throw new Error("Not found");
  }

  return prisma.well.update({
    where: { id },
    data,
  });
}
