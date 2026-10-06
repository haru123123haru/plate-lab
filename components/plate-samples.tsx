"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { SampleChip } from "@/components/sample-chip";
import { SampleEditDialog } from "@/components/sample-edit-dialog";
import { useTranslation } from "@/components/locale-provider";
import { DEFAULT_SAMPLE_STYLE, type SampleStyle } from "@/lib/samples";
import type { WellData } from "@/types";

interface PlateSamplesProps {
  wells: WellData[];
  // 見た目を変えたサンプルだけの対応表（getSampleStyles）。無い名前は既定の見た目
  sampleStyles: Record<string, SampleStyle>;
  readOnly: boolean;
}

// このプレートに入っているサンプルと、そのドロップ数。押すと見た目を変えられる
export function PlateSamples({
  wells,
  sampleStyles,
  readOnly,
}: PlateSamplesProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [editTarget, setEditTarget] = useState<{
    name: string;
    style: SampleStyle;
  } | null>(null);
  const [refreshing, startRefresh] = useTransition();

  // 出てきた順に並べる（ウェルは行・列の順で届く）
  const counts = new Map<string, number>();
  for (const well of wells) {
    for (const drop of well.drops) {
      counts.set(drop.sampleName, (counts.get(drop.sampleName) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return null;

  return (
    <div>
      <SectionHeader label={t("samples")} />
      <div className="mt-3 space-y-2">
        {[...counts].map(([name, dropCount]) => {
          const style = sampleStyles[name] ?? DEFAULT_SAMPLE_STYLE;
          const content = (
            <>
              <div className="min-w-0 flex-1">
                <SampleChip name={name} style={style} />
              </div>
              <span className="shrink-0 text-[13px] text-text-secondary">
                {dropCount} {t("drops")}
              </span>
            </>
          );
          return readOnly ? (
            <div
              key={name}
              className="flex items-center gap-3 rounded-xl bg-bg-surface p-4"
            >
              {content}
            </div>
          ) : (
            <button
              type="button"
              key={name}
              onClick={() => setEditTarget({ name, style })}
              disabled={refreshing}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-surface p-4 text-left"
            >
              {content}
              <ChevronRight className="size-5 shrink-0 text-text-tertiary" />
            </button>
          );
        })}
      </div>

      <SampleEditDialog
        sample={editTarget}
        renameable={false}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={() => startRefresh(() => router.refresh())}
      />
    </div>
  );
}
