"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SampleChip } from "@/components/sample-chip";
import { SampleEditDialog } from "@/components/sample-edit-dialog";
import { useTranslation } from "@/components/locale-provider";
import type { SampleStyle } from "@/lib/samples";

interface SamplesSettingsClientProps {
  samples: { name: string; dropCount: number; style: SampleStyle }[];
}

export function SamplesSettingsClient({ samples }: SamplesSettingsClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [editTarget, setEditTarget] = useState<{
    name: string;
    style: SampleStyle;
  } | null>(null);
  // 一覧の再取得中。終わるまで古い名前の行を押させない
  const [refreshing, startRefresh] = useTransition();

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

      <div className="space-y-2 px-6">
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
    </div>
  );
}
