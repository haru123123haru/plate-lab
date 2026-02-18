"use client";

import { TestTubes, Calendar, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Plate } from "@/types";

interface PlateCardProps {
  plate: Plate;
  onEdit?: () => void;
}

const statusDotColor: Record<Plate["status"], string> = {
  active: "bg-accent-positive",
  completed: "bg-text-secondary",
  archived: "bg-text-tertiary",
};

export function PlateCard({ plate, onEdit }: PlateCardProps) {
  const dateStr = new Date(plate.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <Card className="gap-0 border-none bg-bg-surface p-4 shadow-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-text-primary">
            {plate.name}
          </span>
          <Badge variant="secondary" className="text-[11px]">
            {plate.plateType.name}
          </Badge>
        </div>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
        )}
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
          className={cn("ml-auto size-2 rounded-full", statusDotColor[plate.status])}
        />
      </div>
    </Card>
  );
}
