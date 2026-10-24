"use client";

import { useEffect } from "react";

// アプリを開いたとき、裏から前に戻ったときに、ホーム画面のアイコンのバッジを消す。
// バッジは毎朝の通知で Service Worker（public/sw.js）が出す
export function AppBadgeClearer() {
  useEffect(() => {
    if (!("clearAppBadge" in navigator)) return;
    const clear = () => {
      if (document.visibilityState === "visible") {
        navigator.clearAppBadge().catch(() => {});
      }
    };
    clear();
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
  }, []);
  return null;
}
