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

  useEffect(() => {
    if (!open) {
      setName("");
      setWellCount("");
      setDescription("");
    }
  }, [open]);

  const handleAdd = async () => {
    if (!name.trim() || !wellCount.trim()) return;
    setSubmitting(true);
    const result = await createPlateType({
      name: name.trim(),
      wellCount: Number(wellCount),
      description: description.trim() || undefined,
    });
    onAdd({
      id: result.id,
      name: result.name,
      wellCount: result.wellCount,
      description: result.description ?? undefined,
    });
    setSubmitting(false);
    onOpenChange(false);
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
              value={wellCount}
              onChange={(e) => setWellCount(e.target.value)}
              placeholder="e.g. 96"
              className="h-12 rounded-xl"
            />
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
