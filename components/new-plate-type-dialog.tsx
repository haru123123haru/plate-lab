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
import type { PlateType } from "@/types";

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
  const [wellCount, setWellCount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setWellCount("");
      setDescription("");
      setError("");
    }
  }, [open]);

  const handleAdd = async () => {
    if (submitting || !name.trim() || !wellCount.trim()) return;
    const parsedWellCount = Number(wellCount);
    if (![24, 96].includes(parsedWellCount)) {
      setError("Well count must be 24 or 96.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await createPlateType({
        name: name.trim(),
        rows: parsedWellCount === 24 ? 4 : 8,
        cols: parsedWellCount === 24 ? 6 : 12,
        maxDrops: 1,
        // 描き方の選択は Phase 2 で足す。それまではマイグレーションと同じく名前で決める
        layout: /hanging/i.test(name) ? "HANGING" : "SITTING",
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
            <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
              TYPE NAME
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 96 Well - Sitting Drop"
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
              WELL COUNT
            </label>
            <Input
              type="number"
              min={24}
              max={96}
              step={72}
              value={wellCount}
              onChange={(e) => setWellCount(e.target.value)}
              placeholder="e.g. 96"
              className="h-12 rounded-xl"
            />
            <p className="mt-2 text-[13px] text-text-secondary">
              Allowed values: 24 or 96.
            </p>
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
