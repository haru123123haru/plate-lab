"use client";

import { TestTubes, Calendar, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlateCardPlate {
  id: string;
  name: string;
  status: "active" | "archived";
  plateType: { name: string };
  filledWells: number;
  totalWells: number;
  createdAt: string;
}

interface PlateCardProps {
  plate: PlateCardPlate;
  onClick?: () => void;
}

const statusDotColor: Record<PlateCardPlate["status"], string> = {
  active: "bg-accent-positive",
  archived: "bg-text-tertiary",
};

export function PlateCard({ plate, onClick }: PlateCardProps) {
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
        <div
          className={cn(
            "ml-auto size-2 rounded-full",
            statusDotColor[plate.status]
          )}
        />
      </div>
    </Card>
  );
}
