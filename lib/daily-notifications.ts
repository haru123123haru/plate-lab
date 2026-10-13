import { prisma } from "@/lib/prisma";
import { toLocale } from "@/lib/i18n";
import { sendPush } from "@/lib/push";
import {
  CATCH_UP_DAYS,
  NEGLECT_DAYS,
  addDays,
  buildDailyPayload,
  selectNeglectedPlates,
  selectReminderPlates,
  tokyoToday,
} from "@/lib/notifications";
import { MAX_REMINDER_DAYS } from "@/lib/validations";

// 送ったことを記録する列。リマインドと放置で分ける
type SentField = "reminderSentFor" | "neglectSentFor";

// 送ると決めたプレート。dueDate は知らせる日
interface DuePlate {
  id: string;
  reminderSentFor: Date | null;
  neglectSentFor: Date | null;
  dueDate: Date;
}

// 毎朝の通知。app/api/cron/notifications/route.ts から1日1回呼ぶ。
// 通知を受ける端末を持つ人ごとに、今日知らせるプレートをまとめて1通送る
export async function sendDailyNotifications(now: Date = new Date()) {
  const today = tokyoToday(now);
  // 遅れて送る分も含めて、リマインドの日になりうる仕込み日の範囲
  const earliestSetup = addDays(today, -(MAX_REMINDER_DAYS + CATCH_UP_DAYS));
  // これより後に仕込んだプレートは、まだ放っておいたことにならない
  const latestNeglectSetup = addDays(today, -NEGLECT_DAYS);

  const users = await prisma.user.findMany({
    where: {
      pushSubscriptions: { some: {} },
      // 設定の行が無い人は既定（オン）として扱う
      OR: [
        { settings: null },
        { settings: { notifReminder: true } },
        { settings: { notifNeglect: true } },
      ],
    },
    select: {
      id: true,
      settings: {
        select: { language: true, notifReminder: true, notifNeglect: true },
      },
      pushSubscriptions: {
        select: { id: true, endpoint: true, p256dh: true, auth: true },
      },
      plates: {
        where: {
          deletedAt: null,
          OR: [
            {
              reminderDays: { not: null },
              setupDate: { gte: earliestSetup, lt: today },
            },
            { setupDate: { lte: latestNeglectSetup } },
          ],
        },
        orderBy: { setupDate: "asc" },
        select: {
          id: true,
          name: true,
          setupDate: true,
          reminderDays: true,
          reminderSentFor: true,
          neglectSentFor: true,
          notesUpdatedAt: true,
        },
      },
    },
  });

  // 放置の知らせる日は、最後に観察した日から NEGLECT_DAYS 日目。
  // 遅れて送る分も含め、それより前の観察は判定に要らない
  const lastObserved = await lastObservedDates(
    users.flatMap((user) => user.plates.map((plate) => plate.id)),
    addDays(today, -(NEGLECT_DAYS + CATCH_UP_DAYS))
  );

  const results = await Promise.all(
    users.map(async (user) => {
      const plates = user.plates.map((plate) => ({
        ...plate,
        lastObservedAt: later(lastObserved.get(plate.id), plate.notesUpdatedAt),
      }));
      const reminders =
        (user.settings?.notifReminder ?? true)
          ? selectReminderPlates(plates, today)
          : [];
      const neglected =
        (user.settings?.notifNeglect ?? true)
          ? selectNeglectedPlates(plates, today)
          : [];
      const [claimedReminders, claimedNeglected] = await Promise.all([
        claim(reminders, "reminderSentFor"),
        claim(neglected, "neglectSentFor"),
      ]);
      const payload = buildDailyPayload(
        claimedReminders,
        claimedNeglected,
        toLocale(user.settings?.language)
      );
      if (!payload) return 0;

      const delivered = await sendPush(user.pushSubscriptions, payload);
      // 1通も届かなければ、翌日にまた送れるよう記録を戻す
      if (delivered === 0) {
        await Promise.all([
          release(claimedReminders, "reminderSentFor"),
          release(claimedNeglected, "neglectSentFor"),
        ]);
      }
      return delivered;
    })
  );

  return {
    notifiedUsers: results.filter((delivered) => delivered > 0).length,
    deliveries: results.reduce((sum, delivered) => sum + delivered, 0),
  };
}

function later(a: Date | null | undefined, b: Date | null) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
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

function sentFor(field: SentField, value: Date | null) {
  return field === "reminderSentFor"
    ? { reminderSentFor: value }
    : { neglectSentFor: value };
}

// 送る前に「この日の分は送った」と記録する。同時に二度呼ばれても、記録できた方だけが送る
async function claim<T extends DuePlate>(
  plates: T[],
  field: SentField
): Promise<T[]> {
  const claimed = await Promise.all(
    plates.map(async (plate) => {
      const { count } = await prisma.plate.updateMany({
        where: {
          id: plate.id,
          // NOT だけでは NULL の行が外れるので、NULL も並べる
          OR: [sentFor(field, null), { NOT: sentFor(field, plate.dueDate) }],
        },
        data: sentFor(field, plate.dueDate),
      });
      return count === 1 ? plate : null;
    })
  );
  return claimed.filter((plate): plate is Awaited<T> => plate !== null);
}

async function release(plates: DuePlate[], field: SentField) {
  await Promise.all(
    plates.map((plate) =>
      prisma.plate.updateMany({
        where: { id: plate.id, ...sentFor(field, plate.dueDate) },
        data: sentFor(field, plate[field]),
      })
    )
  );
}
