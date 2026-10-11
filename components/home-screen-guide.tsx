"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/locale-provider";
import {
  detectHomeScreenGuide,
  getHomeScreenGuide,
  HOME_SCREEN_GUIDE_IDS,
  type HomeScreenGuideId,
} from "@/lib/home-screen-guide";

// 端末の情報は開いているあいだ変わらないので、知らせる仕組みは要らない
const subscribeNothing = () => () => {};

// この端末に合う案内。パソコンなら null。サーバーで描くときも null
export function useDetectedHomeScreenGuide(): HomeScreenGuideId | null {
  return useSyncExternalStore(
    subscribeNothing,
    () => detectHomeScreenGuide(navigator.userAgent, navigator.maxTouchPoints),
    () => null
  );
}

// ホーム画面から開いているか。開いていれば案内は要らない
export function useIsStandalone(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      // iPhone の Safari は display-mode を返さないことがあるので、こちらも見る
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false
  );
}

// 「ホーム画面に追加」の手順。端末に合う案内を先に出し、ほかの端末の案内にも切り替えられる
export function HomeScreenGuideSteps() {
  const { locale } = useTranslation();
  const detected = useDetectedHomeScreenGuide();
  const [chosen, setChosen] = useState<HomeScreenGuideId | null>(null);
  const current = chosen ?? detected ?? "safari";
  const guide = getHomeScreenGuide(locale, current);

  return (
    <div>
      <div role="group" className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {HOME_SCREEN_GUIDE_IDS.map((id) => (
          <button
            type="button"
            key={id}
            onClick={() => setChosen(id)}
            aria-pressed={current === id}
            className={cn(
              "shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
              current === id
                ? "bg-text-primary text-bg-primary"
                : "border border-border-default bg-bg-primary text-text-primary"
            )}
          >
            {getHomeScreenGuide(locale, id).label}
          </button>
        ))}
      </div>

      <ol className="mt-4 flex flex-col gap-5">
        {guide.steps.map((step, i) => (
          <li key={step.text} className="flex flex-col gap-2">
            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-text-primary text-[12px] font-bold text-bg-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[14px] leading-relaxed text-text-primary">
                {step.text}
              </span>
            </div>
            {step.image && (
              <Image
                src={step.image.src}
                width={step.image.width}
                height={step.image.height}
                sizes="(max-width: 402px) 90vw, 330px"
                alt=""
                className="ml-9 h-auto w-[calc(100%-2.25rem)] rounded-lg border border-border-default"
              />
            )}
          </li>
        ))}
      </ol>

      {guide.notes && (
        <ul className="mt-4 flex flex-col gap-2">
          {guide.notes.map((note) => (
            <li
              key={note}
              className="text-[13px] leading-relaxed text-text-secondary"
            >
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
