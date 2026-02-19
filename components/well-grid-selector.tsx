"use client";

import { cn } from "@/lib/utils";

interface WellGridSelectorProps {
  rows: number;
  cols: number;
  filledPositions: Set<string>;
  onToggle: (key: string) => void;
}

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function WellGridSelector({
  rows,
  cols,
  filledPositions,
  onToggle,
}: WellGridSelectorProps) {
  return (
    <div className="p-4">
      {/* Column headers */}
      <div className="flex gap-[3px] pl-4">
        {Array.from({ length: cols }, (_, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[8px] text-text-secondary"
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="mt-1 flex flex-col gap-1.5">
        {Array.from({ length: rows }, (_, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-[3px]">
            <div className="w-4 shrink-0 text-[10px] text-text-secondary">
              {ROW_LABELS[rowIdx]}
            </div>
            {Array.from({ length: cols }, (_, colIdx) => {
              const key = `${rowIdx}-${colIdx}`;
              const isFilled = filledPositions.has(key);

              return (
                <button
                  type="button"
                  key={colIdx}
                  aria-label={`Well ${ROW_LABELS[rowIdx]}${colIdx + 1}`}
                  onClick={() => onToggle(key)}
                  className={cn(
                    "flex-1 aspect-square rounded-full cursor-pointer transition-colors",
                    isFilled ? "bg-text-primary" : "bg-border-default"
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
