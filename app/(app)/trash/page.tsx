import { getTrashedPlates } from "@/lib/actions/plates";
import { TrashClient } from "./trash-client";
import { toTokyoDate } from "@/lib/utils";

export default async function TrashPage() {
  const plates = await getTrashedPlates();

  const uiPlates = plates.map((p) => ({
    id: p.id,
    name: p.name,
    plateTypeName: p.plateType.name,
    // trashedPlateWhere で取っているので deletedAt は必ず入っている
    deletedAt: p.deletedAt ? toTokyoDate(p.deletedAt) : "",
  }));

  return <TrashClient plates={uiPlates} />;
}
