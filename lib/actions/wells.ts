"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { resourceIdSchema, updateWellSchema } from "@/lib/validations";
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
  const parsedId = resourceIdSchema.safeParse(id);
  const parsed = updateWellSchema.safeParse(data);
  if (!parsedId.success) return { error: "Not found" };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const well = await prisma.well.findUnique({
    where: { id: parsedId.data },
    include: { plate: { select: { userId: true, deletedAt: true } } },
  });

  // ゴミ箱のプレートのウェルは編集させない
  if (!well || well.plate.userId !== userId || well.plate.deletedAt) {
    return { error: "Not found" };
  }

  return prisma.well.update({
    where: { id: parsedId.data },
    data: parsed.data,
  });
}
