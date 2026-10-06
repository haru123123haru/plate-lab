"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { Prisma } from "../../generated/prisma/client";
import { importPlatesSchema } from "@/lib/validations";
import {
  accessibleConditionTemplateWhere,
  accessiblePlateTypeWhere,
} from "@/lib/access-control";
import type { ImportPlate } from "@/lib/plate-import";

// CSV から取り込むプレートを、全部まとめて作る。ブラウザの確認は表示のためなので、
// タイプとテンプレートの持ち主、ウェルと置き場所の範囲はここで確かめ直す
export async function importPlates(data: ImportPlate[]) {
  const userId = await getCurrentUserId();
  const parsed = importPlatesSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const plates = parsed.data;

  const plateTypeIds = [...new Set(plates.map((p) => p.plateTypeId))];
  const plateTypes = await prisma.plateType.findMany({
    where: {
      AND: [{ id: { in: plateTypeIds } }, accessiblePlateTypeWhere(userId)],
    },
    select: { id: true, rows: true, cols: true, maxDrops: true },
  });
  const plateTypeById = new Map(plateTypes.map((t) => [t.id, t]));
  if (plateTypeById.size !== plateTypeIds.length) {
    return { error: "Not found" };
  }

  const templateIds = [
    ...new Set(
      plates
        .flatMap((p) => [p.reservoirTemplateId, p.screeningTemplateId])
        .filter((id): id is number => id !== null)
    ),
  ];
  if (templateIds.length > 0) {
    const templates = await prisma.conditionTemplate.findMany({
      where: {
        AND: [
          { id: { in: templateIds } },
          accessibleConditionTemplateWhere(userId),
        ],
      },
      select: { id: true },
    });
    if (templates.length !== templateIds.length) {
      return { error: "Not found" };
    }
  }

  const rowLabels = "ABCDEFGH";
  const creates: Prisma.PlateCreateInput[] = [];
  for (const plate of plates) {
    // 上で全部そろっていることを確かめてある
    const { rows, cols, maxDrops } = plateTypeById.get(plate.plateTypeId)!;
    const dropsByPosition = new Map<string, typeof plate.drops>();
    for (const drop of plate.drops) {
      if (drop.slot > maxDrops) return { error: "Invalid slot" };
      dropsByPosition.set(drop.position, [
        ...(dropsByPosition.get(drop.position) ?? []),
        drop,
      ]);
    }

    const wells: Prisma.WellCreateWithoutPlateInput[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const position = `${rowLabels[r]}${c + 1}`;
        const drops = dropsByPosition.get(position);
        dropsByPosition.delete(position);
        wells.push({
          position,
          row: r,
          col: c,
          drops: drops && {
            create: drops.map((drop) => ({
              slot: drop.slot,
              sampleName: drop.sampleName,
              concentration: drop.concentration,
              notes: drop.notes,
              observations: {
                create: drop.observations.map((o) => ({
                  observedAt: new Date(`${o.observedAt}T00:00:00Z`),
                  notes: o.notes,
                  mark: o.mark,
                })),
              },
            })),
          },
        });
      }
    }
    // 残った位置はこのプレートの範囲の外
    if (dropsByPosition.size > 0) return { error: "Invalid well position" };

    creates.push({
      name: plate.name,
      plateType: { connect: { id: plate.plateTypeId } },
      reservoirTemplate:
        plate.reservoirTemplateId === null
          ? undefined
          : { connect: { id: plate.reservoirTemplateId } },
      screeningTemplate:
        plate.screeningTemplateId === null
          ? undefined
          : { connect: { id: plate.screeningTemplateId } },
      notes: plate.notes,
      setupDate: new Date(`${plate.setupDate}T00:00:00Z`),
      user: { connect: { id: userId } },
      wells: { create: wells },
    });
  }

  // 途中で失敗したら何も入れない。96 Well を数十枚作ると既定の5秒では足りない
  await prisma.$transaction(
    async (tx) => {
      for (const data of creates) {
        await tx.plate.create({ data, select: { id: true } });
      }
    },
    { timeout: 30_000 }
  );
  return { count: creates.length };
}
