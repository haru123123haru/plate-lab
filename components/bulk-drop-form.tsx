"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WellGridSelector } from "@/components/well-grid-selector";
import { useTranslation } from "@/components/locale-provider";
import { bulkCreateDrops } from "@/lib/actions/drops";
import { cn } from "@/lib/utils";

// 同じサンプルを、選んだウェルの選んだ置き場所へまとめて入れる内容
export type DropBatch = {
  // WellGridSelector の形式（"行-列"、0始まり）
  positions: Set<string>;
  slots: Set<number>;
  sampleName: string;
  concentration: string;
};

export function emptyDropBatch(): DropBatch {
  return {
    positions: new Set(),
    slots: new Set([1]),
    sampleName: "",
    concentration: "",
  };
}

const ROW_LABELS = "ABCDEFGH";

// サーバーへ送る形にする。ウェルを選んでいなければ undefined
export function toDropBatchInput(batch: DropBatch) {
  if (batch.positions.size === 0) return undefined;
  return {
    // サーバーは DB の Well.position と同じ "A1" 形式で受ける
    positions: [...batch.positions].map((key) => {
      const [row, col] = key.split("-").map(Number);
      return `${ROW_LABELS[row]}${col + 1}`;
    }),
    slots: [...batch.slots].sort((a, b) => a - b),
    sampleName: batch.sampleName.trim(),
    concentration: batch.concentration.trim(),
  };
}

// ウェルを選んだなら、置き場所・サンプル名・濃度がそろっていること
export function isDropBatchComplete(batch: DropBatch) {
  return (
    batch.positions.size === 0 ||
    (batch.slots.size > 0 &&
      batch.sampleName.trim() !== "" &&
      batch.concentration.trim() !== "")
  );
}

const labelClassName =
  "text-[11px] uppercase tracking-[2px] text-text-secondary font-medium";

interface BulkDropFieldsProps {
  rows: number;
  cols: number;
  maxDrops: number;
  value: DropBatch;
  onChange: (value: DropBatch) => void;
}

export function BulkDropFields({
  rows,
  cols,
  maxDrops,
  value,
  onChange,
}: BulkDropFieldsProps) {
  const { t } = useTranslation();
  const fieldId = useId();

  const toggle = <T,>(set: Set<T>, item: T) => {
    const next = new Set(set);
    if (!next.delete(item)) next.add(item);
    return next;
  };

  const selectAll = () => {
    const all = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) all.add(`${r}-${c}`);
    }
    onChange({ ...value, positions: all });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className={labelClassName}>{t("wellMap")}</div>
        <div className="rounded-xl bg-bg-surface">
          <WellGridSelector
            rows={rows}
            cols={cols}
            filledPositions={value.positions}
            onToggle={(key) =>
              onChange({ ...value, positions: toggle(value.positions, key) })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-text-secondary">
            {value.positions.size} / {rows * cols} {t("wellsSelected")}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="cursor-pointer text-[13px] font-medium text-text-primary underline underline-offset-2"
            >
              {t("selectAll")}
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, positions: new Set() })}
              className="cursor-pointer text-[13px] font-medium text-text-secondary underline underline-offset-2"
            >
              {t("clear")}
            </button>
          </div>
        </div>
      </div>

      {/* 1ドロップの種別では置き場所は1番しか無いので出さない */}
      {maxDrops > 1 && (
        <div className="space-y-2">
          <div id={`${fieldId}-slots`} className={labelClassName}>
            {t("slot")}
          </div>
          <div
            role="group"
            aria-labelledby={`${fieldId}-slots`}
            className="flex gap-2"
          >
            {Array.from({ length: maxDrops }, (_, i) => i + 1).map((slot) => (
              <button
                type="button"
                key={slot}
                aria-pressed={value.slots.has(slot)}
                onClick={() =>
                  onChange({ ...value, slots: toggle(value.slots, slot) })
                }
                className={cn(
                  "size-10 cursor-pointer rounded-full text-[14px] font-semibold",
                  value.slots.has(slot)
                    ? "bg-text-primary text-white"
                    : "bg-bg-surface text-text-primary"
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor={`${fieldId}-sample`} className={labelClassName}>
          {t("sampleNameLabel")}
        </label>
        <Input
          id={`${fieldId}-sample`}
          value={value.sampleName}
          onChange={(e) => onChange({ ...value, sampleName: e.target.value })}
          placeholder="e.g. Lysozyme"
          className="h-12 rounded-xl border-border-default bg-bg-surface text-[15px]"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${fieldId}-concentration`} className={labelClassName}>
          {t("concentration")}
        </label>
        <Input
          id={`${fieldId}-concentration`}
          value={value.concentration}
          onChange={(e) =>
            onChange({ ...value, concentration: e.target.value })
          }
          placeholder="e.g. 10 mg/mL"
          className="h-12 rounded-xl border-border-default bg-bg-surface text-[15px]"
        />
      </div>
      {/* 送信ボタンが押せない理由を出す */}
      {!isDropBatchComplete(value) && (
        <p className="text-[13px] text-accent-negative">
          {t("dropBatchIncomplete")}
        </p>
      )}
    </div>
  );
}

interface BulkAddDropsFormProps {
  plateId: string;
  rows: number;
  cols: number;
  maxDrops: number;
}

// 詳細画面の編集モードに置く「まとめて追加」。既存のドロップは上書きしない
export function BulkAddDropsForm({
  plateId,
  rows,
  cols,
  maxDrops,
}: BulkAddDropsFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [batch, setBatch] = useState(emptyDropBatch);
  const [pending, setPending] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const busy = pending || isRefreshing;
  const input = toDropBatchInput(batch);
  const canSubmit = !busy && input !== undefined && isDropBatchComplete(batch);

  const handleSubmit = async () => {
    if (!canSubmit || !input) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const result = await bulkCreateDrops({ plateId, ...input });
      if ("error" in result) {
        setError(t("actionFailed"));
        return;
      }
      setMessage(
        `${t("dropsAdded")}: ${result.created} / ${t("dropsSkipped")}: ${result.skipped}`
      );
      startTransition(() => {
        // サンプル名と濃度は、続けて別のウェルに入れるときのために残す
        setBatch((prev) => ({ ...prev, positions: new Set() }));
        router.refresh();
      });
    } catch {
      setError(t("actionFailed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-[15px] font-semibold text-text-primary">
        {t("bulkAddDrops")}
      </div>
      <BulkDropFields
        rows={rows}
        cols={cols}
        maxDrops={maxDrops}
        value={batch}
        onChange={setBatch}
      />
      {error && (
        <div className="rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
          {error}
        </div>
      )}
      {message && (
        <p role="status" className="text-[13px] text-text-secondary">
          {message}
        </p>
      )}
      <Button
        type="button"
        className="h-11 w-full rounded-xl"
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {busy ? t("adding") : t("bulkAddDrops")}
      </Button>
    </div>
  );
}
