"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FlaskConical,
  Beaker,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";
import { WellGrid } from "@/components/well-grid";
import { WellSheet } from "@/components/well-sheet";
import { PlateNotes } from "@/components/plate-notes";
import { PlateSamples } from "@/components/plate-samples";
import { PlateEditForm } from "@/components/plate-edit-form";
import { PlateTrashBanner } from "@/components/plate-trash-banner";
import { PlateQrCode } from "@/components/plate-qr-code";
import { useTranslation } from "@/components/locale-provider";
import type { SampleStyle } from "@/lib/samples";
import type { PlateLayout, WellData } from "@/types";

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
    reservoirTemplateId: number | null;
    screeningTemplateId: number | null;
    plateType: {
      name: string;
      rows: number;
      cols: number;
      maxDrops: number;
      layout: PlateLayout;
    };
    wells: WellData[];
    setupDate: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  conditionTemplates: { id: number; name: string; description: string }[];
  sampleStyles: Record<string, SampleStyle>;
  reservoirConditionMap?: Record<string, WellCondition>;
  screeningConditionMap?: Record<string, WellCondition>;
}

export function PlateDetailClient({
  plate,
  conditionTemplates,
  sampleStyles,
  reservoirConditionMap = {},
  screeningConditionMap = {},
}: PlateDetailClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(false);
  // ウェルそのものではなく ID を持つ。router.refresh() 後の新しい props から引き直すため
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // 開くたびに増やしてシートを作り直す。同じウェルを開き直しても前回の入力を残さない
  const [sheetKey, setSheetKey] = useState(0);
  const selectedWell = plate.wells.find((w) => w.id === selectedWellId);
  const isTrashed = plate.deletedAt !== null;

  const handleWellClick = (well: WellData) => {
    setSelectedWellId(well.id ?? null);
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
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
            // 閉じるときはキャンセルと同じく入力途中の値を捨てる（フォームごと消える）
            onClick={() => setEditMode(!editMode)}
            aria-label={t("edit")}
          >
            <Pencil className="size-5" />
          </Button>
        )}
      </div>

      <div className="space-y-6 px-6">
        {isTrashed && <PlateTrashBanner plateId={plate.id} />}

        {/* Well Map */}
        <div>
          <SectionHeader label={t("wellMap")} />
          <div className="mt-3 rounded-xl bg-bg-surface">
            <WellGrid
              rows={plate.plateType.rows}
              cols={plate.plateType.cols}
              layout={plate.plateType.layout}
              maxDrops={plate.plateType.maxDrops}
              wells={plate.wells}
              onWellClick={handleWellClick}
            />
          </div>
        </div>

        {/* Edit Mode（鉛筆を隠すだけでなく、ここでもゴミ箱なら出さない） */}
        {editMode && !isTrashed && (
          <PlateEditForm
            plate={plate}
            conditionTemplates={conditionTemplates}
            onClose={() => setEditMode(false)}
          />
        )}

        <PlateSamples
          wells={plate.wells}
          sampleStyles={sampleStyles}
          readOnly={isTrashed}
        />

        {/* メモは編集モードでなくても見えて、その場で書き換えられる */}
        <PlateNotes
          plateId={plate.id}
          notes={plate.notes}
          readOnly={isTrashed}
        />

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
              title={t("setupDate")}
              description={plate.setupDate}
            />
            <ListRow
              icon={Clock}
              title={t("updated")}
              description={plate.updatedAt}
            />
          </div>
        </div>

        <PlateQrCode plateId={plate.id} plateName={plate.name} />
      </div>

      {/* ウェルを押したあとにだけ描く（観察日の初期値を利用者の端末の日付で決めるため） */}
      {selectedWell && (
        <WellSheet
          key={sheetKey}
          well={selectedWell}
          layout={plate.plateType.layout}
          maxDrops={plate.plateType.maxDrops}
          reservoirCondition={reservoirConditionMap[selectedWell.position]}
          screeningCondition={screeningConditionMap[selectedWell.position]}
          readOnly={isTrashed}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
