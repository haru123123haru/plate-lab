"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NewPlateTypeDialog } from "@/components/new-plate-type-dialog";
import { useTranslation } from "@/components/locale-provider";
import { deletePlateType } from "@/lib/actions/plate-types";
import { plateShapeLabel } from "@/lib/wells";
import type { PlateType } from "@/types";

interface PlateTypesClientProps {
  plateTypes: (Omit<PlateType, "description"> & { isDefault: boolean })[];
}

export function PlateTypesClient({ plateTypes }: PlateTypesClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  // 一覧の再取得中。終わるまで消えたはずの行のボタンを押させない
  const [refreshing, startRefresh] = useTransition();

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const result = await deletePlateType(deleteTarget);
      if ("error" in result) {
        if (result.error === "Not found") setError(t("actionFailed"));
        else if (result.count === undefined)
          setError(t("plateTypeInUseNoCount"));
        else
          setError(
            t("plateTypeInUse").replace("{count}", String(result.count))
          );
      }
    } catch {
      setError(t("actionFailed"));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      startRefresh(() => router.refresh());
    }
  };

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
          {t("plateTypes")}
        </h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => {
            setError("");
            setAddOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>

      <div className="space-y-2 px-6">
        {error && (
          <div className="rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
            {error}
          </div>
        )}

        {plateTypes.map((pt) => (
          <div
            key={pt.id}
            className="flex items-center gap-3 rounded-xl bg-bg-surface p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium text-text-primary">
                {pt.name}
              </div>
              <div className="text-[13px] text-text-secondary">
                {pt.rows * pt.cols} {t("wells")} ·{" "}
                {plateShapeLabel(t, pt.layout, pt.maxDrops)}
              </div>
            </div>
            {!pt.isDefault && (
              <button
                type="button"
                onClick={() => setDeleteTarget(pt.id)}
                disabled={deleting || refreshing}
                aria-label={t("delete")}
                className="shrink-0 cursor-pointer rounded-lg p-2 text-text-tertiary transition-colors hover:text-accent-negative"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <NewPlateTypeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => startRefresh(() => router.refresh())}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deletePlateTypeConfirmTitle")}
        description={t("deletePlateTypeConfirmBody")}
        confirmLabel={t("delete")}
        pendingLabel={t("deleting")}
        pending={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
