"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { WellShape } from "@/components/well-shape";
import { useTranslation } from "@/components/locale-provider";
import {
  addObservation,
  createDrop,
  deleteDrop,
  deleteObservation,
  updateDrop,
} from "@/lib/actions/drops";
import type { PlateLayout, WellData } from "@/types";

export type WellCondition = {
  salt: string;
  precipitant: string;
  polyamine: string;
  buffer: string;
};

interface WellSheetProps {
  well: WellData;
  layout: PlateLayout;
  maxDrops: number;
  reservoirCondition?: WellCondition;
  screeningCondition?: WellCondition;
  // ゴミ箱のプレートは閲覧のみ
  readOnly: boolean;
  open: boolean;
  onClose: () => void;
}

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const labelClassName =
  "text-[11px] uppercase tracking-[2px] text-text-secondary font-medium";
const inputClassName =
  "h-11 rounded-xl border-border-default bg-bg-primary text-[15px]";
const textareaClassName =
  "w-full rounded-xl border border-border-default bg-bg-primary p-3 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none";

// 利用者の端末の今日を "YYYY-MM-DD" で返す（sv-SE はこの形式で日付を出す）
function today() {
  return new Date().toLocaleDateString("sv-SE");
}

function hasError(result: unknown) {
  return typeof result === "object" && result !== null && "error" in result;
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className={labelClassName}>{label}</div>
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

function ConditionSection({
  label,
  condition,
}: {
  label: string;
  condition: WellCondition;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Separator className="my-4" />
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
        <DetailField label={t("precipitant")} value={condition.precipitant} />
        <DetailField label={t("salt")} value={condition.salt} />
        <DetailField label={t("polyamine")} value={condition.polyamine} />
        <DetailField label={t("buffer")} value={condition.buffer} />
      </div>
    </>
  );
}

export function WellSheet({
  well,
  layout,
  maxDrops,
  reservoirCondition,
  screeningCondition,
  readOnly,
  open,
  onClose,
}: WellSheetProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedSlot, setSelectedSlot] = useState(well.drops[0]?.slot ?? 1);
  const [editing, setEditing] = useState(false);
  const [sampleName, setSampleName] = useState("");
  const [concentration, setConcentration] = useState("");
  const [dropNotes, setDropNotes] = useState("");
  const [observedAt, setObservedAt] = useState(today);
  const [observationNotes, setObservationNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // refresh の完了まで isRefreshing が true。そのあいだ古い表示のまま操作させない
  const [isRefreshing, startTransition] = useTransition();
  const busy = pending || isRefreshing;
  const fieldId = useId();

  const drop = well.drops.find((d) => d.slot === selectedSlot);
  // 編集中に別の画面でドロップが消されたら、編集をやめて追加フォームに戻す
  const isEditing = editing && drop !== undefined;
  const filledSlots = new Set(well.drops.map((d) => d.slot));
  const rowLabel = ROW_LABELS[well.row] ?? String(well.row);
  const slotName = (slot: number) => `${t("slot")} ${slot}`;
  const slotAriaLabel = (slot: number) =>
    `${slotName(slot)} (${filledSlots.has(slot) ? t("hasDrop") : t("empty")})`;

  const resetDropForm = () => {
    setEditing(false);
    setSampleName("");
    setConcentration("");
    setDropNotes("");
    setError("");
  };

  const handleSlotClick = (slot: number) => {
    // 送信中に切り替えると、結果のエラーが別の置き場所に出てしまう
    if (busy) return;
    setSelectedSlot(slot);
    resetDropForm();
    setObservationNotes("");
  };

  const startEditing = () => {
    if (!drop) return;
    setSampleName(drop.sampleName);
    setConcentration(drop.concentration);
    setDropNotes(drop.notes ?? "");
    setError("");
    setEditing(true);
  };

  // 成功したら onSuccess を呼び、サーバーの内容で描き直す。
  // onSuccess も transition の中で呼び、新しい内容と同時に反映する（編集前の値がちらつかない）
  const run = async (action: () => Promise<unknown>, onSuccess: () => void) => {
    if (busy) return;
    setPending(true);
    setError("");
    try {
      const result = await action();
      if (hasError(result)) {
        const message = (result as { error: string }).error;
        setError(
          message === "Slot in use" ? t("slotInUse") : t("actionFailed")
        );
        return;
      }
      startTransition(() => {
        onSuccess();
        router.refresh();
      });
    } catch {
      setError(t("actionFailed"));
    } finally {
      setPending(false);
    }
  };

  const handleSaveDrop = () => {
    if (!sampleName.trim() || !concentration.trim()) return;
    const fields = {
      sampleName,
      concentration,
      notes: dropNotes.trim() || null,
    };
    void run(
      () =>
        isEditing && drop
          ? updateDrop(drop.id, fields)
          : createDrop({
              wellId: well.id ?? "",
              slot: selectedSlot,
              ...fields,
            }),
      resetDropForm
    );
  };

  const handleDeleteDrop = async () => {
    if (!drop) return;
    await run(() => deleteDrop(drop.id), resetDropForm);
    setDeleteConfirmOpen(false);
  };

  const handleAddObservation = () => {
    if (!drop || !observedAt || !observationNotes.trim()) return;
    void run(
      () =>
        addObservation({
          dropId: drop.id,
          observedAt,
          notes: observationNotes,
        }),
      () => setObservationNotes("")
    );
  };

  const showDropForm = !readOnly && (!drop || isEditing);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-6 pb-8 pt-3"
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
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer"
            aria-label={t("close")}
          >
            <X className="size-5 text-text-secondary" />
          </button>
        </SheetHeader>

        {reservoirCondition && (
          <ConditionSection
            label={t("reservoir")}
            condition={reservoirCondition}
          />
        )}
        {screeningCondition && (
          <ConditionSection
            label={t("screening")}
            condition={screeningCondition}
          />
        )}

        {/* 置き場所の図。押した置き場所のドロップを下に出す */}
        <Separator className="my-4" />
        <SectionLabel>{t("sample")}</SectionLabel>
        <WellShape
          layout={layout}
          maxDrops={maxDrops}
          filledSlots={filledSlots}
          onSlotClick={handleSlotClick}
          selectedSlot={selectedSlot}
          slotLabel={slotAriaLabel}
          className="mx-auto mt-3 w-40"
        />
        {maxDrops > 1 && (
          <div className="mt-2 text-center text-[13px] text-text-secondary">
            {slotName(selectedSlot)}
          </div>
        )}

        <div className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
              {error}
            </div>
          )}

          {showDropForm ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor={`${fieldId}-sample`} className={labelClassName}>
                  {t("sampleName")}
                </label>
                <Input
                  id={`${fieldId}-sample`}
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="e.g. Lysozyme"
                  className={inputClassName}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`${fieldId}-concentration`}
                  className={labelClassName}
                >
                  {t("concentration")}
                </label>
                <Input
                  id={`${fieldId}-concentration`}
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                  placeholder="e.g. 10 mg/mL"
                  className={inputClassName}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor={`${fieldId}-notes`} className={labelClassName}>
                  {t("notes")}
                </label>
                <textarea
                  id={`${fieldId}-notes`}
                  value={dropNotes}
                  onChange={(e) => setDropNotes(e.target.value)}
                  rows={2}
                  className={textareaClassName}
                />
              </div>
              <div className="flex gap-3">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-xl"
                    onClick={resetDropForm}
                  >
                    {t("cancel")}
                  </Button>
                )}
                <Button
                  type="button"
                  className="h-11 flex-1 rounded-xl"
                  onClick={handleSaveDrop}
                  disabled={busy || !sampleName.trim() || !concentration.trim()}
                >
                  {busy
                    ? t("saving")
                    : isEditing
                      ? t("saveChanges")
                      : t("addDrop")}
                </Button>
              </div>
            </div>
          ) : drop ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <DetailField label={t("sampleName")} value={drop.sampleName} />
                <DetailField
                  label={t("concentration")}
                  value={drop.concentration}
                />
              </div>
              {drop.notes && (
                <DetailField label={t("notes")} value={drop.notes} />
              )}
              {!readOnly && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-xl"
                    disabled={busy}
                    onClick={startEditing}
                  >
                    {t("edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-xl border-accent-negative/40 text-accent-negative"
                    disabled={busy}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    {t("deleteDrop")}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[14px] text-text-secondary">{t("emptySlot")}</p>
          )}
        </div>

        {/* 観察履歴（新しい順） */}
        {drop && (
          <>
            <Separator className="my-4" />
            <SectionLabel>{t("observations")}</SectionLabel>
            <div className="mt-3 space-y-3">
              {drop.observations.length === 0 && (
                <p className="text-[14px] text-text-secondary">
                  {t("noObservations")}
                </p>
              )}
              {drop.observations.map((o) => (
                <div key={o.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-[13px] text-text-secondary">
                      {o.observedAt}
                    </div>
                    <div className="mt-0.5 whitespace-pre-wrap text-[15px] text-text-primary">
                      {o.notes}
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={t("delete")}
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => deleteObservation(o.id),
                          () => {}
                        )
                      }
                      className="cursor-pointer p-1 text-text-tertiary hover:text-accent-negative"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!readOnly && (
              <div className="mt-4 space-y-3 rounded-xl bg-bg-primary p-3">
                <div className="space-y-2">
                  <label
                    htmlFor={`${fieldId}-observed`}
                    className={labelClassName}
                  >
                    {t("observedOn")}
                  </label>
                  <Input
                    id={`${fieldId}-observed`}
                    type="date"
                    value={observedAt}
                    onChange={(e) => setObservedAt(e.target.value)}
                    className="h-11 rounded-xl border-border-default bg-bg-surface text-[15px]"
                  />
                </div>
                <textarea
                  value={observationNotes}
                  onChange={(e) => setObservationNotes(e.target.value)}
                  rows={2}
                  aria-label={t("notes")}
                  className="w-full rounded-xl border border-border-default bg-bg-surface p-3 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
                />
                <Button
                  type="button"
                  className="h-11 w-full rounded-xl"
                  onClick={handleAddObservation}
                  disabled={busy || !observedAt || !observationNotes.trim()}
                >
                  {busy ? t("adding") : t("addObservation")}
                </Button>
              </div>
            )}
          </>
        )}

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={t("deleteDropConfirmTitle")}
          description={t("deleteDropConfirmBody")}
          confirmLabel={t("deleteDrop")}
          pendingLabel={t("deleting")}
          pending={busy}
          onConfirm={handleDeleteDrop}
        />
      </SheetContent>
    </Sheet>
  );
}
