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
