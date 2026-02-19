"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validations";

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
}

export async function updateUser(data: {
  name?: string;
  role?: string;
  email?: string;
  organization?: string;
  bio?: string;
}) {
  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const userId = await getCurrentUserId();
  return prisma.user.update({
    where: { id: userId },
    data: parsed.data,
  });
}
