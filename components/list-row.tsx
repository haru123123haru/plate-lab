"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface ListRowProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick?: () => void;
  // 画面の移動は onClick ではなくこちらで渡す。Link が、見えた行の行き先を先読みする
  href?: string;
}

export function ListRow({
  icon: Icon,
  title,
  description,
  onClick,
  href,
}: ListRowProps) {
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
      {(onClick || href) && (
        <ChevronRight className="size-5 shrink-0 text-text-tertiary" />
      )}
    </>
  );

  const className =
    "flex w-full cursor-pointer items-center gap-3 border-b border-border-subtle py-3 text-left";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
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
