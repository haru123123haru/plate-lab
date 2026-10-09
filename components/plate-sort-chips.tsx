"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/locale-provider";
import type { TranslationKey } from "@/lib/i18n";
import { isPlateSort, PLATE_SORTS, type PlateSort } from "@/lib/plate-sort";

// ホームとサンプル画面で同じ並べ方を使う。覚えるのはこのブラウザだけ
const STORAGE_KEY = "plate-sort";

const LABELS: Record<PlateSort, TranslationKey> = {
  updated: "sortUpdated",
  setupNewest: "sortSetupNewest",
  setupOldest: "sortSetupOldest",
};

// このページを開いてから選んだ並べ方。覚えられないとき（プライベートブラウズや容量切れ）も、
// 覚えてある古い値より、こちらを使う
let chosenSort: PlateSort | null = null;
const listeners = new Set<() => void>();

function readSort(): PlateSort {
  if (chosenSort) return chosenSort;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isPlateSort(saved)) return saved;
  } catch {
    // 読めないときは既定の並べ方
  }
  return PLATE_SORTS[0];
}

// 別のタブで選び直したときも、その値に合わせる
function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  chosenSort = isPlateSort(event.newValue) ? event.newValue : null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function changeSort(next: PlateSort) {
  chosenSort = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 覚えられなくても、この画面では並べ替える
  }
  listeners.forEach((listener) => listener());
}

// 選んだ並べ方。サーバーで描くときは既定の並べ方にし、ブラウザで覚えた値に切り替える
export function usePlateSort() {
  const sort = useSyncExternalStore(subscribe, readSort, () => PLATE_SORTS[0]);
  return [sort, changeSort] as const;
}

interface PlateSortChipsProps {
  value: PlateSort;
  onChange: (sort: PlateSort) => void;
}

export function PlateSortChips({ value, onChange }: PlateSortChipsProps) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("sortPlates")}
      className="-mx-6 flex gap-2 overflow-x-auto px-6"
    >
      {PLATE_SORTS.map((sort) => (
        <button
          type="button"
          key={sort}
          onClick={() => onChange(sort)}
          aria-pressed={value === sort}
          className={cn(
            "shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
            value === sort
              ? "bg-text-primary text-bg-primary"
              : "border border-border-default bg-bg-primary text-text-primary"
          )}
        >
          {t(LABELS[sort])}
        </button>
      ))}
    </div>
  );
}
