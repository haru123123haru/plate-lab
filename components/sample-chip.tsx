import {
  Atom,
  Dna,
  Droplet,
  FlaskConical,
  Gem,
  Leaf,
  Microscope,
  TestTube,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SampleColor, SampleIcon, SampleStyle } from "@/lib/samples";

export const SAMPLE_ICON_COMPONENTS: Record<SampleIcon, LucideIcon> = {
  flask: FlaskConical,
  "test-tube": TestTube,
  dna: Dna,
  atom: Atom,
  microscope: Microscope,
  droplet: Droplet,
  gem: Gem,
  leaf: Leaf,
};

// 色は app/globals.css の --sample-<色>-bg / -fg。Tailwind が拾えるようにクラス名を書き切る
export const SAMPLE_COLOR_CLASSES: Record<SampleColor, string> = {
  gray: "bg-sample-gray-bg text-sample-gray-fg",
  red: "bg-sample-red-bg text-sample-red-fg",
  orange: "bg-sample-orange-bg text-sample-orange-fg",
  yellow: "bg-sample-yellow-bg text-sample-yellow-fg",
  green: "bg-sample-green-bg text-sample-green-fg",
  teal: "bg-sample-teal-bg text-sample-teal-fg",
  blue: "bg-sample-blue-bg text-sample-blue-fg",
  purple: "bg-sample-purple-bg text-sample-purple-fg",
};

interface SampleChipProps {
  name: string;
  style: SampleStyle;
  className?: string;
}

// サンプル名をアイコンと色のチップで出す
export function SampleChip({ name, style, className }: SampleChipProps) {
  const Icon = SAMPLE_ICON_COMPONENTS[style.icon];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium",
        SAMPLE_COLOR_CLASSES[style.color],
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}
