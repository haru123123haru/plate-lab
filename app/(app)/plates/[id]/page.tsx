import { getPlateById } from "@/lib/actions/plates";
import { getConditionTemplates } from "@/lib/actions/condition-templates";
import { PlateDetailClient } from "./plate-detail-client";
import type { WellData, WellStatus } from "@/types";

export type WellCondition = {
  salt: string;
  precipitant: string;
  polyamine: string;
  buffer: string;
};

export default async function PlateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plate = await getPlateById(id);

  if (!plate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <p className="text-[16px] text-text-secondary">Plate not found</p>
      </div>
    );
  }

  const conditionTemplates = await getConditionTemplates();

  const uiWells: WellData[] = plate.wells.map((w) => ({
    id: w.id,
    position: w.position,
    row: w.row,
    col: w.col,
    status: w.status.toLowerCase() as WellStatus,
    protein: w.protein ?? undefined,
    concentration: w.concentration ?? undefined,
    buffer: w.buffer ?? undefined,
    ph: w.ph ?? undefined,
    precipitant: w.precipitant ?? undefined,
    notes: w.notes ?? undefined,
    drops: w.drops.map((d) => ({
      id: d.id,
      slot: d.slot,
      sampleName: d.sampleName,
      concentration: d.concentration,
      notes: d.notes ?? undefined,
      observations: d.observations.map((o) => ({
        id: o.id,
        // observedAt は日付だけの列なので、UTC の日付として読む
        observedAt: o.observedAt.toISOString().slice(0, 10),
        notes: o.notes,
      })),
    })),
  }));

  // テンプレートウェルから position → 条件データ のマップを構築
  const reservoirConditionMap: Record<string, WellCondition> = {};
  if (plate.reservoirTemplate?.wells) {
    for (const tw of plate.reservoirTemplate.wells) {
      try {
        reservoirConditionMap[tw.position] = JSON.parse(tw.composition);
      } catch {
        // パース失敗はスキップ
      }
    }
  }

  const screeningConditionMap: Record<string, WellCondition> = {};
  if (plate.screeningTemplate?.wells) {
    for (const tw of plate.screeningTemplate.wells) {
      try {
        screeningConditionMap[tw.position] = JSON.parse(tw.composition);
      } catch {
        // パース失敗はスキップ
      }
    }
  }

  const uiPlate = {
    id: plate.id,
    name: plate.name,
    notes: plate.notes ?? undefined,
    reservoirTemplateId: plate.reservoirTemplate?.id ?? null,
    screeningTemplateId: plate.screeningTemplate?.id ?? null,
    plateType: {
      name: plate.plateType.name,
      wellCount: plate.plateType.wellCount,
      rows: plate.plateType.rows,
      cols: plate.plateType.cols,
      maxDrops: plate.plateType.maxDrops,
      layout: plate.plateType.layout,
    },
    wells: uiWells,
    createdAt: plate.createdAt.toISOString().split("T")[0],
    updatedAt: plate.updatedAt.toISOString().split("T")[0],
    deletedAt: plate.deletedAt?.toISOString() ?? null,
  };

  const uiConditionTemplates = conditionTemplates.map((ct) => ({
    id: ct.id,
    name: ct.name,
    description: ct.description ?? "",
  }));

  return (
    <PlateDetailClient
      plate={uiPlate}
      conditionTemplates={uiConditionTemplates}
      reservoirConditionMap={reservoirConditionMap}
      screeningConditionMap={screeningConditionMap}
    />
  );
}
