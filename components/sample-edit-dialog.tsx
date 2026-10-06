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
import { SampleChip } from "@/components/sample-chip";
import { SampleStylePicker } from "@/components/sample-style-picker";
import { useTranslation } from "@/components/locale-provider";
import { updateSample } from "@/lib/actions/samples";
import { DEFAULT_SAMPLE_STYLE, type SampleStyle } from "@/lib/samples";

const fieldLabel =
  "mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium";

interface SampleEditDialogProps {
  // 閉じているときは null
  sample: { name: string; style: SampleStyle } | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  // false なら見た目だけを変える（プレート詳細から開いたとき）。名前の変更とまとめるのは管理ページで
  renameable?: boolean;
}

export function SampleEditDialog({
  sample,
  onOpenChange,
  onSaved,
  renameable = true,
}: SampleEditDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [style, setStyle] = useState<SampleStyle>(DEFAULT_SAMPLE_STYLE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // まとめる確認で出す、名前が変わるドロップの数
  const [mergeCount, setMergeCount] = useState<number | null>(null);

  useEffect(() => {
    if (!sample) return;
    setName(sample.name);
    setStyle(sample.style);
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
        icon: style.icon,
        color: style.color,
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
                style={style}
                className="text-[15px]"
              />
            </div>

            {renameable && (
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
            )}

            <SampleStylePicker value={style} onChange={setStyle} />
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
