"use client";

import { Plus } from "lucide-react";

interface FabButtonProps {
  onClick: () => void;
}

export function FabButton({ onClick }: FabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-6 bottom-24 z-50 flex size-14 cursor-pointer items-center justify-center rounded-full bg-text-primary shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
    >
      <Plus className="size-6 text-bg-surface" />
    </button>
  );
}
