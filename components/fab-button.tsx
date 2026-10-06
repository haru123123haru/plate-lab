"use client";

import { Plus } from "lucide-react";

interface FabButtonProps {
  onClick: () => void;
}

// スクロールしても画面の右下に留める。画面幅は app/layout.tsx の列（最大 402px）に合わせ、
// 広い画面でも列の右下に出す。外枠はタップを下のカードへ通す。
// ページの最後に置き、最後のカードをボタンより上までスクロールできるよう余白も持つ
export function FabButton({ onClick }: FabButtonProps) {
  return (
    <>
      <div aria-hidden className="h-40" />
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-[402px] justify-end px-6">
        <button
          type="button"
          onClick={onClick}
          className="pointer-events-auto flex size-14 cursor-pointer items-center justify-center rounded-full bg-text-primary shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        >
          <Plus className="size-6 text-bg-surface" />
        </button>
      </div>
    </>
  );
}
