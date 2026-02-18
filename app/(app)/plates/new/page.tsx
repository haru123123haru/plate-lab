"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { plateTypes, conditionTemplates } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { PlateTypeId } from "@/types";

export default function NewPlatePage() {
  const router = useRouter();
  const [plateName, setPlateName] = useState("");
  const [selectedType, setSelectedType] = useState<PlateTypeId | null>(null);
  const [conditionMode, setConditionMode] = useState<"presets" | "custom">(
    "presets"
  );
  const [selectedCondition, setSelectedCondition] = useState<string | null>(
    null
  );
  const [notes, setNotes] = useState("");

  return (
    <div className="bg-bg-primary min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-14 pb-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-text-primary">
            Add Plate
          </h1>
          <div className="mt-2 h-[3px] w-7 bg-text-primary" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-text-secondary"
        >
          <X className="size-5" />
          Cancel
        </Button>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-7 px-7">
        {/* Plate Name */}
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            PLATE NAME
          </Label>
          <Input
            value={plateName}
            onChange={(e) => setPlateName(e.target.value)}
            placeholder="e.g. Plate A-001"
            className="h-12 rounded-xl border-border-default bg-bg-surface text-[15px]"
          />
        </div>

        {/* Plate Type */}
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            PLATE TYPE
          </Label>
          <div className="flex gap-3 overflow-x-auto">
            {plateTypes.map((pt) => (
              <button
                key={pt.id}
                onClick={() => setSelectedType(pt.id)}
                className={cn(
                  "shrink-0 cursor-pointer rounded-xl p-4 text-left transition-colors",
                  selectedType === pt.id
                    ? "bg-text-primary text-white"
                    : "border border-border-default bg-bg-surface text-text-primary"
                )}
              >
                <div className="text-[15px] font-semibold">{pt.name}</div>
                <div
                  className={cn(
                    "mt-1 text-[13px]",
                    selectedType === pt.id
                      ? "text-white/70"
                      : "text-text-secondary"
                  )}
                >
                  {pt.wellCount} wells
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-3">
          <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            CONDITION
          </Label>

          {/* Toggle Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setConditionMode("presets")}
              className={cn(
                "cursor-pointer rounded-lg px-4 py-2 text-[14px] font-medium transition-colors",
                conditionMode === "presets"
                  ? "bg-text-primary text-white"
                  : "bg-transparent text-text-secondary"
              )}
            >
              Presets
            </button>
            <button
              onClick={() => setConditionMode("custom")}
              className={cn(
                "cursor-pointer rounded-lg px-4 py-2 text-[14px] font-medium transition-colors",
                conditionMode === "custom"
                  ? "bg-text-primary text-white"
                  : "bg-transparent text-text-secondary"
              )}
            >
              Custom
            </button>
          </div>

          {/* Presets List */}
          {conditionMode === "presets" && (
            <div className="space-y-2">
              {conditionTemplates.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => setSelectedCondition(ct.id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-surface p-4 text-left"
                >
                  {/* Radio circle */}
                  <div
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full",
                      selectedCondition === ct.id
                        ? "bg-text-primary"
                        : "border-2 border-border-default"
                    )}
                  >
                    {selectedCondition === ct.id && (
                      <div className="size-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-text-primary">
                      {ct.name}
                    </div>
                    <div className="text-[13px] text-text-secondary">
                      {ct.description}
                    </div>
                  </div>
                </button>
              ))}

              {/* Add Type card */}
              <Link
                href="/plate-types/new"
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-default p-4 text-text-secondary"
              >
                <Plus className="size-5" />
                <span className="text-[14px] font-medium">Add Type</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            NOTES
          </Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add any notes..."
            className="w-full rounded-xl border border-border-default bg-bg-surface p-4 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
          />
        </div>

        {/* Submit */}
        <Button className="h-12 w-full rounded-xl text-[16px] font-semibold">
          Create Plate
        </Button>

        <p className="text-center text-[13px] text-text-secondary">
          You can edit plate details anytime after creation.
        </p>
      </div>
    </div>
  );
}
