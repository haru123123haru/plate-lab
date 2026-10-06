"use client";

import { TestTubes, Calendar, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SampleChip } from "@/components/sample-chip";
import { useTranslation } from "@/components/locale-provider";
import { DEFAULT_SAMPLE_STYLE, type SampleStyle } from "@/lib/samples";

interface PlateCardPlate {
  id: string;
  name: string;
  plateType: { name: string };
  filledWells: number;
  totalWells: number;
  // "YYYY-MM-DD"
  setupDate: string;
  // サンプル画面だけが渡す
  samples?: { names: string[]; dropCount: number };
}

interface PlateCardProps {
  plate: PlateCardPlate;
  // 見た目を変えたサンプルだけの対応表（getSampleStyles）。無い名前は既定の見た目
  sampleStyles?: Record<string, SampleStyle>;
  onClick?: () => void;
}

export function PlateCard({ plate, sampleStyles, onClick }: PlateCardProps) {
  const { t } = useTranslation();
  // Date に読み直すと UTC の0時になり、UTC より西の端末で前日に見えるので文字列のまま出す
  const dateStr = plate.setupDate.replaceAll("-", "/");

  return (
    <Card
      className="cursor-pointer gap-0 border-none bg-bg-surface p-4 shadow-none transition-colors active:bg-border-subtle"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-text-primary">
            {plate.name}
          </span>
          <Badge variant="secondary" className="text-[11px]">
            {plate.plateType.name}
          </Badge>
        </div>
        <ChevronRight className="size-5 text-text-tertiary" />
      </div>
      <div className="mt-3 flex items-center gap-4 text-[13px] text-text-secondary">
        <div className="flex items-center gap-1">
          <TestTubes className="size-4" />
          <span>
            {plate.filledWells} / {plate.totalWells}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="size-4" />
          <span>{dateStr}</span>
        </div>
      </div>
      {plate.samples && plate.samples.dropCount > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-text-secondary">
          {plate.samples.names.map((name) => (
            <SampleChip
              key={name}
              name={name}
              style={sampleStyles?.[name] ?? DEFAULT_SAMPLE_STYLE}
            />
          ))}
          <span>
            {plate.samples.dropCount} {t("drops")}
          </span>
        </div>
      )}
    </Card>
  );
}
