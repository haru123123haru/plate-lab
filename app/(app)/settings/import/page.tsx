import { getPlateTypes } from "@/lib/actions/plate-types";
import { getConditionTemplates } from "@/lib/actions/condition-templates";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const [plateTypes, templates] = await Promise.all([
    getPlateTypes(),
    getConditionTemplates(),
  ]);

  return (
    <ImportClient
      catalog={{
        plateTypes: plateTypes.map((pt) => ({
          id: pt.id,
          name: pt.name,
          rows: pt.rows,
          cols: pt.cols,
          maxDrops: pt.maxDrops,
        })),
        templates: templates.map((ct) => ({ id: ct.id, name: ct.name })),
      }}
    />
  );
}
