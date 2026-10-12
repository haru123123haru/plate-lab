import { prisma } from "@/lib/prisma";
import { toLocale } from "@/lib/i18n";
import { sendPush } from "@/lib/push";
import {
  REMINDER_CATCH_UP_DAYS,
  addDays,
  buildReminderPayload,
  selectReminderPlates,
  tokyoToday,
} from "@/lib/notifications";
import { MAX_REMINDER_DAYS } from "@/lib/validations";

// 送ると決めたプレート。dueDate はリマインドの日
interface DuePlate {
  id: string;
  reminderSentFor: Date | null;
  dueDate: Date;
}

// 毎朝の通知。app/api/cron/notifications/route.ts から1日1回呼ぶ。
// 通知を受ける端末を持つ人ごとに、今日知らせるプレートをまとめて1通送る
export async function sendDailyNotifications(now: Date = new Date()) {
  const today = tokyoToday(now);
  // 遅れて送る分も含めて、リマインドの日になりうる仕込み日の範囲
  const earliestSetup = addDays(
    today,
    -(MAX_REMINDER_DAYS + REMINDER_CATCH_UP_DAYS)
  );

  const users = await prisma.user.findMany({
    where: {
      pushSubscriptions: { some: {} },
      // 設定の行が無い人は既定（オン）として扱う
      OR: [{ settings: null }, { settings: { notifReminder: true } }],
    },
    select: {
      id: true,
      settings: { select: { language: true } },
      pushSubscriptions: {
        select: { id: true, endpoint: true, p256dh: true, auth: true },
      },
      plates: {
        where: {
          deletedAt: null,
          reminderDays: { not: null },
          setupDate: { gte: earliestSetup, lt: today },
        },
        orderBy: { setupDate: "asc" },
        select: {
          id: true,
          name: true,
          setupDate: true,
          reminderDays: true,
          reminderSentFor: true,
        },
      },
    },
  });

  const lastObserved = await lastObservedDates(
    users.flatMap((user) => user.plates.map((plate) => plate.id)),
    addDays(today, -REMINDER_CATCH_UP_DAYS)
  );

  const results = await Promise.all(
    users.map(async (user) => {
      const due = selectReminderPlates(
        user.plates.map((plate) => ({
          ...plate,
          lastObservedAt: lastObserved.get(plate.id) ?? null,
        })),
        today
      );
      const claimed = await claim(due);
      const payload = buildReminderPayload(
        claimed,
        toLocale(user.settings?.language)
      );
      if (!payload) return 0;

      const delivered = await sendPush(user.pushSubscriptions, payload);
      // 1通も届かなければ、翌日にまた送れるよう記録を戻す
      if (delivered === 0) await release(claimed);
      return delivered;
    })
  );

  return {
    notifiedUsers: results.filter((delivered) => delivered > 0).length,
    deliveries: results.reduce((sum, delivered) => sum + delivered, 0),
  };
}

// プレートごとの、since 以降で最後に観察した日
async function lastObservedDates(plateIds: string[], since: Date) {
  const observations = await prisma.observation.findMany({
    where: {
      observedAt: { gte: since },
      drop: { well: { plateId: { in: plateIds } } },
    },
    select: {
      observedAt: true,
      drop: { select: { well: { select: { plateId: true } } } },
    },
  });
  const latest = new Map<string, Date>();
  for (const { observedAt, drop } of observations) {
    const current = latest.get(drop.well.plateId);
    if (!current || observedAt > current) {
      latest.set(drop.well.plateId, observedAt);
    }
  }
  return latest;
}

// 送る前に「この日の分は送った」と記録する。同時に二度呼ばれても、記録できた方だけが送る
async function claim<T extends DuePlate>(plates: T[]): Promise<T[]> {
  const claimed = await Promise.all(
    plates.map(async (plate) => {
      const { count } = await prisma.plate.updateMany({
        where: {
          id: plate.id,
          OR: [
            { reminderSentFor: null },
            { reminderSentFor: { not: plate.dueDate } },
          ],
        },
        data: { reminderSentFor: plate.dueDate },
      });
      return count === 1 ? plate : null;
    })
  );
  return claimed.filter((plate): plate is Awaited<T> => plate !== null);
}

async function release(plates: DuePlate[]) {
  await Promise.all(
    plates.map((plate) =>
      prisma.plate.updateMany({
        where: { id: plate.id, reminderSentFor: plate.dueDate },
        data: { reminderSentFor: plate.reminderSentFor },
      })
    )
  );
}
