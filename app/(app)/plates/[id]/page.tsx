"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FlaskConical,
  Activity,
  Beaker,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";
import { WellGrid } from "@/components/well-grid";
import { WellGrid24 } from "@/components/well-grid-24";
import { WellDetailModal } from "@/components/well-detail-modal";
import { plates } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { WellData } from "@/types";

const statusColor: Record<string, string> = {
  active: "bg-accent-positive",
  completed: "bg-text-secondary",
  archived: "bg-text-tertiary",
};

export default function PlateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const plate = plates.find((p) => p.id === params.id);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(plate?.name ?? "");
  const [editNotes, setEditNotes] = useState(plate?.notes ?? "");
  const [selectedWell, setSelectedWell] = useState<WellData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!plate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <p className="text-[16px] text-text-secondary">Plate not found</p>
      </div>
    );
  }

  const handleWellClick = (well: WellData) => {
    setSelectedWell(well);
    setModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditName(plate.name);
    setEditNotes(plate.notes ?? "");
    setEditMode(false);
  };

  return (
    <div className="bg-bg-primary min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="size-6 text-text-primary" />
          </button>
          <h1 className="text-[20px] font-bold text-text-primary">
            {plate.name}
          </h1>
        </div>
        <Button
          variant={editMode ? "default" : "ghost"}
          size="icon"
          onClick={() => setEditMode(!editMode)}
        >
          <Pencil className="size-5" />
        </Button>
      </div>

      <div className="space-y-6 px-6">
        {/* Well Map */}
        <div>
          <SectionHeader label="WELL MAP" />
          <div className="mt-3 rounded-xl bg-bg-surface">
            {plate.plateType.wellCount === 24 ? (
              <WellGrid24
                wells={plate.wells}
                onWellClick={handleWellClick}
              />
            ) : (
              <WellGrid
                wells={plate.wells}
                onWellClick={handleWellClick}
              />
            )}
          </div>
        </div>

        {/* Edit Mode */}
        {editMode && (
          <div className="space-y-4 rounded-xl bg-bg-surface p-4">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                PLATE NAME
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-12 rounded-xl border-border-default bg-bg-primary text-[15px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                NOTES
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border-default bg-bg-primary p-4 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl"
                onClick={() => setEditMode(false)}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Plate Details */}
        <div>
          <SectionHeader label="PLATE DETAILS" />
          <div className="mt-3">
            <ListRow
              icon={FlaskConical}
              title="Type"
              description={plate.plateType.name}
            />
            <div className="flex w-full items-center gap-3 border-b border-border-subtle py-3 text-left">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface">
                <Activity className="size-5 text-text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium text-text-primary">
                  Status
                </div>
                <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <span
                    className={cn(
                      "inline-block size-2 rounded-full",
                      statusColor[plate.status]
                    )}
                  />
                  <span className="capitalize">{plate.status}</span>
                </div>
              </div>
            </div>
            <ListRow
              icon={Beaker}
              title="Condition"
              description={plate.conditionTemplate ?? "-"}
            />
            <ListRow
              icon={Calendar}
              title="Created"
              description={plate.createdAt}
            />
            <ListRow
              icon={Clock}
              title="Updated"
              description={plate.updatedAt}
            />
          </div>
        </div>
      </div>

      {/* Well Detail Modal */}
      <WellDetailModal
        well={selectedWell}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
