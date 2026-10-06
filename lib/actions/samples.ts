"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { activePlateWhere } from "@/lib/access-control";
import { toSampleStyle, type SampleStyle } from "@/lib/samples";
import { updateSampleSchema } from "@/lib/validations";

// サンプルの一覧はドロップの名前から組み立て、Sample の行は見た目を重ねるためだけに使う。
// ゴミ箱のプレートにしか無いサンプルは出さない
export async function getSamples() {
  const userId = await getCurrentUserId();

  const [groups, rows] = await Promise.all([
    prisma.drop.groupBy({
      by: ["sampleName"],
      where: { well: { plate: activePlateWhere(userId) } },
      _count: { _all: true },
    }),
    prisma.sample.findMany({
      where: { userId },
      select: { name: true, icon: true, color: true },
    }),
  ]);

  const styles = new Map(rows.map((row) => [row.name, row]));
  return groups
    .map((group) => ({
      name: group.sampleName,
      dropCount: group._count._all,
      style: toSampleStyle(styles.get(group.sampleName)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// 見た目を変えたサンプルだけの対応表。無い名前は DEFAULT_SAMPLE_STYLE で出す
export async function getSampleStyles(): Promise<Record<string, SampleStyle>> {
  const userId = await getCurrentUserId();
  const rows = await prisma.sample.findMany({
    where: { userId },
    select: { name: true, icon: true, color: true },
  });
  return Object.fromEntries(rows.map((row) => [row.name, toSampleStyle(row)]));
}

// 見た目と名前をまとめて変える。名前を変えると、そのサンプルのドロップもすべて書き換える。
// 変更先の名前のサンプルがすでにあれば、merge が無い限り何も変えずに needsMerge を返す
export async function updateSample(data: {
  name: string;
  newName: string;
  icon: string;
  color: string;
  merge?: boolean;
}): Promise<
  | { success: true }
  | { needsMerge: true; dropCount: number }
  | { error: "Invalid input" }
> {
  const userId = await getCurrentUserId();
  const parsed = updateSampleSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };
  const { name, newName, icon, color, merge } = parsed.data;

  // ゴミ箱のプレートのドロップも書き換える（editableDropWhere を通さない、ここだけの例外）。
  // 外すと、復元したプレートだけ古い名前の別のサンプルになるため
  const ownDrops = (sampleName: string) => ({
    sampleName,
    well: { plate: { userId } },
  });

  return prisma.$transaction(async (tx) => {
    if (newName !== name) {
      // 変更先が「ある」とみなすのはドロップがあるときだけ。見た目の行だけ残った名前は
      // 一覧に出ないので、まとめずに選んだ見た目で上書きする
      const targetDrop = await tx.drop.findFirst({
        where: ownDrops(newName),
        select: { id: true },
      });
      const targetExists = targetDrop !== null;
      if (targetExists && !merge) {
        const dropCount = await tx.drop.count({ where: ownDrops(name) });
        return { needsMerge: true as const, dropCount };
      }

      await tx.drop.updateMany({
        where: ownDrops(name),
        data: { sampleName: newName },
      });
      await tx.sample.deleteMany({ where: { userId, name } });
      // まとめるときは、変更先の見た目をそのまま残す
      if (targetExists) return { success: true as const };
    }

    await tx.sample.upsert({
      where: { userId_name: { userId, name: newName } },
      create: { userId, name: newName, icon, color },
      update: { icon, color },
    });
    return { success: true as const };
  });
}
