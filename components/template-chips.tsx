"use client";

import { cn } from "@/lib/utils";

interface TemplateChipsProps {
  label: string;
  templates: { id: number; name: string }[];
  value: number | null;
  onChange: (id: number) => void;
}

// リザーバー・スクリーニングのテンプレートを1つ選ぶチップの並び
export function TemplateChips({
  label,
  templates,
  value,
  onChange,
}: TemplateChipsProps) {
  return (
    <div className="space-y-1.5">
      <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-text-tertiary">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {templates.map((ct) => (
          <button
            type="button"
            key={ct.id}
            onClick={() => onChange(ct.id)}
            aria-pressed={value === ct.id}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              value === ct.id
                ? "bg-text-primary text-white"
                : "border border-border-default bg-bg-primary text-text-primary"
            )}
          >
            {ct.name}
          </button>
        ))}
      </div>
    </div>
  );
}
