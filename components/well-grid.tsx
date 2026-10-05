"use client";

import { cn } from "@/lib/utils";
import { CRYSTAL_MARKS, MarkDot, WellShape } from "@/components/well-shape";
import { useTranslation } from "@/components/locale-provider";
import type { CrystalMark, PlateLayout, WellData } from "@/types";

interface WellGridProps {
  rows: number;
  cols: number;
  layout: PlateLayout;
  maxDrops: number;
  wells: WellData[];
  onWellClick?: (well: WellData) => void;
}

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

// 置き場所の番号 → そのドロップのいちばん良い目印
function marksOf(well: WellData | undefined) {
  const marks = new Map<number, CrystalMark>();
  for (const drop of well?.drops ?? []) {
    if (drop.bestMark) marks.set(drop.slot, drop.bestMark);
  }
  return marks;
}

export function WellGrid({
  rows,
  cols,
  layout,
  maxDrops,
  wells,
  onWellClick,
}: WellGridProps) {
  const { t } = useTranslation();
  const wellMap = new Map<string, WellData>();
  for (const well of wells) {
    wellMap.set(`${well.row}-${well.col}`, well);
  }
  // 1ドロップは今までどおり詰めて並べ、複数ドロップは中が見えるよう間を空ける
  const gap = maxDrops > 1 ? "gap-2" : "gap-[3px]";
  // 凡例は、プレートに出ている目印だけを出す
  const usedMarks = new Set(
    wells.flatMap((well) => well.drops.map((drop) => drop.bestMark))
  );

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
              const marks = marksOf(well);
              // 目印は読み上げにも足す（例: 「Well A1, 結晶あり」）
              const markNames = [...new Set(marks.values())]
                .sort(
                  (a, b) => CRYSTAL_MARKS.indexOf(b) - CRYSTAL_MARKS.indexOf(a)
                )
                .map((mark) => t(`mark${mark}`));

              return (
                <button
                  type="button"
                  key={colIdx}
                  aria-label={[`Well ${label}${colIdx + 1}`, ...markNames].join(
                    ", "
                  )}
                  onClick={() => well && onWellClick?.(well)}
                  className="flex-1 cursor-pointer"
                >
                  <WellShape
                    layout={layout}
                    maxDrops={maxDrops}
                    filledSlots={filledSlots}
                    marks={marks}
                  />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {CRYSTAL_MARKS.some((mark) => usedMarks.has(mark)) && (
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-text-secondary">
          {CRYSTAL_MARKS.filter((mark) => usedMarks.has(mark)).map((mark) => (
            <div key={mark} className="flex items-center gap-1.5">
              <MarkDot mark={mark} />
              {t(`mark${mark}`)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
