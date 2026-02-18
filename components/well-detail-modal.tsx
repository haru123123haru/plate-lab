"use client";

import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { WellData, WellStatus } from "@/types";

interface WellDetailModalProps {
  well: WellData | null;
  open: boolean;
  onClose: () => void;
}

const statusVariant: Record<WellStatus, "default" | "secondary" | "outline"> = {
  filled: "default",
  empty: "secondary",
  crystal: "default",
  precipitate: "secondary",
  clear: "outline",
};

const statusLabel: Record<WellStatus, string> = {
  filled: "Filled",
  empty: "Empty",
  crystal: "Crystal",
  precipitate: "Precipitate",
  clear: "Clear",
};

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

interface DetailFieldProps {
  label: string;
  value?: string;
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
        {label}
      </div>
      <div className="mt-1 text-[15px] text-text-primary">
        {value || "-"}
      </div>
    </div>
  );
}

export function WellDetailModal({ well, open, onClose }: WellDetailModalProps) {
  if (!well) return null;

  const rowLabel = ROW_LABELS[well.row] ?? String(well.row);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-2xl px-6 pb-8 pt-3"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-text-tertiary" />

        <SheetHeader className="flex-row items-center justify-between p-0">
          <div>
            <SheetTitle className="text-[17px]">
              Row {rowLabel} · Column {well.col + 1}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Well detail information
            </SheetDescription>
          </div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="size-5 text-text-secondary" />
          </button>
        </SheetHeader>

        <div className="mt-3">
          <Badge variant={statusVariant[well.status]}>
            {statusLabel[well.status]}
          </Badge>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <DetailField label="Protein" value={well.protein} />
          <DetailField label="Concentration" value={well.concentration} />
          <DetailField label="Buffer" value={well.buffer} />
          <DetailField label="pH" value={well.ph} />
          <DetailField label="Precipitant" value={well.precipitant} />
        </div>

        <Separator className="my-4" />

        <DetailField label="Notes" value={well.notes} />
      </SheetContent>
    </Sheet>
  );
}
