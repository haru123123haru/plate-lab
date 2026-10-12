"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { t, toLocale } from "@/lib/i18n";
import { isPushConfigured, sendPush } from "@/lib/push";
import { pushEndpointSchema, pushSubscriptionSchema } from "@/lib/validations";

// この端末の受け口を保存する。同じ endpoint を別のアカウントが持っていたら、こちらに移す
export async function savePushSubscription(data: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const userId = await getCurrentUserId();
  const parsed = pushSubscriptionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { endpoint, keys } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  return { success: true as const };
}

// この端末の受け口を消す。自分のものだけ
export async function deletePushSubscription(endpoint: string) {
  const userId = await getCurrentUserId();
  const parsed = pushEndpointSchema.safeParse(endpoint);
  if (!parsed.success) return { error: "Invalid input" };

  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint: parsed.data },
  });
  return { success: true as const };
}

// この端末にテスト通知を送る
export async function sendTestNotification(endpoint: string) {
  const userId = await getCurrentUserId();
  const parsed = pushEndpointSchema.safeParse(endpoint);
  if (!parsed.success) return { error: "invalid" as const };
  if (!isPushConfigured()) return { error: "not-configured" as const };

  const [subscription, settings] = await Promise.all([
    prisma.pushSubscription.findFirst({
      where: { userId, endpoint: parsed.data },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    }),
    prisma.userSettings.findUnique({
      where: { userId },
      select: { language: true },
    }),
  ]);
  if (!subscription) return { error: "not-found" as const };

  const locale = toLocale(settings?.language);
  const sent = await sendPush([subscription], {
    title: t(locale, "testNotificationTitle"),
    body: t(locale, "testNotificationBody"),
    url: "/settings",
  });
  return sent > 0 ? { success: true as const } : { error: "failed" as const };
}
