"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

interface ListRowProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick?: () => void;
}

export function ListRow({ icon: Icon, title, description, onClick }: ListRowProps) {
  const content = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface">
        <Icon className="size-5 text-text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-text-primary">{title}</div>
        {description && (
          <div className="text-[13px] text-text-secondary">{description}</div>
        )}
      </div>
      {onClick && (
        <ChevronRight className="size-5 shrink-0 text-text-tertiary" />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center gap-3 border-b border-border-subtle py-3 text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 border-b border-border-subtle py-3">
      {content}
    </div>
  );
}
