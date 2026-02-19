"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth";

export async function getUserSettings() {
  // RootLayout から呼ばれるため、未認証時は redirect せず null を返す
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.userSettings.findUnique({
    where: { userId: user.id },
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

  return prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
}
