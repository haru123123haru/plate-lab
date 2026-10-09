// プレートの一覧（ホームとサンプル画面）の並べ方。先頭が既定値
export const PLATE_SORTS = ["updated", "setupNewest", "setupOldest"] as const;
export type PlateSort = (typeof PLATE_SORTS)[number];

export function isPlateSort(value: unknown): value is PlateSort {
  return (PLATE_SORTS as readonly unknown[]).includes(value);
}

type SortablePlate = {
  // "YYYY-MM-DD"
  setupDate: string;
  // ISO 8601（UTC）
  updatedAt: string;
  // 検索で、部分一致ではなく似ているだけで見つかったもの
  similar?: boolean;
};

// 検索で似ているだけのプレートは、部分一致のプレートのあとに置く。既定の並べ方では、その中を
// 渡した順（searchPlates が付けた似ている順）のままにし、仕込み日で並べるときだけ仕込み日の順にする。
// 同じ仕込み日のあいだは、更新が新しい順。文字列はどちらも辞書順が時間順になる
export function sortPlates<T extends SortablePlate>(
  plates: T[],
  sort: PlateSort
): T[] {
  const compareUpdated = (a: T, b: T) =>
    b.updatedAt < a.updatedAt ? -1 : b.updatedAt > a.updatedAt ? 1 : 0;
  const compareSetup = (a: T, b: T) =>
    a.setupDate < b.setupDate ? -1 : a.setupDate > b.setupDate ? 1 : 0;
  const compare = (a: T, b: T) => {
    if (sort === "setupNewest")
      return -compareSetup(a, b) || compareUpdated(a, b);
    if (sort === "setupOldest")
      return compareSetup(a, b) || compareUpdated(a, b);
    return compareUpdated(a, b);
  };
  const similar = plates.filter((plate) => plate.similar);
  return [
    ...plates.filter((plate) => !plate.similar).sort(compare),
    ...(sort === "updated" ? similar : similar.sort(compare)),
  ];
}
