"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SectionHeader } from "@/components/section-header";
import { TemplateChips } from "@/components/template-chips";
import { useTranslation } from "@/components/locale-provider";
import {
  createConditionSet,
  createConditionTemplate,
  deleteConditionSet,
  deleteConditionTemplate,
} from "@/lib/actions/condition-templates";
import type { UiConditionSet } from "@/app/(app)/dashboard-client";

interface ConditionsClientProps {
  templates: { id: number; name: string; isDefault: boolean }[];
  sets: UiConditionSet[];
}

type DeleteTarget = { kind: "template" | "set"; id: number };

export function ConditionsClient({ templates, sets }: ConditionsClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [reservoirId, setReservoirId] = useState<number | null>(null);
  const [screeningId, setScreeningId] = useState<number | null>(null);
  const [savingSet, setSavingSet] = useState(false);
  const [dialogError, setDialogError] = useState("");
  // 閉じるアニメーションの間も文面が変わらないよう、対象は閉じても残す
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 一覧の再取得中。終わるまで消えたはずの行のボタンを押させない
  const [refreshing, startRefresh] = useTransition();
  const busy = deleting || refreshing;

  const refresh = () => startRefresh(() => router.refresh());

  const openDelete = (target: DeleteTarget) => {
    setDeleteTarget(target);
    setConfirmOpen(true);
  };

  const handleAddTemplate = async () => {
    const name = templateName.trim();
    if (!name || addingTemplate) return;
    setAddingTemplate(true);
    setError("");
    try {
      await createConditionTemplate({ name });
      setTemplateName("");
      refresh();
    } catch {
      setError(t("actionFailed"));
    } finally {
      setAddingTemplate(false);
    }
  };

  const openSetDialog = () => {
    setNewSetName("");
    setReservoirId(null);
    setScreeningId(null);
    setDialogError("");
    setSetOpen(true);
  };

  const handleSaveSet = async () => {
    if (savingSet || !newSetName.trim() || !reservoirId || !screeningId) return;
    setSavingSet(true);
    setDialogError("");
    try {
      await createConditionSet({
        name: newSetName.trim(),
        reservoirTemplateId: reservoirId,
        screeningTemplateId: screeningId,
      });
      setSetOpen(false);
      refresh();
    } catch {
      setDialogError(t("actionFailed"));
    } finally {
      setSavingSet(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError("");
    try {
      if (deleteTarget.kind === "set") {
        const { error } = await deleteConditionSet(deleteTarget.id);
        if (error) setError(t("actionFailed"));
      } else {
        // サーバーアクションは英語の文を返すので、どちらの「使っている」かを見分けて出し直す
        const { error } = await deleteConditionTemplate(deleteTarget.id);
        if (error?.includes("condition set")) setError(t("templateUsedBySet"));
        else if (error?.includes("plate")) setError(t("templateUsedByPlate"));
        else if (error) setError(t("actionFailed"));
      }
    } catch {
      setError(t("actionFailed"));
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      refresh();
    }
  };

  // テンプレートを消すと、それを使う自分のセットも一緒に消える
  const affectedSetCount =
    deleteTarget?.kind === "template"
      ? sets.filter(
          (s) =>
            !s.isDefault &&
            (s.reservoirTemplateId === deleteTarget.id ||
              s.screeningTemplateId === deleteTarget.id)
        ).length
      : 0;

  return (
    <div className="bg-bg-primary min-h-dvh pb-10">
      <div className="flex items-center gap-3 px-6 pt-14 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer"
          aria-label={t("back")}
        >
          <ArrowLeft className="size-6 text-text-primary" />
        </button>
        <h1 className="flex-1 text-[20px] font-bold text-text-primary">
          {t("conditions")}
        </h1>
      </div>

      <div className="flex flex-col gap-8 px-6">
        {error && (
          <div className="rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
            {error}
          </div>
        )}

        {/* Templates */}
        <div className="space-y-2">
          <SectionHeader label={t("templates")} />
          <div className="flex gap-2">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Ammonium Sulfate"
              aria-label={t("templateName")}
              className="h-10 flex-1 rounded-xl border-border-default bg-bg-surface text-[14px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
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
              disabled={addingTemplate || !templateName.trim()}
            >
              <Plus className="size-4" />
              {t("add")}
            </Button>
          </div>
          {templates.map((ct) => (
            <div
              key={ct.id}
              className="flex items-center gap-3 rounded-xl bg-bg-surface p-4"
            >
              <div className="min-w-0 flex-1 truncate text-[15px] font-medium text-text-primary">
                {ct.name}
              </div>
              {!ct.isDefault && (
                <button
                  type="button"
                  onClick={() => openDelete({ kind: "template", id: ct.id })}
                  disabled={busy}
                  aria-label={t("delete")}
                  className="shrink-0 cursor-pointer rounded-lg p-2 text-text-tertiary transition-colors hover:text-accent-negative"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Sets */}
        <div className="space-y-2">
          <SectionHeader
            label={t("sets")}
            action={`+ ${t("newSet")}`}
            onAction={openSetDialog}
          />
          {sets.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl bg-bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium text-text-primary">
                  {s.name}
                </div>
                <div className="text-[13px] text-text-secondary">
                  {t("reservoir")}: {s.reservoirTemplateName} / {t("screening")}
                  : {s.screeningTemplateName}
                </div>
              </div>
              {!s.isDefault && (
                <button
                  type="button"
                  onClick={() => openDelete({ kind: "set", id: s.id })}
                  disabled={busy}
                  aria-label={t("delete")}
                  className="shrink-0 cursor-pointer rounded-lg p-2 text-text-tertiary transition-colors hover:text-accent-negative"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={setOpen}
        onOpenChange={(open) => !savingSet && setSetOpen(open)}
      >
        <DialogContent className="bg-bg-primary">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-text-primary">
              {t("newSet")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label
                htmlFor="condition-set-name"
                className="text-[12px] font-semibold uppercase tracking-[1.5px] text-text-tertiary"
              >
                {t("setName")}
              </label>
              <Input
                id="condition-set-name"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="e.g. PEG + MPD Mix"
                className="h-10 rounded-xl border-border-default bg-bg-surface text-[14px]"
              />
            </div>
            <TemplateChips
              label={t("reservoir")}
              templates={templates}
              value={reservoirId}
              onChange={setReservoirId}
            />
            <TemplateChips
              label={t("screening")}
              templates={templates}
              value={screeningId}
              onChange={setScreeningId}
            />
            {dialogError && (
              <div className="rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
                {dialogError}
              </div>
            )}
            <Button
              type="button"
              className="h-10 w-full rounded-xl text-[14px] font-semibold"
              onClick={handleSaveSet}
              disabled={
                savingSet || !newSetName.trim() || !reservoirId || !screeningId
              }
            >
              {savingSet ? t("saving") : t("registerSet")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          deleteTarget?.kind === "template"
            ? t("deleteTemplateConfirmTitle")
            : t("deleteSetConfirmTitle")
        }
        description={
          deleteTarget?.kind === "template"
            ? t("deleteTemplateConfirmBody").replace(
                "{count}",
                String(affectedSetCount)
              )
            : t("deleteSetConfirmBody")
        }
        confirmLabel={t("delete")}
        pendingLabel={t("deleting")}
        pending={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
