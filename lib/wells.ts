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
