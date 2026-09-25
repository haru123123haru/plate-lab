import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 利用者の端末の今日を "YYYY-MM-DD" で返す（sv-SE はこの形式で日付を出す）
export function today() {
  return new Date().toLocaleDateString("sv-SE");
}
