import type { CrystalMark, PlateLayout } from "@/types";

// 「使用中のウェル」はドロップが1つ以上あるウェル。一覧・検索・サンプル画面で同じ数え方をする
export function countUsedWells(wells: { _count: { drops: number } }[]) {
  return wells.filter((well) => well._count.drops > 0).length;
}

// プレートに入っているサンプル名（重複なし、出てきた順）とドロップ数
export function summarizeSamples(wells: { drops: { sampleName: string }[] }[]) {
  const drops = wells.flatMap((well) => well.drops);
  return {
    names: [...new Set(drops.map((drop) => drop.sampleName))],
    dropCount: drops.length,
  };
}

const MARK_RANK: Record<CrystalMark, number> = {
  POSSIBLE: 1,
  CRYSTAL: 2,
  HARVESTED: 3,
};

// 観察の中でいちばん良い目印。一度でも結晶が出たら、あとの観察で印が無くても残す
export function bestMark(observations: { mark: CrystalMark | null }[]) {
  let best: CrystalMark | null = null;
  for (const { mark } of observations) {
    if (mark && (!best || MARK_RANK[mark] > MARK_RANK[best])) best = mark;
  }
  return best;
}

// プレートタイプの描き方とドロップ数（例: 「Sitting · 4 drops」）
export function plateShapeLabel(
  t: (key: "sitting" | "hanging" | "drop" | "drops") => string,
  layout: PlateLayout,
  maxDrops: number
) {
  return `${t(layout === "SITTING" ? "sitting" : "hanging")} · ${maxDrops} ${t(maxDrops === 1 ? "drop" : "drops")}`;
}
