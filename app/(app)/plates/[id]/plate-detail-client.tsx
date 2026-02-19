"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FlaskConical,
  Activity,
  Beaker,
  Calendar,
  Clock,
  Download,
} from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";
import { WellGrid } from "@/components/well-grid";
import { WellGrid24 } from "@/components/well-grid-24";
import { WellDetailModal } from "@/components/well-detail-modal";
import { updatePlate } from "@/lib/actions/plates";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/locale-provider";
import type { WellData, PlateStatus } from "@/types";

const statusOptions: PlateStatus[] = ["active", "archived"];

const statusColor: Record<string, string> = {
  active: "bg-accent-positive",
  archived: "bg-text-tertiary",
};

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
    status: PlateStatus;
    notes?: string;
    sampleName?: string;
    reservoirTemplate?: string;
    screeningTemplate?: string;
    plateType: { name: string; wellCount: number };
    wells: WellData[];
    createdAt: string;
    updatedAt: string;
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
  const [editStatus, setEditStatus] = useState<PlateStatus>(plate.status);
  const [editSampleName, setEditSampleName] = useState(
    plate.sampleName ?? ""
  );
  const [editReservoirTemplate, setEditReservoirTemplate] = useState(
    plate.reservoirTemplate ?? ""
  );
  const [editScreeningTemplate, setEditScreeningTemplate] = useState(
    plate.screeningTemplate ?? ""
  );
  const [selectedWell, setSelectedWell] = useState<WellData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [plate.name]);

  const statusLabel: Record<string, string> = {
    active: t("active"),
    archived: t("archived"),
  };

  const handleWellClick = (well: WellData) => {
    setSelectedWell(well);
    setModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditName(plate.name);
    setEditNotes(plate.notes ?? "");
    setEditStatus(plate.status);
    setEditSampleName(plate.sampleName ?? "");
    setEditReservoirTemplate(plate.reservoirTemplate ?? "");
    setEditScreeningTemplate(plate.screeningTemplate ?? "");
    setEditMode(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const matchingReservoir = conditionTemplates.find(
      (ct) => ct.name === editReservoirTemplate
    );
    const matchingScreening = conditionTemplates.find(
      (ct) => ct.name === editScreeningTemplate
    );
    const statusChanged = editStatus !== plate.status;
    await updatePlate(plate.id, {
      name: editName,
      status: editStatus.toUpperCase() as "ACTIVE" | "ARCHIVED",
      notes: editNotes || undefined,
      sampleName: editSampleName || null,
      reservoirTemplateId: matchingReservoir?.id ?? null,
      screeningTemplateId: matchingScreening?.id ?? null,
    });
    setSaving(false);
    setEditMode(false);
    if (statusChanged) {
      router.push("/samples");
    } else {
      router.refresh();
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
          >
            <ArrowLeft className="size-6 text-text-primary" />
          </button>
          <h1 className="text-[20px] font-bold text-text-primary">
            {plate.name}
          </h1>
        </div>
        <Button
          variant={editMode ? "default" : "ghost"}
          size="icon"
          onClick={() => setEditMode(!editMode)}
        >
          <Pencil className="size-5" />
        </Button>
      </div>

      <div className="space-y-6 px-6">
        {/* Well Map */}
        <div>
          <SectionHeader label={t("wellMap")} />
          <div className="mt-3 rounded-xl bg-bg-surface">
            {plate.plateType.wellCount === 24 ? (
              <WellGrid24
                wells={plate.wells}
                onWellClick={handleWellClick}
              />
            ) : (
              <WellGrid
                wells={plate.wells}
                onWellClick={handleWellClick}
              />
            )}
          </div>
        </div>

        {/* Edit Mode */}
        {editMode && (
          <div className="space-y-4 rounded-xl bg-bg-surface p-4">
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

            {/* Status */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                {t("status")}
              </label>
              <div className="flex gap-2">
                {statusOptions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setEditStatus(s)}
                    className={cn(
                      "flex-1 cursor-pointer rounded-xl py-2.5 text-[14px] font-medium transition-colors",
                      editStatus === s
                        ? "bg-text-primary text-white"
                        : "border border-border-default bg-bg-primary text-text-secondary"
                    )}
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
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
                    onClick={() => setEditReservoirTemplate(ct.name)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-primary p-3 text-left"
                  >
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full",
                        editReservoirTemplate === ct.name
                          ? "bg-text-primary"
                          : "border-2 border-border-default"
                      )}
                    >
                      {editReservoirTemplate === ct.name && (
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
                    onClick={() => setEditScreeningTemplate(ct.name)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-primary p-3 text-left"
                  >
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full",
                        editScreeningTemplate === ct.name
                          ? "bg-text-primary"
                          : "border-2 border-border-default"
                      )}
                    >
                      {editScreeningTemplate === ct.name && (
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
            <div className="flex w-full items-center gap-3 border-b border-border-subtle py-3 text-left">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface">
                <Activity className="size-5 text-text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium text-text-primary">
                  {statusLabel[plate.status] ?? plate.status}
                </div>
                <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <span
                    className={cn(
                      "inline-block size-2 rounded-full",
                      statusColor[plate.status]
                    )}
                  />
                  <span>{statusLabel[plate.status]}</span>
                </div>
              </div>
            </div>
            <ListRow
              icon={FlaskConical}
              title={t("sample")}
              description={plate.sampleName ?? "-"}
            />
            <ListRow
              icon={Beaker}
              title={t("reservoir")}
              description={plate.reservoirTemplate ?? "-"}
            />
            <ListRow
              icon={Beaker}
              title={t("screening")}
              description={plate.screeningTemplate ?? "-"}
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
    </div>
  );
}
