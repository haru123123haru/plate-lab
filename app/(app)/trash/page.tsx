import { getTrashedPlates } from "@/lib/actions/plates";
import { TrashClient } from "./trash-client";

export default async function TrashPage() {
  const plates = await getTrashedPlates();

  const uiPlates = plates.map((p) => ({
    id: p.id,
    name: p.name,
    plateTypeName: p.plateType.name,
    // trashedPlateWhere で取っているので deletedAt は必ず入っている
    deletedAt: p.deletedAt?.toISOString().split("T")[0] ?? "",
  }));

  return <TrashClient plates={uiPlates} />;
}
