"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/components/locale-provider";
import { purgePlate, restorePlate } from "@/lib/actions/plates";

interface TrashClientProps {
  plates: {
    id: string;
    name: string;
    plateTypeName: string;
    deletedAt: string;
  }[];
}

export function TrashClient({ plates }: TrashClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  // 同時に1件だけ処理する。どのボタンが処理中かを id で持つ
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  // 一覧の再取得中。終わるまで消えたはずの行のボタンを押させない
  const [refreshing, startRefresh] = useTransition();
  const locked = busyId !== null || refreshing;

  const run = async (
    id: string,
    action: (id: string) => Promise<{ error?: string }>
  ) => {
    if (locked) return;
    setBusyId(id);
    setError("");
    try {
      const result = await action(id);
      if (result.error) setError(t("actionFailed"));
    } catch {
      setError(t("actionFailed"));
    } finally {
      setBusyId(null);
      setPurgeTarget(null);
      // 失敗時も再取得する。別画面で復元済みの古い行が残っていた場合に消えるように
      startRefresh(() => router.refresh());
    }
  };

  return (
    <div className="bg-bg-primary min-h-screen pb-10">
      <div className="flex items-center gap-3 px-6 pt-14 pb-4">
        <button
          type="button"
          onClick={() => router.push("/mypage")}
          className="cursor-pointer"
          aria-label={t("back")}
        >
          <ArrowLeft className="size-6 text-text-primary" />
        </button>
        <h1 className="text-[20px] font-bold text-text-primary">
          {t("trash")}
        </h1>
      </div>

      <div className="space-y-3 px-6">
        {error && (
          <div className="rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
            {error}
          </div>
        )}

        {plates.length === 0 ? (
          <p className="py-16 text-center text-[15px] text-text-secondary">
            {t("trashEmpty")}
          </p>
        ) : (
          plates.map((plate) => (
            <div key={plate.id} className="rounded-xl bg-bg-surface p-4">
              <Link
                href={`/plates/${plate.id}`}
                className="flex items-center gap-3"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-primary">
                  <FlaskConical className="size-5 text-text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-text-primary">
                    {plate.name}
                  </div>
                  <div className="text-[13px] text-text-secondary">
                    {plate.plateTypeName} · {t("trashedOn")} {plate.deletedAt}
                  </div>
                </div>
              </Link>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl"
                  onClick={() => run(plate.id, restorePlate)}
                  disabled={locked}
                >
                  {busyId === plate.id && !purgeTarget
                    ? t("restoring")
                    : t("restore")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl border-accent-negative/40 text-accent-negative hover:bg-accent-negative/10"
                  onClick={() => setPurgeTarget(plate.id)}
                  disabled={locked}
                >
                  {t("deletePermanently")}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={purgeTarget !== null}
        onOpenChange={(open) => !open && setPurgeTarget(null)}
        title={t("purgeConfirmTitle")}
        description={t("purgeConfirmBody")}
        confirmLabel={t("deletePermanently")}
        pendingLabel={t("deleting")}
        pending={busyId !== null && busyId === purgeTarget}
        onConfirm={() => purgeTarget && run(purgeTarget, purgePlate)}
      />
    </div>
  );
}
