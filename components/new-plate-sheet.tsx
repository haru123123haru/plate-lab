"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  BulkDropFields,
  emptyDropBatch,
  isDropBatchComplete,
  toDropBatchInput,
} from "@/components/bulk-drop-form";
import { createPlate } from "@/lib/actions/plates";
import { cn, today } from "@/lib/utils";
import { plateShapeLabel } from "@/lib/wells";
import { TemplateChips } from "@/components/template-chips";
import { useTranslation } from "@/components/locale-provider";
import type { PlateType } from "@/types";
import type { UiConditionSet } from "@/app/(app)/dashboard-client";

type ConditionTemplateItem = {
  id: number;
  name: string;
  description?: string | null;
};

interface NewPlateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plateTypes: PlateType[];
  conditionTemplates: ConditionTemplateItem[];
  conditionSets: UiConditionSet[];
}

export function NewPlateSheet({
  open,
  onOpenChange,
  plateTypes,
  conditionTemplates,
  conditionSets,
}: NewPlateSheetProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [plateName, setPlateName] = useState("");
  const [setupDate, setSetupDate] = useState(today);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  // 作成と同時に入れるドロップ（ウェル・置き場所・サンプル名・濃度）
  const [dropBatch, setDropBatch] = useState(emptyDropBatch);
  const [conditionMode, setConditionMode] = useState<"sets" | "custom">("sets");
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [customReservoirId, setCustomReservoirId] = useState<number | null>(
    null
  );
  const [customScreeningId, setCustomScreeningId] = useState<number | null>(
    null
  );
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const selectedPlateType = useMemo(
    () => plateTypes.find((pt) => pt.id === selectedType),
    [plateTypes, selectedType]
  );

  // 種別を変えたら形が変わるので、選んだウェルと置き場所（とその濃度）を戻す。サンプル名は残す
  const selectPlateType = (id: string) => {
    if (id === selectedType) return;
    setSelectedType(id);
    setDropBatch((prev) => ({
      ...prev,
      positions: new Set(),
      drops: emptyDropBatch().drops,
    }));
  };

  useEffect(() => {
    if (!open) {
      setPlateName("");
      setSetupDate(today());
      setSelectedType(null);
      setDropBatch(emptyDropBatch());
      setConditionMode("sets");
      setSelectedSetId(null);
      setCustomReservoirId(null);
      setCustomScreeningId(null);
      setNotes("");
      setCreating(false);
      setError("");
    }
  }, [open]);

  const handleCreate = async () => {
    if (
      creating ||
      !plateName.trim() ||
      !setupDate ||
      !selectedType ||
      !isDropBatchComplete(dropBatch)
    )
      return;
    setCreating(true);
    setError("");

    let resId: number | null = null;
    let scrId: number | null = null;

    if (conditionMode === "sets" && selectedSetId) {
      const set = conditionSets.find((s) => s.id === selectedSetId);
      if (set) {
        resId = set.reservoirTemplateId;
        scrId = set.screeningTemplateId;
      }
    } else if (conditionMode === "custom") {
      resId = customReservoirId;
      scrId = customScreeningId;
    }

    try {
      const result = await createPlate({
        name: plateName.trim(),
        plateTypeId: selectedType,
        reservoirTemplateId: resId,
        screeningTemplateId: scrId,
        notes: notes.trim() || undefined,
        setupDate,
        drops: toDropBatchInput(dropBatch),
      });
      if (result && "error" in result) {
        setError("Unable to create plate.");
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      setError("Unable to create plate.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[95dvh] rounded-t-2xl bg-bg-primary p-0"
        >
          <SheetTitle className="sr-only">{t("addPlate")}</SheetTitle>

          <div className="flex h-full flex-col overflow-y-auto pb-10">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-[26px] font-extrabold tracking-tight text-text-primary">
                  {t("addPlate")}
                </h2>
                <div className="mt-2 h-[3px] w-7 bg-text-primary" />
              </div>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-secondary"
                >
                  <X className="size-5" />
                  {t("cancel")}
                </Button>
              </SheetClose>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-7 rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
                {error}
              </div>
            )}

            {/* Form */}
            <div className="flex flex-col gap-7 px-7">
              {/* Plate Name */}
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                  {t("plateName")}
                </Label>
                <Input
                  value={plateName}
                  onChange={(e) => setPlateName(e.target.value)}
                  placeholder="e.g. Plate A-001"
                  className="h-12 rounded-xl border-border-default bg-bg-surface text-[15px]"
                />
              </div>

              {/* Setup Date */}
              <div className="space-y-2">
                <Label
                  htmlFor="new-plate-setup-date"
                  className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium"
                >
                  {t("setupDate")}
                </Label>
                <Input
                  id="new-plate-setup-date"
                  type="date"
                  value={setupDate}
                  onChange={(e) => setSetupDate(e.target.value)}
                  className="h-12 rounded-xl border-border-default bg-bg-surface text-[15px]"
                />
              </div>

              {/* Plate Type */}
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                  {t("plateType")}
                </Label>
                <div className="space-y-2">
                  {plateTypes.map((pt) => (
                    <button
                      type="button"
                      key={pt.id}
                      onClick={() => selectPlateType(pt.id)}
                      aria-pressed={selectedType === pt.id}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-surface p-4 text-left"
                    >
                      <div
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full",
                          selectedType === pt.id
                            ? "bg-text-primary"
                            : "border-2 border-border-default"
                        )}
                      >
                        {selectedType === pt.id && (
                          <div className="size-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="break-words text-[15px] font-medium text-text-primary">
                          {pt.name}
                        </div>
                        <div className="text-[13px] text-text-secondary">
                          {pt.rows * pt.cols} {t("wells")} ·{" "}
                          {plateShapeLabel(t, pt.layout, pt.maxDrops)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <Link
                  href="/settings/plate-types"
                  className="inline-block text-[13px] text-text-secondary underline underline-offset-2"
                >
                  {t("managePlateTypes")}
                </Link>
              </div>

              {/* 使うウェルとサンプル */}
              {selectedPlateType && (
                <BulkDropFields
                  rows={selectedPlateType.rows}
                  cols={selectedPlateType.cols}
                  layout={selectedPlateType.layout}
                  maxDrops={selectedPlateType.maxDrops}
                  value={dropBatch}
                  onChange={setDropBatch}
                />
              )}

              {/* Condition */}
              <div className="space-y-3">
                <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                  {t("condition")}
                </Label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConditionMode("sets")}
                    className={cn(
                      "cursor-pointer rounded-lg px-4 py-2 text-[14px] font-medium transition-colors",
                      conditionMode === "sets"
                        ? "bg-text-primary text-white"
                        : "bg-transparent text-text-secondary"
                    )}
                  >
                    {t("sets")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConditionMode("custom")}
                    className={cn(
                      "cursor-pointer rounded-lg px-4 py-2 text-[14px] font-medium transition-colors",
                      conditionMode === "custom"
                        ? "bg-text-primary text-white"
                        : "bg-transparent text-text-secondary"
                    )}
                  >
                    {t("pickIndividually")}
                  </button>
                </div>

                {/* Sets */}
                {conditionMode === "sets" && (
                  <div className="space-y-2">
                    {conditionSets.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setSelectedSetId(s.id)}
                        aria-pressed={selectedSetId === s.id}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-surface p-4 text-left"
                      >
                        <div
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full",
                            selectedSetId === s.id
                              ? "bg-text-primary"
                              : "border-2 border-border-default"
                          )}
                        >
                          {selectedSetId === s.id && (
                            <div className="size-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <div className="text-[15px] font-medium text-text-primary">
                            {s.name}
                          </div>
                          <div className="text-[13px] text-text-secondary">
                            {t("reservoir")}: {s.reservoirTemplateName} /{" "}
                            {t("screening")}: {s.screeningTemplateName}
                          </div>
                        </div>
                      </button>
                    ))}
                    {conditionSets.length === 0 && (
                      <p className="py-4 text-center text-[13px] text-text-tertiary">
                        {t("noConditionSets")}
                      </p>
                    )}
                  </div>
                )}

                {/* Pick individually（保存はしない） */}
                {conditionMode === "custom" && (
                  <div className="space-y-4 rounded-xl bg-bg-surface p-4">
                    <TemplateChips
                      label={t("reservoir")}
                      templates={conditionTemplates}
                      value={customReservoirId}
                      onChange={setCustomReservoirId}
                    />
                    <TemplateChips
                      label={t("screening")}
                      templates={conditionTemplates}
                      value={customScreeningId}
                      onChange={setCustomScreeningId}
                    />
                  </div>
                )}

                <Link
                  href="/settings/conditions"
                  className="inline-block text-[13px] text-text-secondary underline underline-offset-2"
                >
                  {t("manageConditions")}
                </Link>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                  {t("notes")}
                </Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder=""
                  className="w-full rounded-xl border border-border-default bg-bg-surface p-4 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                className="h-12 w-full rounded-xl text-[16px] font-semibold"
                onClick={handleCreate}
                disabled={
                  creating ||
                  !plateName.trim() ||
                  !setupDate ||
                  !selectedType ||
                  !isDropBatchComplete(dropBatch)
                }
              >
                {creating ? t("creating") : t("createPlate")}
              </Button>

              <p className="text-center text-[13px] text-text-secondary">
                {t("editAfterCreation")}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
