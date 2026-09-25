import { getPlateTypes } from "@/lib/actions/plate-types";
import { PlateTypesClient } from "./plate-types-client";

export default async function PlateTypesPage() {
  const plateTypes = await getPlateTypes();

  return (
    <PlateTypesClient
      plateTypes={plateTypes.map((pt) => ({
        id: pt.id,
        name: pt.name,
        rows: pt.rows,
        cols: pt.cols,
        maxDrops: pt.maxDrops,
        layout: pt.layout,
        isDefault: pt.isDefault,
      }))}
    />
  );
}
