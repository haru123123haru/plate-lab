import { searchPlates } from "@/lib/actions/plates";
import { countUsedWells, summarizeSamples } from "@/lib/wells";
import { getPlateTypes } from "@/lib/actions/plate-types";
import {
  getConditionTemplates,
  getConditionSets,
} from "@/lib/actions/condition-templates";
import { SamplesClient } from "./samples-client";

export default async function SamplesPage() {
  const [plates, plateTypes, conditionTemplates, conditionSets] =
    await Promise.all([
      // 空の検索は全件を返す。検索結果と同じ形（サンプル名つき）で最初の一覧を出すため
      searchPlates(""),
      getPlateTypes(),
      getConditionTemplates(),
      getConditionSets(),
    ]);

  const uiPlates = plates.map((p) => ({
    id: p.id,
    name: p.name,
    plateType: { name: p.plateType.name },
    filledWells: countUsedWells(p.wells),
    samples: summarizeSamples(p.wells),
    totalWells: p.wells.length,
    // setupDate は日付だけの列なので、UTC の日付として読む
    setupDate: p.setupDate.toISOString().slice(0, 10),
  }));

  const uiPlateTypes = plateTypes.map((pt) => ({
    id: pt.id,
    name: pt.name,
    rows: pt.rows,
    cols: pt.cols,
    maxDrops: pt.maxDrops,
    layout: pt.layout,
    description: pt.description ?? undefined,
  }));

  const uiConditionTemplates = conditionTemplates.map((ct) => ({
    id: ct.id,
    name: ct.name,
    description: ct.description,
  }));

  const uiConditionSets = conditionSets.map((cs) => ({
    id: cs.id,
    name: cs.name,
    isDefault: cs.isDefault,
    reservoirTemplateId: cs.reservoirTemplateId,
    screeningTemplateId: cs.screeningTemplateId,
    reservoirTemplateName: cs.reservoirTemplate.name,
    screeningTemplateName: cs.screeningTemplate.name,
  }));

  return (
    <SamplesClient
      plates={uiPlates}
      plateTypes={uiPlateTypes}
      conditionTemplates={uiConditionTemplates}
      conditionSets={uiConditionSets}
    />
  );
}
