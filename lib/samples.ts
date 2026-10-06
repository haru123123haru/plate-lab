// サンプルの見た目の候補。先頭が既定値（見た目を変えていないサンプル）
export const SAMPLE_ICONS = [
  "flask",
  "test-tube",
  "dna",
  "atom",
  "microscope",
  "droplet",
  "gem",
  "leaf",
] as const;

export const SAMPLE_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
] as const;

export type SampleIcon = (typeof SAMPLE_ICONS)[number];
export type SampleColor = (typeof SAMPLE_COLORS)[number];
export type SampleStyle = { icon: SampleIcon; color: SampleColor };

export const DEFAULT_SAMPLE_STYLE: SampleStyle = {
  icon: SAMPLE_ICONS[0],
  color: SAMPLE_COLORS[0],
};

// DB の値は文字列なので、候補に無い値（あとで候補から外したものなど）は既定値にする
export function toSampleStyle(
  row: { icon: string; color: string } | null | undefined
): SampleStyle {
  return {
    icon: (SAMPLE_ICONS as readonly string[]).includes(row?.icon ?? "")
      ? (row!.icon as SampleIcon)
      : DEFAULT_SAMPLE_STYLE.icon,
    color: (SAMPLE_COLORS as readonly string[]).includes(row?.color ?? "")
      ? (row!.color as SampleColor)
      : DEFAULT_SAMPLE_STYLE.color,
  };
}

// 名前の揺れを見つけるためのキー。全角半角・大文字小文字・空白と区切り記号の違いをそろえる。
// 綴りの違いは拾わない（似ている度合いで拾うと、別のサンプルまで同じとみなしてしまう）
export function sampleNameKey(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_.]+/g, "");
}

// キーが同じ名前が2つ以上あるグループ。グループの中はドロップの多い順で、それ以外は渡した順を保つ。
// サーバーとブラウザの両方で描くので、ロケールで変わる比較（localeCompare）は使わない
export function findSampleDuplicates<
  T extends { name: string; dropCount: number },
>(samples: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const sample of samples) {
    const key = sampleNameKey(sample.name);
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => [...group].sort((a, b) => b.dropCount - a.dropCount));
}
