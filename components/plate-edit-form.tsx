"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/components/locale-provider";
import { deletePlate, updatePlate } from "@/lib/actions/plates";
import { cn } from "@/lib/utils";

interface PlateEditFormProps {
  plate: {
    id: string;
    name: string;
    setupDate: string;
    reservoirTemplateId: number | null;
    screeningTemplateId: number | null;
  };
  conditionTemplates: { id: number; name: string }[];
  onClose: () => void;
}

// 詳細画面の編集モード。名前・仕込み日・条件を直し、ゴミ箱へ移す。
// 開くたびに作り直すので、閉じると入力途中の値は捨てられる
export function PlateEditForm({
  plate,
  conditionTemplates,
  onClose,
}: PlateEditFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [editName, setEditName] = useState(plate.name);
  const [editSetupDate, setEditSetupDate] = useState(plate.setupDate);
  const [editReservoirTemplateId, setEditReservoirTemplateId] = useState<
    number | null
  >(plate.reservoirTemplateId);
  const [editScreeningTemplateId, setEditScreeningTemplateId] = useState<
    number | null
  >(plate.screeningTemplateId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await updatePlate(plate.id, {
        name: editName,
        setupDate: editSetupDate,
        reservoirTemplateId: editReservoirTemplateId,
        screeningTemplateId: editScreeningTemplateId,
      });
      if (result && "error" in result) {
        setError(t("saveChanges") + ": Unable to save changes.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError(t("saveChanges") + ": Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveToTrash = async () => {
    if (trashing) return;
    setTrashing(true);
    setError("");
    try {
      const result = await deletePlate(plate.id);
      if ("error" in result) {
        setError(t("actionFailed"));
        setTrashConfirmOpen(false);
        setTrashing(false);
        return;
      }
      // 成功時は pending のまま遷移させ、遷移前にもう一度押されるのを防ぐ
      router.push("/");
    } catch {
      setError(t("actionFailed"));
      setTrashConfirmOpen(false);
      setTrashing(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl bg-bg-surface p-4">
      {error && (
        <div className="rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
          {t("plateName")}
        </label>
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-12 rounded-xl border-border-default bg-bg-primary text-[15px]"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="edit-plate-setup-date"
          className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium"
        >
          {t("setupDate")}
        </label>
        <Input
          id="edit-plate-setup-date"
          type="date"
          value={editSetupDate}
          onChange={(e) => setEditSetupDate(e.target.value)}
          className="h-12 rounded-xl border-border-default bg-bg-primary text-[15px]"
        />
      </div>

      <TemplateRadioList
        label={t("reservoir")}
        templates={conditionTemplates}
        value={editReservoirTemplateId}
        onChange={setEditReservoirTemplateId}
      />
      <TemplateRadioList
        label={t("screening")}
        templates={conditionTemplates}
        value={editScreeningTemplateId}
        onChange={setEditScreeningTemplateId}
      />

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-11 rounded-xl"
          onClick={onClose}
        >
          {t("cancel")}
        </Button>
        <Button
          className="flex-1 h-11 rounded-xl"
          onClick={handleSave}
          disabled={saving || !editSetupDate}
        >
          {saving ? t("saving") : t("saveChanges")}
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setTrashConfirmOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-accent-negative/40 py-2.5 text-[14px] font-medium text-accent-negative transition-colors hover:bg-accent-negative/10"
      >
        <Trash2 className="size-4" />
        {t("moveToTrash")}
      </button>

      <ConfirmDialog
        open={trashConfirmOpen}
        onOpenChange={setTrashConfirmOpen}
        title={t("trashConfirmTitle")}
        description={t("trashConfirmBody")}
        confirmLabel={t("moveToTrash")}
        pendingLabel={t("moving")}
        pending={trashing}
        onConfirm={handleMoveToTrash}
      />
    </div>
  );
}

// リザーバーとスクリーニングで同じ形の、テンプレートを1つ選ぶ欄
function TemplateRadioList({
  label,
  templates,
  value,
  onChange,
}: {
  label: string;
  templates: { id: number; name: string }[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
        {label}
      </label>
      <div className="space-y-2">
        {templates.map((ct) => (
          <button
            type="button"
            key={ct.id}
            onClick={() => onChange(ct.id)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-primary p-3 text-left"
          >
            <div
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                value === ct.id
                  ? "bg-text-primary"
                  : "border-2 border-border-default"
              )}
            >
              {value === ct.id && (
                <div className="size-2 rounded-full bg-white" />
              )}
            </div>
            <div>
              <div className="text-[14px] font-medium text-text-primary">
                {ct.name}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
