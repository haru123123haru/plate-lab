// 「使用中のウェル」はドロップが1つ以上あるウェル。一覧・検索・サンプル画面で同じ数え方をする
export function countUsedWells(wells: { _count: { drops: number } }[]) {
  return wells.filter((well) => well._count.drops > 0).length;
}
