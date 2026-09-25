"use client";

import { cn } from "@/lib/utils";
import type { PlateLayout } from "@/types";

// 置き場所の中心（x, y）と直径（d）を、ウェルの正方形に対する % で持つ
type SlotPosition = { x: number; y: number; d: number };

type ShapeSpec = {
  slots: SlotPosition[];
  // SITTING の複数ドロップ: 置き場所の下にリザーバーの細長い溝
  reservoir?: boolean;
  // HANGING の複数ドロップ: 大きい丸（カバーガラスの下のウェル）の中にドロップ
  outerCircle?: boolean;
  // 丸の上に出す短い縦線。ウェルの向き（1番の置き場所の側）を示す
  orientationMark?: boolean;
};

const SINGLE: ShapeSpec = { slots: [{ x: 50, y: 50, d: 100 }] };

const SHAPES: Record<string, ShapeSpec> = {
  // 上に2つ、下に2つを右へ少しずらして置く
  "SITTING-4": {
    slots: [
      { x: 30, y: 18, d: 26 },
      { x: 62, y: 18, d: 26 },
      { x: 38, y: 48, d: 26 },
      { x: 70, y: 48, d: 26 },
    ],
    reservoir: true,
  },
  // 上に1つ（1番）、下に左右2つ（2番・3番）の三角形に置く
  "HANGING-3": {
    slots: [
      { x: 50, y: 29, d: 27 },
      { x: 28, y: 62, d: 27 },
      { x: 72, y: 62, d: 27 },
    ],
    outerCircle: true,
    orientationMark: true,
  },
};

// validations の createPlateTypeSchema が許す組み合わせだけが来る。それ以外は1ドロップで描く
function shapeOf(layout: PlateLayout, maxDrops: number) {
  return SHAPES[`${layout}-${maxDrops}`] ?? SINGLE;
}

interface WellShapeProps {
  layout: PlateLayout;
  maxDrops: number;
  filledSlots: ReadonlySet<number>;
  // 渡したときだけ置き場所を押せるボタンにする（ウェルのシート・作成画面用）
  onSlotClick?: (slot: number) => void;
  // 1つを選ぶ使い方（シート）で渡す。渡さなければ、塗った置き場所を「選択中」とする
  selectedSlot?: number;
  slotLabel?: (slot: number) => string;
  className?: string;
}

export function WellShape({
  layout,
  maxDrops,
  filledSlots,
  onSlotClick,
  selectedSlot,
  slotLabel,
  className,
}: WellShapeProps) {
  const shape = shapeOf(layout, maxDrops);

  return (
    <div className={cn("relative aspect-square", className)}>
      {shape.outerCircle && (
        <div className="absolute inset-0 rounded-full border border-border-default" />
      )}
      {shape.orientationMark && (
        <div className="absolute left-1/2 top-[-4%] h-[16%] w-px -translate-x-1/2 bg-text-tertiary" />
      )}
      {shape.reservoir && (
        <div className="absolute inset-x-[10%] top-[72%] h-[18%] rounded-full border border-border-default" />
      )}
      {shape.slots.map((pos, i) => {
        const slot = i + 1;
        const style = {
          left: `${pos.x - pos.d / 2}%`,
          top: `${pos.y - pos.d / 2}%`,
          width: `${pos.d}%`,
          height: `${pos.d}%`,
        };
        const slotClassName = cn(
          "absolute rounded-full",
          filledSlots.has(slot) ? "bg-text-primary" : "bg-border-default"
        );

        if (!onSlotClick) {
          return <span key={slot} className={slotClassName} style={style} />;
        }
        return (
          <button
            type="button"
            key={slot}
            aria-label={slotLabel?.(slot)}
            aria-pressed={
              selectedSlot === undefined
                ? filledSlots.has(slot)
                : selectedSlot === slot
            }
            onClick={() => onSlotClick(slot)}
            className={cn(
              slotClassName,
              "flex cursor-pointer items-center justify-center text-[13px] font-semibold",
              filledSlots.has(slot) ? "text-bg-surface" : "text-text-secondary",
              selectedSlot === slot &&
                "ring-2 ring-border-strong ring-offset-2 ring-offset-bg-surface"
            )}
            style={style}
          >
            {maxDrops > 1 && slot}
          </button>
        );
      })}
    </div>
  );
}
