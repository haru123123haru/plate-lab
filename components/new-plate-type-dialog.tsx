"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPlateType } from "@/lib/actions/plate-types";
import { cn } from "@/lib/utils";
import { plateShapeLabel } from "@/lib/wells";
import { useTranslation } from "@/components/locale-provider";
import type { PlateLayout } from "@/types";

// createPlateTypeSchema が許す描き方の組み合わせ
const SHAPE_OPTIONS: { layout: PlateLayout; maxDrops: number }[] = [
  { layout: "SITTING", maxDrops: 1 },
  { layout: "HANGING", maxDrops: 1 },
  { layout: "SITTING", maxDrops: 4 },
  { layout: "HANGING", maxDrops: 3 },
];

interface NewPlateTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function NewPlateTypeDialog({
  open,
  onOpenChange,
  onAdded,
}: NewPlateTypeDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [rows, setRows] = useState("");
  const [cols, setCols] = useState("");
  const [shapeIndex, setShapeIndex] = useState(0);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setRows("");
      setCols("");
      setShapeIndex(0);
      setDescription("");
      setError("");
    }
  }, [open]);

  const handleAdd = async () => {
    if (submitting || !name.trim() || !rows.trim() || !cols.trim()) return;
    const parsedRows = Number(rows);
    const parsedCols = Number(cols);
    if (
      !Number.isInteger(parsedRows) ||
      !Number.isInteger(parsedCols) ||
      parsedRows < 1 ||
      parsedRows > 8 ||
      parsedCols < 1 ||
      parsedCols > 12
    ) {
      setError(t("rowsColumnsInvalid"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createPlateType({
        name: name.trim(),
        rows: parsedRows,
        cols: parsedCols,
        layout: SHAPE_OPTIONS[shapeIndex].layout,
        maxDrops: SHAPE_OPTIONS[shapeIndex].maxDrops,
        description: description.trim() || undefined,
      });
      onAdded();
      onOpenChange(false);
    } catch {
      setError(t("addPlateTypeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-primary">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold text-text-primary">
            {t("addPlateType")}
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <div className="flex flex-col gap-7">
          <div>
            <label
              htmlFor="plate-type-name"
              className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium"
            >
              {t("typeName")}
            </label>
            <Input
              id="plate-type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 96 Well - Sitting Drop"
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
              {t("rowsColumns")}
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={8}
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                placeholder="e.g. 8"
                aria-label={t("rows")}
                className="h-12 rounded-xl"
              />
              <span className="text-text-secondary">×</span>
              <Input
                type="number"
                min={1}
                max={12}
                value={cols}
                onChange={(e) => setCols(e.target.value)}
                placeholder="e.g. 12"
                aria-label={t("columns")}
                className="h-12 rounded-xl"
              />
            </div>
            <p className="mt-2 text-[13px] text-text-secondary">
              {t("rowsColumnsHint")}
            </p>
          </div>

          <div>
            <div
              id="plate-type-shape-label"
              className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium"
            >
              {t("dropsPerWell")}
            </div>
            <div
              role="group"
              aria-labelledby="plate-type-shape-label"
              className="grid grid-cols-2 gap-2"
            >
              {SHAPE_OPTIONS.map((option, i) => (
                <button
                  type="button"
                  key={`${option.layout}-${option.maxDrops}`}
                  aria-pressed={shapeIndex === i}
                  onClick={() => setShapeIndex(i)}
                  className={cn(
                    "cursor-pointer rounded-xl px-3 py-3 text-[14px] font-medium",
                    shapeIndex === i
                      ? "bg-text-primary text-white"
                      : "bg-bg-surface text-text-primary"
                  )}
                >
                  {plateShapeLabel(t, option.layout, option.maxDrops)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
              {t("description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={t("describePlateType")}
              className="w-full rounded-xl border border-border-default bg-bg-surface p-4 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="mt-3">
          {error && (
            <div className="mb-3 rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
              {error}
            </div>
          )}
          <Button
            type="button"
            className="h-12 w-full rounded-xl"
            onClick={handleAdd}
            disabled={submitting}
          >
            {submitting ? t("adding") : t("addPlateType")}
          </Button>
          <p className="mt-3 text-center text-[13px] text-text-secondary">
            {t("plateTypeAvailableHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
