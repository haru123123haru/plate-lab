"use client";

import { useState, useSyncExternalStore } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslation } from "@/components/locale-provider";
import {
  HomeScreenGuideSteps,
  useDetectedHomeScreenGuide,
  useIsStandalone,
} from "@/components/home-screen-guide";

// 閉じたことを覚えるのはこのブラウザだけ。ほかの端末やブラウザでは、また出る
const STORAGE_KEY = "home-screen-card-dismissed";

// 覚えられないとき（プライベートブラウズなど）も、この画面では閉じたままにする
let dismissedHere = false;
const listeners = new Set<() => void>();

function readDismissed(): boolean {
  if (dismissedHere) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function dismiss() {
  dismissedHere = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // 覚えられなくても、この画面では閉じる
  }
  listeners.forEach((listener) => listener());
}

// スマホのブラウザで開いている人に、ホーム画面への追加を勧めるカード。
// ホーム画面から開いているとき、パソコン、一度閉じたあとは出さない
export function HomeScreenCard() {
  const { t } = useTranslation();
  const guide = useDetectedHomeScreenGuide();
  const standalone = useIsStandalone();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  const [open, setOpen] = useState(false);

  if (!guide || standalone || dismissed) return null;

  return (
    <>
      <div className="flex gap-3 rounded-xl bg-bg-surface p-4">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-text-primary" />
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-text-primary">
            {t("homeScreenCardTitle")}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            {t("homeScreenCardBody")}
          </p>
          <Button
            size="sm"
            className="mt-3 rounded-lg"
            onClick={() => setOpen(true)}
          >
            {t("homeScreenCardAction")}
          </Button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("close")}
          className="-mt-1 -mr-1 size-8 shrink-0 cursor-pointer self-start rounded-full p-1.5 text-text-secondary"
        >
          <X className="size-5" />
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[90dvh] rounded-t-2xl bg-bg-primary p-0"
        >
          <div className="flex h-full flex-col overflow-y-auto px-6 pt-6 pb-10">
            <div className="flex items-start justify-between pb-4">
              <SheetTitle className="text-[22px] font-extrabold tracking-tight text-text-primary">
                {t("homeScreenGuideTitle")}
              </SheetTitle>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-secondary"
                >
                  <X className="size-5" />
                  {t("close")}
                </Button>
              </SheetClose>
            </div>
            <HomeScreenGuideSteps />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
