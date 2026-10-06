"use client";

import { useId } from "react";
import {
  SAMPLE_COLOR_CLASSES,
  SAMPLE_ICON_COMPONENTS,
} from "@/components/sample-chip";
import { useTranslation } from "@/components/locale-provider";
import {
  SAMPLE_COLORS,
  SAMPLE_ICONS,
  type SampleColor,
  type SampleIcon,
  type SampleStyle,
} from "@/lib/samples";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

const ICON_LABEL: Record<SampleIcon, TranslationKey> = {
  flask: "iconFlask",
  "test-tube": "iconTestTube",
  dna: "iconDna",
  atom: "iconAtom",
  microscope: "iconMicroscope",
  droplet: "iconDroplet",
  gem: "iconGem",
  leaf: "iconLeaf",
};

const COLOR_LABEL: Record<SampleColor, TranslationKey> = {
  gray: "colorGray",
  red: "colorRed",
  orange: "colorOrange",
  yellow: "colorYellow",
  green: "colorGreen",
  teal: "colorTeal",
  blue: "colorBlue",
  purple: "colorPurple",
};

const fieldLabel =
  "mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium";

interface SampleStylePickerProps {
  value: SampleStyle;
  onChange: (style: SampleStyle) => void;
}

// サンプルのアイコンと色を選ぶ。編集ダイアログと作成画面で使う
export function SampleStylePicker({ value, onChange }: SampleStylePickerProps) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="flex flex-col gap-7">
      <div>
        <div id={`${id}-icon`} className={fieldLabel}>
          {t("sampleIconLabel")}
        </div>
        <div
          role="group"
          aria-labelledby={`${id}-icon`}
          className="grid grid-cols-4 gap-2"
        >
          {SAMPLE_ICONS.map((key) => {
            const Icon = SAMPLE_ICON_COMPONENTS[key];
            return (
              <button
                type="button"
                key={key}
                aria-pressed={value.icon === key}
                aria-label={t(ICON_LABEL[key])}
                onClick={() => onChange({ ...value, icon: key })}
                className={cn(
                  "flex h-12 cursor-pointer items-center justify-center rounded-xl",
                  value.icon === key
                    ? "bg-text-primary text-bg-surface"
                    : "bg-bg-surface text-text-primary"
                )}
              >
                <Icon className="size-5" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div id={`${id}-color`} className={fieldLabel}>
          {t("sampleColorLabel")}
        </div>
        <div
          role="group"
          aria-labelledby={`${id}-color`}
          className="grid grid-cols-4 gap-2"
        >
          {SAMPLE_COLORS.map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={value.color === key}
              aria-label={t(COLOR_LABEL[key])}
              onClick={() => onChange({ ...value, color: key })}
              className={cn(
                "flex h-12 cursor-pointer items-center justify-center rounded-xl border-2",
                SAMPLE_COLOR_CLASSES[key],
                value.color === key
                  ? "border-border-strong"
                  : "border-transparent"
              )}
            >
              <span className="text-[13px] font-medium">
                {t(COLOR_LABEL[key])}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
