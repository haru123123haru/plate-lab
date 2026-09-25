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
import type { PlateLayout, PlateType } from "@/types";

// createPlateTypeSchema が許す描き方の組み合わせ
const SHAPE_OPTIONS: {
  layout: PlateLayout;
  maxDrops: number;
  label: string;
}[] = [
  { layout: "SITTING", maxDrops: 1, label: "Sitting · 1 drop" },
  { layout: "HANGING", maxDrops: 1, label: "Hanging · 1 drop" },
  { layout: "SITTING", maxDrops: 4, label: "Sitting · 4 drops" },
  { layout: "HANGING", maxDrops: 3, label: "Hanging · 3 drops" },
];

interface NewPlateTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: PlateType) => void;
}

export function NewPlateTypeDialog({
  open,
  onOpenChange,
  onAdd,
}: NewPlateTypeDialogProps) {
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
      setError("Rows must be 1-8 and columns 1-12.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await createPlateType({
        name: name.trim(),
        rows: parsedRows,
        cols: parsedCols,
        layout: SHAPE_OPTIONS[shapeIndex].layout,
        maxDrops: SHAPE_OPTIONS[shapeIndex].maxDrops,
        description: description.trim() || undefined,
      });
      onAdd({
        id: result.id,
        name: result.name,
        wellCount: result.wellCount,
        rows: result.rows,
        cols: result.cols,
        maxDrops: result.maxDrops,
        layout: result.layout,
        description: result.description ?? undefined,
      });
      onOpenChange(false);
    } catch {
      setError("Unable to add plate type.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-primary">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold text-text-primary">
            Add Plate Type
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <div className="flex flex-col gap-7">
          <div>
            <label
              htmlFor="plate-type-name"
              className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium"
            >
              TYPE NAME
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
              ROWS × COLUMNS
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={8}
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                placeholder="e.g. 8"
                aria-label="Rows"
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
                aria-label="Columns"
                className="h-12 rounded-xl"
              />
            </div>
            <p className="mt-2 text-[13px] text-text-secondary">
              Rows 1-8 (A-H), columns 1-12.
            </p>
          </div>

          <div>
            <div
              id="plate-type-shape-label"
              className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium"
            >
              DROPS PER WELL
            </div>
            <div
              role="group"
              aria-labelledby="plate-type-shape-label"
              className="grid grid-cols-2 gap-2"
            >
              {SHAPE_OPTIONS.map((option, i) => (
                <button
                  type="button"
                  key={option.label}
                  aria-pressed={shapeIndex === i}
                  onClick={() => setShapeIndex(i)}
                  className={cn(
                    "cursor-pointer rounded-xl px-3 py-3 text-[14px] font-medium",
                    shapeIndex === i
                      ? "bg-text-primary text-white"
                      : "bg-bg-surface text-text-primary"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe this plate type..."
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
            className="h-12 w-full rounded-xl"
            onClick={handleAdd}
            disabled={submitting}
          >
            {submitting ? "Adding..." : "Add Plate Type"}
          </Button>
          <p className="mt-3 text-center text-[13px] text-text-secondary">
            This type will be available when creating new plates.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
