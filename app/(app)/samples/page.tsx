import { getPlates } from "@/lib/actions/plates";
import { getPlateTypes } from "@/lib/actions/plate-types";
import { getConditionTemplates, getConditionSets } from "@/lib/actions/condition-templates";
import { SamplesClient } from "./samples-client";

export default async function SamplesPage() {
  const [plates, plateTypes, conditionTemplates, conditionSets] = await Promise.all([
    getPlates(),
    getPlateTypes(),
    getConditionTemplates(),
    getConditionSets(),
  ]);

  const uiPlates = plates.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status.toLowerCase() as "active" | "archived",
    plateType: {
      name: p.plateType.name,
      wellCount: p.plateType.wellCount,
    },
    filledWells: p.wells.filter((w) => w.status !== "EMPTY").length,
    totalWells: p.wells.length,
    createdAt: p.createdAt.toISOString().split("T")[0],
  }));

  const uiPlateTypes = plateTypes.map((pt) => ({
    id: pt.id,
    name: pt.name,
    wellCount: pt.wellCount,
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
