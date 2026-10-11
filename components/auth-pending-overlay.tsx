"use client";

import { Loader2 } from "lucide-react";

interface AuthPendingOverlayProps {
  message: string;
}

// ログインの通信中に画面全体を覆い、いま何をしているかを伝える
export function AuthPendingOverlay({ message }: AuthPendingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg-primary/90 backdrop-blur-sm"
    >
      <Loader2 className="size-8 animate-spin text-text-primary" />
      <p className="text-[14px] text-text-secondary">{message}</p>
    </div>
  );
}
