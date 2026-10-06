"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  SAMPLE_COLOR_CLASSES,
  SAMPLE_ICON_COMPONENTS,
  SampleChip,
} from "@/components/sample-chip";
import { useTranslation } from "@/components/locale-provider";
import { updateSample } from "@/lib/actions/samples";
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

interface SampleEditDialogProps {
  // 閉じているときは null
  sample: { name: string; style: SampleStyle } | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SampleEditDialog({
  sample,
  onOpenChange,
  onSaved,
}: SampleEditDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<SampleIcon>(SAMPLE_ICONS[0]);
  const [color, setColor] = useState<SampleColor>(SAMPLE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // まとめる確認で出す、名前が変わるドロップの数
  const [mergeCount, setMergeCount] = useState<number | null>(null);

  useEffect(() => {
    if (!sample) return;
    setName(sample.name);
    setIcon(sample.style.icon);
    setColor(sample.style.color);
    setError("");
    setMergeCount(null);
  }, [sample]);

  const save = async (merge: boolean) => {
    if (!sample || saving || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const result = await updateSample({
        name: sample.name,
        newName: name.trim(),
        icon,
        color,
        merge,
      });
      if ("needsMerge" in result) {
        setMergeCount(result.dropCount);
        return;
      }
      // 確認ダイアログは閉じる。開いたままだと、後ろの編集ダイアログのエラーが見えない
      setMergeCount(null);
      if ("error" in result) {
        setError(t("sampleSaveFailed"));
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch {
      setMergeCount(null);
      setError(t("sampleSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const mergeName = name.trim();

  return (
    <>
      <Dialog open={sample !== null} onOpenChange={onOpenChange}>
        <DialogContent className="bg-bg-primary">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-text-primary">
              {t("editSample")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-7">
            <div className="flex justify-center">
              <SampleChip
                name={mergeName || " "}
                style={{ icon, color }}
                className="text-[15px]"
              />
            </div>

            <div>
              <label htmlFor="sample-name" className={fieldLabel}>
                {t("sampleNameLabel")}
              </label>
              <Input
                id="sample-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                className="h-12 rounded-xl"
              />
            </div>

            <div>
              <div id="sample-icon-label" className={fieldLabel}>
                {t("sampleIconLabel")}
              </div>
              <div
                role="group"
                aria-labelledby="sample-icon-label"
                className="grid grid-cols-4 gap-2"
              >
                {SAMPLE_ICONS.map((key) => {
                  const Icon = SAMPLE_ICON_COMPONENTS[key];
                  return (
                    <button
                      type="button"
                      key={key}
                      aria-pressed={icon === key}
                      aria-label={t(ICON_LABEL[key])}
                      onClick={() => setIcon(key)}
                      className={cn(
                        "flex h-12 cursor-pointer items-center justify-center rounded-xl",
                        icon === key
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
              <div id="sample-color-label" className={fieldLabel}>
                {t("sampleColorLabel")}
              </div>
              <div
                role="group"
                aria-labelledby="sample-color-label"
                className="grid grid-cols-4 gap-2"
              >
                {SAMPLE_COLORS.map((key) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={color === key}
                    aria-label={t(COLOR_LABEL[key])}
                    onClick={() => setColor(key)}
                    className={cn(
                      "flex h-12 cursor-pointer items-center justify-center rounded-xl border-2",
                      SAMPLE_COLOR_CLASSES[key],
                      color === key
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

          <div className="mt-3">
            {error && (
              <div className="mb-3 rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
                {error}
              </div>
            )}
            <Button
              type="button"
              className="h-12 w-full rounded-xl"
              onClick={() => save(false)}
              disabled={saving || !mergeName}
            >
              {saving && mergeCount === null ? t("saving") : t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={mergeCount !== null}
        onOpenChange={(open) => !open && setMergeCount(null)}
        title={t("mergeSampleConfirmTitle").replaceAll("{name}", mergeName)}
        description={t("mergeSampleConfirmBody")
          .replaceAll("{name}", mergeName)
          .replace("{count}", String(mergeCount ?? 0))}
        confirmLabel={t("merge")}
        pendingLabel={t("merging")}
        pending={saving}
        onConfirm={() => save(true)}
      />
    </>
  );
}
