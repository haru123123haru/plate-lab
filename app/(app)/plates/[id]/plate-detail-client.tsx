"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FlaskConical,
  Beaker,
  Calendar,
  Clock,
  Download,
  Trash2,
} from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";
import { WellGrid } from "@/components/well-grid";
import { WellGrid24 } from "@/components/well-grid-24";
import { WellDetailModal } from "@/components/well-detail-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deletePlate, restorePlate, updatePlate } from "@/lib/actions/plates";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/locale-provider";
import type { WellData } from "@/types";

export type WellCondition = {
  salt: string;
  precipitant: string;
  polyamine: string;
  buffer: string;
};

interface PlateDetailClientProps {
  plate: {
    id: string;
    name: string;
    notes?: string;
    sampleName?: string;
    reservoirTemplateId: number | null;
    screeningTemplateId: number | null;
    plateType: { name: string; wellCount: number; rows: number; cols: number };
    wells: WellData[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  conditionTemplates: { id: number; name: string; description: string }[];
  reservoirConditionMap?: Record<string, WellCondition>;
  screeningConditionMap?: Record<string, WellCondition>;
}

export function PlateDetailClient({
  plate,
  conditionTemplates,
  reservoirConditionMap = {},
  screeningConditionMap = {},
}: PlateDetailClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(plate.name);
  const [editNotes, setEditNotes] = useState(plate.notes ?? "");
  const [editSampleName, setEditSampleName] = useState(plate.sampleName ?? "");
  const [editReservoirTemplateId, setEditReservoirTemplateId] = useState<
    number | null
  >(plate.reservoirTemplateId);
  const [editScreeningTemplateId, setEditScreeningTemplateId] = useState<
    number | null
  >(plate.screeningTemplateId);
  const [selectedWell, setSelectedWell] = useState<WellData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const isTrashed = plate.deletedAt !== null;
  const qrRef = useRef<HTMLDivElement>(null);
  const [qrUrl, setQrUrl] = useState(`/plates/${plate.id}`);

  useEffect(() => {
    setQrUrl(`${window.location.origin}/plates/${plate.id}`);
  }, [plate.id]);

  const handleDownloadQR = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = `${plate.name}-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  }, [plate.name]);

  const handleWellClick = (well: WellData) => {
    setSelectedWell(well);
    setModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditName(plate.name);
    setEditNotes(plate.notes ?? "");
    setEditSampleName(plate.sampleName ?? "");
    setEditReservoirTemplateId(plate.reservoirTemplateId);
    setEditScreeningTemplateId(plate.screeningTemplateId);
    setError("");
    setEditMode(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await updatePlate(plate.id, {
        name: editName,
        notes: editNotes || undefined,
        sampleName: editSampleName || null,
        reservoirTemplateId: editReservoirTemplateId,
        screeningTemplateId: editScreeningTemplateId,
      });
      if (result && "error" in result) {
        setError(t("saveChanges") + ": Unable to save changes.");
        return;
      }
      setEditMode(false);
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

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    setRestoreError("");
    try {
      const result = await restorePlate(plate.id);
      if ("error" in result) {
        setRestoreError(t("actionFailed"));
        return;
      }
      router.refresh();
    } catch {
      setRestoreError(t("actionFailed"));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="bg-bg-primary min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="cursor-pointer"
            aria-label={t("back")}
          >
            <ArrowLeft className="size-6 text-text-primary" />
          </button>
          <h1 className="text-[20px] font-bold text-text-primary">
            {plate.name}
          </h1>
        </div>
        {/* ゴミ箱のプレートは閲覧のみ */}
        {!isTrashed && (
          <Button
            type="button"
            variant={editMode ? "default" : "ghost"}
            size="icon"
            onClick={() => setEditMode(!editMode)}
            aria-label={t("edit")}
          >
            <Pencil className="size-5" />
          </Button>
        )}
      </div>

      <div className="space-y-6 px-6">
        {isTrashed && (
          <div className="rounded-xl bg-accent-negative/10 p-4">
            <div className="flex items-center gap-2 text-[14px] font-medium text-accent-negative">
              <Trash2 className="size-4" />
              {t("inTrashBanner")}
            </div>
            {restoreError && (
              <p className="mt-2 text-[13px] text-accent-negative">
                {restoreError}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10 w-full rounded-xl bg-bg-surface"
              onClick={handleRestore}
              disabled={restoring}
            >
              {restoring ? t("restoring") : t("restore")}
            </Button>
          </div>
        )}

        {/* Well Map */}
        <div>
          <SectionHeader label={t("wellMap")} />
          <div className="mt-3 rounded-xl bg-bg-surface">
            {/* グリッドを1つにまとめるまでは 4×6 だけ 24 用で描く */}
            {plate.plateType.rows === 4 && plate.plateType.cols === 6 ? (
              <WellGrid24 wells={plate.wells} onWellClick={handleWellClick} />
            ) : (
              <WellGrid wells={plate.wells} onWellClick={handleWellClick} />
            )}
          </div>
        </div>

        {/* Edit Mode（鉛筆を隠すだけでなく、ここでもゴミ箱なら出さない） */}
        {editMode && !isTrashed && (
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

            {/* Sample Name */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                {t("sampleNameLabel")}
              </label>
              <Input
                value={editSampleName}
                onChange={(e) => setEditSampleName(e.target.value)}
                placeholder="e.g. Lysozyme"
                className="h-12 rounded-xl border-border-default bg-bg-primary text-[15px]"
              />
            </div>

            {/* Reservoir Template */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                {t("reservoir")}
              </label>
              <div className="space-y-2">
                {conditionTemplates.map((ct) => (
                  <button
                    type="button"
                    key={ct.id}
                    onClick={() => setEditReservoirTemplateId(ct.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-primary p-3 text-left"
                  >
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full",
                        editReservoirTemplateId === ct.id
                          ? "bg-text-primary"
                          : "border-2 border-border-default"
                      )}
                    >
                      {editReservoirTemplateId === ct.id && (
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

            {/* Screening Template */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                {t("screening")}
              </label>
              <div className="space-y-2">
                {conditionTemplates.map((ct) => (
                  <button
                    type="button"
                    key={ct.id}
                    onClick={() => setEditScreeningTemplateId(ct.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-primary p-3 text-left"
                  >
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full",
                        editScreeningTemplateId === ct.id
                          ? "bg-text-primary"
                          : "border-2 border-border-default"
                      )}
                    >
                      {editScreeningTemplateId === ct.id && (
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

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                {t("notes")}
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border-default bg-bg-primary p-4 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={handleCancelEdit}
              >
                {t("cancel")}
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl"
                onClick={handleSave}
                disabled={saving}
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
          </div>
        )}

        {/* Plate Details */}
        <div>
          <SectionHeader label={t("plateDetails")} />
          <div className="mt-3">
            <ListRow
              icon={FlaskConical}
              title={t("type")}
              description={plate.plateType.name}
            />
            <ListRow
              icon={FlaskConical}
              title={t("sample")}
              description={plate.sampleName ?? "-"}
            />
            <ListRow
              icon={Beaker}
              title={t("reservoir")}
              description={
                conditionTemplates.find(
                  (ct) => ct.id === plate.reservoirTemplateId
                )?.name ?? "-"
              }
            />
            <ListRow
              icon={Beaker}
              title={t("screening")}
              description={
                conditionTemplates.find(
                  (ct) => ct.id === plate.screeningTemplateId
                )?.name ?? "-"
              }
            />
            <ListRow
              icon={Calendar}
              title={t("created")}
              description={plate.createdAt}
            />
            <ListRow
              icon={Clock}
              title={t("updated")}
              description={plate.updatedAt}
            />
          </div>
        </div>

        {/* QR Code */}
        <div>
          <SectionHeader label={t("qrCode")} />
          <div className="mt-3 rounded-xl bg-bg-surface p-6">
            <div ref={qrRef} className="flex justify-center">
              <QRCode
                value={qrUrl}
                size={128}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            <button
              type="button"
              onClick={handleDownloadQR}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-primary py-2.5 text-[14px] font-medium text-text-primary transition-colors hover:bg-border-subtle"
            >
              <Download className="size-4" />
              {t("downloadQr")}
            </button>
          </div>
        </div>
      </div>

      {/* Well Detail Modal */}
      <WellDetailModal
        well={selectedWell}
        reservoirCondition={
          selectedWell
            ? reservoirConditionMap[selectedWell.position]
            : undefined
        }
        screeningCondition={
          selectedWell
            ? screeningConditionMap[selectedWell.position]
            : undefined
        }
        sampleName={plate.sampleName}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />

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
