"use client";

import { cn } from "@/lib/utils";
import type { WellData } from "@/types";

interface WellGridProps {
  wells: WellData[];
  onWellClick?: (well: WellData) => void;
}

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COL_COUNT = 12;

export function WellGrid({ wells, onWellClick }: WellGridProps) {
  const wellMap = new Map<string, WellData>();
  for (const well of wells) {
    wellMap.set(`${well.row}-${well.col}`, well);
  }

  return (
    <div className="p-4">
      {/* Column headers */}
      <div className="flex gap-[3px] pl-4">
        {Array.from({ length: COL_COUNT }, (_, i) => (
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
        {ROW_LABELS.map((label, rowIdx) => (
          <div key={label} className="flex items-center gap-[3px]">
            <div className="w-4 shrink-0 text-[10px] text-text-secondary">
              {label}
            </div>
            {Array.from({ length: COL_COUNT }, (_, colIdx) => {
              const well = wellMap.get(`${rowIdx}-${colIdx}`);
              const isFilled = well && well.status !== "empty";

              return (
                <button
                  type="button"
                  key={colIdx}
                  aria-label={`Well ${ROW_LABELS[rowIdx]}${colIdx + 1}`}
                  onClick={() => well && onWellClick?.(well)}
                  className={cn(
                    "flex-1 aspect-square rounded-full cursor-pointer",
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
