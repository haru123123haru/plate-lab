"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SampleChip } from "@/components/sample-chip";
import { SampleEditDialog } from "@/components/sample-edit-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/components/locale-provider";
import { mergeSamples } from "@/lib/actions/samples";
import { findSampleDuplicates, type SampleStyle } from "@/lib/samples";

type Sample = { name: string; dropCount: number; style: SampleStyle };

interface SamplesSettingsClientProps {
  samples: Sample[];
}

export function SamplesSettingsClient({ samples }: SamplesSettingsClientProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [editTarget, setEditTarget] = useState<{
    name: string;
    style: SampleStyle;
  } | null>(null);
  // 一覧の再取得中。終わるまで古い名前の行を押させない
  const [refreshing, startRefresh] = useTransition();
  const duplicates = useMemo(() => findSampleDuplicates(samples), [samples]);
  // 名前の揺れで、残す名前として押したもの
  const [mergeTarget, setMergeTarget] = useState<{
    into: Sample;
    from: Sample[];
  } | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");

  const merge = async () => {
    if (!mergeTarget || merging) return;
    setMerging(true);
    setMergeError("");
    try {
      const result = await mergeSamples({
        from: mergeTarget.from.map((sample) => sample.name),
        into: mergeTarget.into.name,
      });
      if ("error" in result) {
        setMergeError(t("sampleMergeFailed"));
      } else {
        startRefresh(() => router.refresh());
      }
    } catch {
      setMergeError(t("sampleMergeFailed"));
    } finally {
      setMerging(false);
      setMergeTarget(null);
    }
  };

  const quote = (name: string) =>
    locale === "ja" ? `「${name}」` : `“${name}”`;

  return (
    <div className="bg-bg-primary min-h-dvh pb-10">
      <div className="flex items-center gap-3 px-6 pt-14 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer"
          aria-label={t("back")}
        >
          <ArrowLeft className="size-6 text-text-primary" />
        </button>
        <h1 className="flex-1 text-[20px] font-bold text-text-primary">
          {t("samples")}
        </h1>
      </div>

      {duplicates.length > 0 && (
        <section className="mb-6 px-6">
          <h2 className="mb-1 text-[11px] font-medium tracking-[2px] text-text-secondary uppercase">
            {t("sampleDuplicates")}
          </h2>
          <p className="mb-3 text-[13px] text-text-secondary">
            {t("sampleDuplicatesHint")}
          </p>
          {mergeError && (
            <div className="mb-3 rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
              {mergeError}
            </div>
          )}
          <div className="space-y-2">
            {duplicates.map((group) => (
              <div
                key={group.map((sample) => sample.name).join("\n")}
                className="space-y-1 rounded-xl bg-bg-surface p-2"
              >
                {group.map((sample) => (
                  <button
                    type="button"
                    key={sample.name}
                    onClick={() =>
                      setMergeTarget({
                        into: sample,
                        from: group.filter((other) => other !== sample),
                      })
                    }
                    disabled={refreshing}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left hover:bg-bg-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <SampleChip name={sample.name} style={sample.style} />
                    </div>
                    <span className="shrink-0 text-[13px] text-text-secondary">
                      {sample.dropCount} {t("drops")}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-2 px-6">
        {duplicates.length > 0 && (
          <h2 className="text-[11px] font-medium tracking-[2px] text-text-secondary uppercase">
            {t("allSamples")}
          </h2>
        )}
        {samples.length === 0 && (
          <p className="py-8 text-center text-[14px] text-text-secondary">
            {t("noSamples")}
          </p>
        )}

        {samples.map((sample) => (
          <button
            type="button"
            key={sample.name}
            onClick={() =>
              setEditTarget({ name: sample.name, style: sample.style })
            }
            disabled={refreshing}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-surface p-4 text-left"
          >
            <div className="min-w-0 flex-1">
              <SampleChip name={sample.name} style={sample.style} />
            </div>
            <span className="shrink-0 text-[13px] text-text-secondary">
              {sample.dropCount} {t("drops")}
            </span>
            <ChevronRight className="size-5 shrink-0 text-text-tertiary" />
          </button>
        ))}
      </div>

      <SampleEditDialog
        sample={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={() => startRefresh(() => router.refresh())}
      />

      <ConfirmDialog
        open={mergeTarget !== null}
        onOpenChange={(open) => !open && setMergeTarget(null)}
        // 名前は関数で差し込む。文字列で渡すと、名前の中の $& などが置き換えの記号になる
        title={t("mergeSampleConfirmTitle").replaceAll(
          "{name}",
          () => mergeTarget?.into.name ?? ""
        )}
        description={t("mergeDuplicatesConfirmBody")
          .replaceAll("{name}", () => mergeTarget?.into.name ?? "")
          .replace("{others}", () =>
            (mergeTarget?.from ?? [])
              .map((sample) => quote(sample.name))
              .join(locale === "ja" ? "" : ", ")
          )
          .replace("{count}", () =>
            String(
              (mergeTarget?.from ?? []).reduce(
                (sum, sample) => sum + sample.dropCount,
                0
              )
            )
          )}
        confirmLabel={t("merge")}
        pendingLabel={t("merging")}
        pending={merging}
        onConfirm={merge}
      />
    </div>
  );
}
