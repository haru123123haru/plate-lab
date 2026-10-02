import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 利用者の端末の今日を "YYYY-MM-DD" で返す（sv-SE はこの形式で日付を出す）
export function today() {
  return new Date().toLocaleDateString("sv-SE");
}

// 記録の時刻（タイムスタンプ）を日本時間の "YYYY-MM-DD" にする。
// サーバーは UTC で動くので、toISOString で切ると日本時間の0〜9時が前日になる
export function toTokyoDate(date: Date) {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}
