"use client";

import { TestTubes, Calendar, ChevronRight, FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/components/locale-provider";

interface PlateCardPlate {
  id: string;
  name: string;
  plateType: { name: string };
  filledWells: number;
  totalWells: number;
  createdAt: string;
  // サンプル画面だけが渡す
  samples?: { names: string[]; dropCount: number };
}

interface PlateCardProps {
  plate: PlateCardPlate;
  onClick?: () => void;
}

export function PlateCard({ plate, onClick }: PlateCardProps) {
  const { t } = useTranslation();
  const dateStr = new Date(plate.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

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
        <div className="mt-2 flex items-center gap-1 text-[13px] text-text-secondary">
          <FlaskConical className="size-4 shrink-0" />
          <span className="truncate">
            {plate.samples.names.join(", ")} · {plate.samples.dropCount}{" "}
            {t("drops")}
          </span>
        </div>
      )}
    </Card>
  );
}
