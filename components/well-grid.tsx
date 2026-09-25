"use client";

import { cn } from "@/lib/utils";
import { WellShape } from "@/components/well-shape";
import type { PlateLayout, WellData } from "@/types";

interface WellGridProps {
  rows: number;
  cols: number;
  layout: PlateLayout;
  maxDrops: number;
  wells: WellData[];
  onWellClick?: (well: WellData) => void;
}

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function WellGrid({
  rows,
  cols,
  layout,
  maxDrops,
  wells,
  onWellClick,
}: WellGridProps) {
  const wellMap = new Map<string, WellData>();
  for (const well of wells) {
    wellMap.set(`${well.row}-${well.col}`, well);
  }
  // 1ドロップは今までどおり詰めて並べ、複数ドロップは中が見えるよう間を空ける
  const gap = maxDrops > 1 ? "gap-2" : "gap-[3px]";

  return (
    <div className="p-4">
      {/* Column headers */}
      <div className={cn("flex", gap)}>
        {/* 行ラベルと同じ幅。gap も行と同じだけ入るので列がそろう */}
        <div className="w-4 shrink-0" />
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
      <div
        className={cn("mt-1 flex flex-col", maxDrops > 1 ? "gap-2" : "gap-1.5")}
      >
        {ROW_LABELS.slice(0, rows).map((label, rowIdx) => (
          <div key={label} className={cn("flex items-center", gap)}>
            <div className="w-4 shrink-0 text-[10px] text-text-secondary">
              {label}
            </div>
            {Array.from({ length: cols }, (_, colIdx) => {
              const well = wellMap.get(`${rowIdx}-${colIdx}`);
              const filledSlots = new Set(well?.drops.map((d) => d.slot));

              return (
                <button
                  type="button"
                  key={colIdx}
                  aria-label={`Well ${label}${colIdx + 1}`}
                  onClick={() => well && onWellClick?.(well)}
                  className="flex-1 cursor-pointer"
                >
                  <WellShape
                    layout={layout}
                    maxDrops={maxDrops}
                    filledSlots={filledSlots}
                  />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
