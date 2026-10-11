"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getSessionUserId } from "@/lib/auth";
import { updateUserSettingsSchema } from "@/lib/validations";

export async function getUserSettings() {
  // RootLayout から呼ばれるため、未認証時は redirect せず null を返す
  const userId = await getSessionUserId();
  if (!userId) return null;

  return prisma.userSettings.findUnique({
    where: { userId },
  });
}

export async function updateUserSettings(data: {
  language?: string;
  appearance?: string;
  notifNewPlate?: boolean;
  notifStatus?: boolean;
  notifReminder?: boolean;
}) {
  const userId = await getCurrentUserId();
  const parsed = updateUserSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  return prisma.userSettings.upsert({
    where: { userId },
    update: parsed.data,
    create: {
      userId,
      ...parsed.data,
    },
  });
}
