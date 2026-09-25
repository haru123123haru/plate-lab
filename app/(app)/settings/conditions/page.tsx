import {
  getConditionSets,
  getConditionTemplates,
} from "@/lib/actions/condition-templates";
import { ConditionsClient } from "./conditions-client";

export default async function ConditionsPage() {
  const [templates, sets] = await Promise.all([
    getConditionTemplates(),
    getConditionSets(),
  ]);

  return (
    <ConditionsClient
      templates={templates.map((ct) => ({
        id: ct.id,
        name: ct.name,
        isDefault: ct.isDefault,
      }))}
      sets={sets.map((cs) => ({
        id: cs.id,
        name: cs.name,
        isDefault: cs.isDefault,
        reservoirTemplateId: cs.reservoirTemplateId,
        screeningTemplateId: cs.screeningTemplateId,
        reservoirTemplateName: cs.reservoirTemplate.name,
        screeningTemplateName: cs.screeningTemplate.name,
      }))}
    />
  );
}
