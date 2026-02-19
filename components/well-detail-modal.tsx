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
import { useTranslation } from "@/components/locale-provider";
import type { WellData, WellStatus } from "@/types";

export type WellCondition = {
  salt: string;
  precipitant: string;
  polyamine: string;
  buffer: string;
};

interface WellDetailModalProps {
  well: WellData | null;
  reservoirCondition?: WellCondition;
  screeningCondition?: WellCondition;
  sampleName?: string;
  open: boolean;
  onClose: () => void;
}

const statusVariant: Record<
  WellStatus,
  "default" | "secondary" | "outline"
> = {
  filled: "default",
  empty: "secondary",
  crystal: "default",
  precipitate: "secondary",
  clear: "outline",
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
      <div className="mt-1 text-[15px] text-text-primary">{value || "-"}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[2px] text-text-tertiary font-semibold">
      {children}
    </div>
  );
}

export function WellDetailModal({
  well,
  reservoirCondition,
  screeningCondition,
  sampleName,
  open,
  onClose,
}: WellDetailModalProps) {
  const { t } = useTranslation();

  if (!well) return null;

  const statusLabel: Record<WellStatus, string> = {
    filled: t("filled"),
    empty: t("empty"),
    crystal: t("crystal"),
    precipitate: t("precipitate"),
    clear: t("clearStatus"),
  };

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
              Well {rowLabel}
              {well.col + 1}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Well detail information
            </SheetDescription>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="size-5 text-text-secondary" />
          </button>
        </SheetHeader>

        <div className="mt-3">
          <Badge variant={statusVariant[well.status]}>
            {statusLabel[well.status]}
          </Badge>
        </div>

        {/* Sample Section */}
        <Separator className="my-4" />
        <SectionLabel>{t("sample")}</SectionLabel>
        <div className="mt-3">
          <DetailField label={t("sampleName")} value={sampleName} />
        </div>

        {/* Reservoir */}
        {reservoirCondition && (
          <>
            <Separator className="my-4" />
            <SectionLabel>{t("reservoir")}</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailField
                label={t("precipitant")}
                value={reservoirCondition.precipitant}
              />
              <DetailField
                label={t("salt")}
                value={reservoirCondition.salt}
              />
              <DetailField
                label={t("polyamine")}
                value={reservoirCondition.polyamine}
              />
              <DetailField
                label={t("buffer")}
                value={reservoirCondition.buffer}
              />
            </div>
          </>
        )}

        {/* Screening */}
        {screeningCondition && (
          <>
            <Separator className="my-4" />
            <SectionLabel>{t("screening")}</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailField
                label={t("precipitant")}
                value={screeningCondition.precipitant}
              />
              <DetailField
                label={t("salt")}
                value={screeningCondition.salt}
              />
              <DetailField
                label={t("polyamine")}
                value={screeningCondition.polyamine}
              />
              <DetailField
                label={t("buffer")}
                value={screeningCondition.buffer}
              />
            </div>
          </>
        )}

        {/* Notes */}
        {well.notes && (
          <>
            <Separator className="my-4" />
            <DetailField label={t("notes")} value={well.notes} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
