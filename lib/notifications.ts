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

// Cron が動かなかった日があっても、知らせる日からこの日数のうちは遅れて送る。
// それより古い分は送らない（今あるプレートに、昔の分がまとめて届かないように）
export const CATCH_UP_DAYS = 3;

// 最後に観察した日（観察が無ければ仕込み日）からこの日数で、放っておいたと知らせる
export const NEGLECT_DAYS = 30;

export interface ReminderCandidate {
  id: string;
  name: string;
  setupDate: Date;
  reminderDays: number | null;
  // 送り済みのリマインドの日
  reminderSentFor: Date | null;
  // 最後に観察した日。メモを書き換えた日も含む
  lastObservedAt: Date | null;
}

export interface NeglectCandidate {
  id: string;
  name: string;
  setupDate: Date;
  // 送り済みの「知らせる日」
  neglectSentFor: Date | null;
  // 最後に観察した日。メモを書き換えた日も含む
  lastObservedAt: Date | null;
}

// 知らせる日から CATCH_UP_DAYS 日のうちか
function isDue(dueDate: Date, today: Date) {
  const late = daysSince(dueDate, today);
  return late >= 0 && late <= CATCH_UP_DAYS;
}

// 今日知らせるプレートと、そのリマインドの日。
// リマインドの日から CATCH_UP_DAYS 日のうちで、まだ送っておらず、
// リマインドの日より後に観察していないもの
export function selectReminderPlates<T extends ReminderCandidate>(
  plates: T[],
  today: Date
): (T & { dueDate: Date })[] {
  return plates.flatMap((plate) => {
    if (plate.reminderDays === null) return [];
    const dueDate = addDays(plate.setupDate, plate.reminderDays);
    if (!isDue(dueDate, today)) return [];
    if (plate.reminderSentFor?.getTime() === dueDate.getTime()) return [];
    if (plate.lastObservedAt && plate.lastObservedAt >= dueDate) return [];
    return [{ ...plate, dueDate }];
  });
}

// 放っておいたと今日知らせるプレートと、その知らせる日。
// 最後に観察した日（無ければ仕込み日）から NEGLECT_DAYS 日目が知らせる日。
// 知らせたあとは、次に観察して知らせる日が変わるまで送らない
export function selectNeglectedPlates<T extends NeglectCandidate>(
  plates: T[],
  today: Date
): (T & { dueDate: Date })[] {
  return plates.flatMap((plate) => {
    const lastActive =
      plate.lastObservedAt && plate.lastObservedAt > plate.setupDate
        ? plate.lastObservedAt
        : plate.setupDate;
    const dueDate = addDays(lastActive, NEGLECT_DAYS);
    if (!isDue(dueDate, today)) return [];
    if (plate.neglectSentFor?.getTime() === dueDate.getTime()) return [];
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

// 1人に1通。リマインドがあればリマインドの文面にし、放っておいたプレートも名前に並べる。
// 1枚ならそのプレートを、複数ならホームを開く。
// 名前に "$&" や "{days}" があっても崩れないよう、置き換えは関数で渡す
export function buildDailyPayload(
  reminders: { id: string; name: string; reminderDays: number | null }[],
  neglected: { id: string; name: string }[],
  locale: Locale
): PushPayload | null {
  const reminderIds = new Set(reminders.map((plate) => plate.id));
  const plates = [
    ...reminders,
    ...neglected.filter((plate) => !reminderIds.has(plate.id)),
  ];
  if (plates.length === 0) return null;
  const isReminder = reminders.length > 0;
  const title = t(locale, isReminder ? "reminderTitle" : "neglectTitle");

  if (plates.length === 1) {
    const [plate] = plates;
    const days = isReminder ? reminders[0].reminderDays : NEGLECT_DAYS;
    return {
      title,
      body: t(
        locale,
        isReminder ? "reminderBodyOne" : "neglectBodyOne"
      ).replace(/\{(name|days)\}/g, (_, key) =>
        key === "name" ? shorten(plate.name) : String(days)
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
    body: t(
      locale,
      isReminder ? "reminderBodyMany" : "neglectBodyMany"
    ).replace(/\{(count|names|days)\}/g, (_, key) =>
      key === "count"
        ? String(plates.length)
        : key === "days"
          ? String(NEGLECT_DAYS)
          : listed
    ),
    url: "/",
  };
}
