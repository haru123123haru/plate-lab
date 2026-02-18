"use client";

import { Search, SlidersHorizontal } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilter?: () => void;
}

export function SearchBar({ value, onChange, placeholder, onFilter }: SearchBarProps) {
  return (
    <div className="flex h-12 items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-4">
      <Search className="size-5 shrink-0 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary outline-none"
      />
      {onFilter && (
        <button type="button" onClick={onFilter} className="shrink-0 cursor-pointer">
          <SlidersHorizontal className="size-5 text-text-secondary" />
        </button>
      )}
    </div>
  );
}
