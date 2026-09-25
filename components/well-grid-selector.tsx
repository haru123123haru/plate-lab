"use client";

import { cn } from "@/lib/utils";
import { WellShape } from "@/components/well-shape";
import type { PlateLayout } from "@/types";

interface WellGridSelectorProps {
  rows: number;
  cols: number;
  layout: PlateLayout;
  maxDrops: number;
  // 選んだウェル（"行-列"、0始まり）
  filledPositions: Set<string>;
  // 選んだウェルで塗る置き場所
  selectedSlots: ReadonlySet<number>;
  onToggle: (key: string) => void;
}

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const NO_SLOTS: ReadonlySet<number> = new Set();

// 詳細画面の WellGrid と同じ描き方で、ウェルを複数選ぶ
export function WellGridSelector({
  rows,
  cols,
  layout,
  maxDrops,
  filledPositions,
  selectedSlots,
  onToggle,
}: WellGridSelectorProps) {
  const gap = maxDrops > 1 ? "gap-2" : "gap-[3px]";

  return (
    <div className="p-4">
      {/* Column headers */}
      <div className={cn("flex pl-4", gap)}>
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
        {Array.from({ length: rows }, (_, rowIdx) => (
          <div key={rowIdx} className={cn("flex items-center", gap)}>
            <div className="w-4 shrink-0 text-[10px] text-text-secondary">
              {ROW_LABELS[rowIdx]}
            </div>
            {Array.from({ length: cols }, (_, colIdx) => {
              const key = `${rowIdx}-${colIdx}`;
              const isSelected = filledPositions.has(key);

              return (
                <button
                  type="button"
                  key={colIdx}
                  aria-label={`Well ${ROW_LABELS[rowIdx]}${colIdx + 1}`}
                  aria-pressed={isSelected}
                  onClick={() => onToggle(key)}
                  className={cn(
                    "flex-1 cursor-pointer",
                    maxDrops > 1 ? "rounded-md" : "rounded-full",
                    // 置き場所をまだ選んでいないと塗る所が無いので、枠で選択を見せる
                    isSelected &&
                      selectedSlots.size === 0 &&
                      "ring-2 ring-border-strong"
                  )}
                >
                  <WellShape
                    layout={layout}
                    maxDrops={maxDrops}
                    filledSlots={isSelected ? selectedSlots : NO_SLOTS}
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
