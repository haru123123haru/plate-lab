"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet";
import { NewPlateTypeDialog } from "@/components/new-plate-type-dialog";
import { WellGridSelector } from "@/components/well-grid-selector";
import { createPlate } from "@/lib/actions/plates";
import {
  createConditionTemplate,
  deleteConditionTemplate,
  createConditionSet,
  deleteConditionSet,
} from "@/lib/actions/condition-templates";
import { cn } from "@/lib/utils";
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
  const [sampleName, setSampleName] = useState("");
  const [allPlateTypes, setAllPlateTypes] = useState<PlateType[]>(plateTypes);
  const [allTemplates, setAllTemplates] =
    useState<ConditionTemplateItem[]>(conditionTemplates);
  const [allSets, setAllSets] = useState<UiConditionSet[]>(conditionSets);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [filledPositions, setFilledPositions] = useState<Set<string>>(
    new Set()
  );
  const [conditionMode, setConditionMode] = useState<"sets" | "custom">(
    "sets"
  );
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [customReservoirId, setCustomReservoirId] = useState<number | null>(
    null
  );
  const [customScreeningId, setCustomScreeningId] = useState<number | null>(
    null
  );
  const [customSetName, setCustomSetName] = useState("");
  const [savingSet, setSavingSet] = useState(false);
  const [notes, setNotes] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleAddTemplate = async () => {
    const name = newTemplateName.trim();
    if (!name) return;
    setAddingTemplate(true);
    const created = await createConditionTemplate({ name });
    setAllTemplates((prev) => [...prev, created]);
    setNewTemplateName("");
    setAddingTemplate(false);
  };

  const handleDeleteTemplate = async (id: number) => {
    await deleteConditionTemplate(id);
    setAllTemplates((prev) => prev.filter((t) => t.id !== id));
    if (customReservoirId === id) setCustomReservoirId(null);
    if (customScreeningId === id) setCustomScreeningId(null);
    setAllSets((prev) =>
      prev.filter(
        (s) => s.reservoirTemplateId !== id && s.screeningTemplateId !== id
      )
    );
  };

  const handleDeleteSet = async (id: number) => {
    await deleteConditionSet(id);
    setAllSets((prev) => prev.filter((s) => s.id !== id));
    if (selectedSetId === id) setSelectedSetId(null);
  };

  const selectedPlateType = useMemo(
    () => allPlateTypes.find((pt) => pt.id === selectedType),
    [allPlateTypes, selectedType]
  );
  const gridRows = selectedPlateType
    ? selectedPlateType.wellCount === 24
      ? 4
      : 8
    : 0;
  const gridCols = selectedPlateType
    ? selectedPlateType.wellCount === 24
      ? 6
      : 12
    : 0;
  const totalWells = gridRows * gridCols;

  const handleAddPlateType = (newType: PlateType) => {
    setAllPlateTypes((prev) => [...prev, newType]);
    setSelectedType(newType.id);
  };

  const handleRegisterSet = async () => {
    if (!customSetName.trim() || !customReservoirId || !customScreeningId)
      return;
    setSavingSet(true);
    const created = await createConditionSet({
      name: customSetName.trim(),
      reservoirTemplateId: customReservoirId,
      screeningTemplateId: customScreeningId,
    });
    const newSet: UiConditionSet = {
      id: created.id,
      name: created.name,
      isDefault: false,
      reservoirTemplateId: created.reservoirTemplateId,
      screeningTemplateId: created.screeningTemplateId,
      reservoirTemplateName: created.reservoirTemplate.name,
      screeningTemplateName: created.screeningTemplate.name,
    };
    setAllSets((prev) => [...prev, newSet]);
    setSelectedSetId(created.id);
    setConditionMode("sets");
    setCustomSetName("");
    setSavingSet(false);
  };

  const handleToggleWell = (key: string) => {
    setFilledPositions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set<string>();
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        all.add(`${r}-${c}`);
      }
    }
    setFilledPositions(all);
  };

  const handleClearAll = () => {
    setFilledPositions(new Set());
  };

  useEffect(() => {
    setFilledPositions(new Set());
  }, [selectedType]);

  useEffect(() => {
    if (!open) {
      setPlateName("");
      setSampleName("");
      setSelectedType(null);
      setFilledPositions(new Set());
      setConditionMode("sets");
      setSelectedSetId(null);
      setCustomReservoirId(null);
      setCustomScreeningId(null);
      setCustomSetName("");
      setNotes("");
      setCreating(false);
      setError("");
    } else {
      setAllPlateTypes(plateTypes);
      setAllTemplates(conditionTemplates);
      setAllSets(conditionSets);
    }
  }, [open, plateTypes, conditionTemplates, conditionSets]);

  const handleCreate = async () => {
    if (!plateName.trim() || !selectedType) return;
    setCreating(true);
    setError("");

    let resId: number | null = null;
    let scrId: number | null = null;

    if (conditionMode === "sets" && selectedSetId) {
      const set = allSets.find((s) => s.id === selectedSetId);
      if (set) {
        resId = set.reservoirTemplateId;
        scrId = set.screeningTemplateId;
      }
    } else if (conditionMode === "custom") {
      resId = customReservoirId;
      scrId = customScreeningId;
    }

    const result = await createPlate({
      name: plateName.trim(),
      plateTypeId: selectedType,
      sampleName: sampleName.trim() || undefined,
      reservoirTemplateId: resId,
      screeningTemplateId: scrId,
      notes: notes.trim() || undefined,
      filledPositions: Array.from(filledPositions),
    });
    setCreating(false);
    if (result && "error" in result) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
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

              {/* Sample Name */}
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                  {t("sampleNameLabel")}
                </Label>
                <Input
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="e.g. Lysozyme"
                  className="h-12 rounded-xl border-border-default bg-bg-surface text-[15px]"
                />
              </div>

              {/* Plate Type */}
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                  {t("plateType")}
                </Label>
                <div className="flex gap-3 overflow-x-auto">
                  {allPlateTypes.map((pt) => (
                    <button
                      type="button"
                      key={pt.id}
                      onClick={() => setSelectedType(pt.id)}
                      className={cn(
                        "shrink-0 cursor-pointer rounded-xl p-4 text-left transition-colors",
                        selectedType === pt.id
                          ? "bg-text-primary text-white"
                          : "border border-border-default bg-bg-surface text-text-primary"
                      )}
                    >
                      <div className="text-[15px] font-semibold">
                        {pt.name}
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-[13px]",
                          selectedType === pt.id
                            ? "text-white/70"
                            : "text-text-secondary"
                        )}
                      >
                        {pt.wellCount} {t("wells")}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTypeDialogOpen(true)}
                    className="flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-default px-6 py-4 text-text-secondary transition-colors hover:border-text-secondary"
                  >
                    <Plus className="size-5" />
                    <span className="mt-1 text-[13px] font-medium">
                      {t("add")}
                    </span>
                  </button>
                </div>
              </div>

              {/* Well Map Selector */}
              {selectedPlateType && (
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                    {t("wellMap")}
                  </Label>
                  <div className="rounded-xl bg-bg-surface">
                    <WellGridSelector
                      rows={gridRows}
                      cols={gridCols}
                      filledPositions={filledPositions}
                      onToggle={handleToggleWell}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-text-secondary">
                      {filledPositions.size} / {totalWells} {t("wellsSelected")}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="cursor-pointer text-[13px] font-medium text-text-primary underline underline-offset-2"
                      >
                        {t("selectAll")}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="cursor-pointer text-[13px] font-medium text-text-secondary underline underline-offset-2"
                      >
                        {t("clear")}
                      </button>
                    </div>
                  </div>
                </div>
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
                    {t("newSet")}
                  </button>
                </div>

                {/* Sets */}
                {conditionMode === "sets" && (
                  <div className="space-y-2">
                    {allSets.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-xl bg-bg-surface p-4"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSetId(s.id)}
                          className="flex flex-1 cursor-pointer items-center gap-3 text-left"
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
                        {!s.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSet(s.id)}
                            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-text-tertiary transition-colors hover:text-accent-negative"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {allSets.length === 0 && (
                      <p className="py-4 text-center text-[13px] text-text-tertiary">
                        {t("noConditionSets")}
                      </p>
                    )}
                  </div>
                )}

                {/* New Set */}
                {conditionMode === "custom" && (
                  <div className="space-y-4 rounded-xl bg-bg-surface p-4">
                    <div className="space-y-1.5">
                      <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-text-tertiary">
                        {t("setName")}
                      </div>
                      <Input
                        value={customSetName}
                        onChange={(e) => setCustomSetName(e.target.value)}
                        placeholder="e.g. PEG + MPD Mix"
                        className="h-10 rounded-xl border-border-default bg-bg-primary text-[14px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-text-tertiary">
                        {t("addTemplate")}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="e.g. Ammonium Sulfate"
                          className="h-10 flex-1 rounded-xl border-border-default bg-bg-primary text-[14px]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTemplate();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 rounded-xl px-3"
                          onClick={handleAddTemplate}
                          disabled={addingTemplate || !newTemplateName.trim()}
                        >
                          <Plus className="size-4" />
                          {t("add")}
                        </Button>
                      </div>
                    </div>

                    {/* Reservoir */}
                    <div className="space-y-1.5">
                      <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-text-tertiary">
                        {t("reservoir")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allTemplates.map((ct) => (
                          <div key={ct.id} className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setCustomReservoirId(ct.id)}
                              className={cn(
                                "cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                                !ct.description && "rounded-r-none",
                                customReservoirId === ct.id
                                  ? "bg-text-primary text-white"
                                  : "border border-border-default bg-bg-primary text-text-primary"
                              )}
                            >
                              {ct.name}
                            </button>
                            {!ct.description && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(ct.id)}
                                className={cn(
                                  "cursor-pointer rounded-r-lg border-l-0 px-1.5 py-1.5 text-[11px] transition-colors",
                                  customReservoirId === ct.id
                                    ? "bg-text-primary text-white/60 hover:text-white"
                                    : "border border-l-0 border-border-default bg-bg-primary text-text-tertiary hover:text-accent-negative"
                                )}
                              >
                                <X className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Screening */}
                    <div className="space-y-1.5">
                      <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-text-tertiary">
                        {t("screening")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allTemplates.map((ct) => (
                          <div key={ct.id} className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setCustomScreeningId(ct.id)}
                              className={cn(
                                "cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                                !ct.description && "rounded-r-none",
                                customScreeningId === ct.id
                                  ? "bg-text-primary text-white"
                                  : "border border-border-default bg-bg-primary text-text-primary"
                              )}
                            >
                              {ct.name}
                            </button>
                            {!ct.description && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(ct.id)}
                                className={cn(
                                  "cursor-pointer rounded-r-lg border-l-0 px-1.5 py-1.5 text-[11px] transition-colors",
                                  customScreeningId === ct.id
                                    ? "bg-text-primary text-white/60 hover:text-white"
                                    : "border border-l-0 border-border-default bg-bg-primary text-text-tertiary hover:text-accent-negative"
                                )}
                              >
                                <X className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="h-10 w-full rounded-xl text-[14px] font-semibold"
                      onClick={handleRegisterSet}
                      disabled={
                        savingSet ||
                        !customSetName.trim() ||
                        !customReservoirId ||
                        !customScreeningId
                      }
                    >
                      {savingSet ? t("saving") : t("registerSet")}
                    </Button>
                  </div>
                )}
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
                disabled={creating || !plateName.trim() || !selectedType}
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

      <NewPlateTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        onAdd={handleAddPlateType}
      />
    </>
  );
}
