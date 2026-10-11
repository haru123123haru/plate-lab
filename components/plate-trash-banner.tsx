"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/locale-provider";
import { restorePlate } from "@/lib/actions/plates";

// ゴミ箱に入っているプレートの詳細画面に出す帯。ここから元に戻せる
export function PlateTrashBanner({ plateId }: { plateId: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    setRestoreError("");
    try {
      const result = await restorePlate(plateId);
      if ("error" in result) {
        setRestoreError(t("actionFailed"));
        return;
      }
      router.refresh();
    } catch {
      setRestoreError(t("actionFailed"));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="rounded-xl bg-accent-negative/10 p-4">
      <div className="flex items-center gap-2 text-[14px] font-medium text-accent-negative">
        <Trash2 className="size-4" />
        {t("inTrashBanner")}
      </div>
      {restoreError && (
        <p className="mt-2 text-[13px] text-accent-negative">{restoreError}</p>
      )}
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-10 w-full rounded-xl bg-bg-surface"
        onClick={handleRestore}
        disabled={restoring}
      >
        {restoring ? t("restoring") : t("restore")}
      </Button>
    </div>
  );
}
