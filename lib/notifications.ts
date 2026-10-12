import { t, type Locale } from "@/lib/i18n";
import type { PushPayload } from "@/lib/push";

// 毎朝の通知（lib/daily-notifications.ts）で、知らせるプレートを選び、文面を作る。
// DB には触らない

const DAY_MS = 24 * 60 * 60 * 1000;

// 日本時間での今日。日付だけの列（setupDate・observedAt）と比べられるよう、UTC の0時で返す
export function tokyoToday(now: Date): Date {
  const tokyo = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(tokyo.getUTCFullYear(), tokyo.getUTCMonth(), tokyo.getUTCDate())
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// 仕込み日から today まで何日経ったか。どちらも UTC の0時の日付
export function daysSince(setupDate: Date, today: Date): number {
  return Math.round((today.getTime() - setupDate.getTime()) / DAY_MS);
}

// Cron が動かなかった日があっても、リマインドの日からこの日数のうちは遅れて送る。
// それより古い分は送らない（今あるプレートに、昔の分がまとめて届かないように）
export const REMINDER_CATCH_UP_DAYS = 3;

export interface ReminderCandidate {
  id: string;
  name: string;
  setupDate: Date;
  reminderDays: number | null;
  // 送り済みのリマインドの日
  reminderSentFor: Date | null;
  // 最後に観察した日
  lastObservedAt: Date | null;
}

// 今日知らせるプレートと、そのリマインドの日。
// リマインドの日から REMINDER_CATCH_UP_DAYS 日のうちで、まだ送っておらず、
// リマインドの日より後に観察していないもの
export function selectReminderPlates<T extends ReminderCandidate>(
  plates: T[],
  today: Date
): (T & { dueDate: Date })[] {
  return plates.flatMap((plate) => {
    if (plate.reminderDays === null) return [];
    const dueDate = addDays(plate.setupDate, plate.reminderDays);
    const late = daysSince(dueDate, today);
    if (late < 0 || late > REMINDER_CATCH_UP_DAYS) return [];
    if (plate.reminderSentFor?.getTime() === dueDate.getTime()) return [];
    if (plate.lastObservedAt && plate.lastObservedAt >= dueDate) return [];
    return [{ ...plate, dueDate }];
  });
}

// Web Push の中身は 4KB ほどまでなので、名前は数と長さを絞る
const MAX_NAMES = 3;
const MAX_NAME_LENGTH = 40;

function shorten(name: string) {
  return name.length > MAX_NAME_LENGTH
    ? `${name.slice(0, MAX_NAME_LENGTH - 1)}…`
    : name;
}

// 1人に1通。1枚ならそのプレートを、複数ならホームを開く。
// 名前に "$&" や "{days}" があっても崩れないよう、置き換えは関数で渡す
export function buildReminderPayload(
  plates: { id: string; name: string; reminderDays: number | null }[],
  locale: Locale
): PushPayload | null {
  if (plates.length === 0) return null;
  const title = t(locale, "reminderTitle");

  if (plates.length === 1) {
    const [plate] = plates;
    return {
      title,
      body: t(locale, "reminderBodyOne").replace(
        /\{(name|days)\}/g,
        (_, key) =>
          key === "name" ? shorten(plate.name) : String(plate.reminderDays)
      ),
      url: `/plates/${plate.id}`,
    };
  }

  const separator = locale === "ja" ? "、" : ", ";
  const names = plates.slice(0, MAX_NAMES).map((plate) => shorten(plate.name));
  const rest = plates.length - names.length;
  const listed =
    names.join(separator) +
    (rest > 0
      ? t(locale, "reminderMore").replace("{count}", String(rest))
      : "");
  return {
    title,
    body: t(locale, "reminderBodyMany").replace(
      /\{(count|names)\}/g,
      (_, key) => (key === "count" ? String(plates.length) : listed)
    ),
    url: "/",
  };
}
