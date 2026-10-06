"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/section-header";
import { useTranslation } from "@/components/locale-provider";
import { updatePlate } from "@/lib/actions/plates";

interface PlateNotesProps {
  plateId: string;
  notes?: string;
  readOnly: boolean;
}

// 詳細画面でいつも見えるメモ。編集モードに入らずに、ここだけで書き換えられる
export function PlateNotes({ plateId, notes, readOnly }: PlateNotesProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const [pending, setPending] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState("");
  const busy = pending || isRefreshing;

  const startEditing = () => {
    setDraft(notes ?? "");
    setError("");
    setEditing(true);
  };

  const handleSave = async () => {
    if (busy) return;
    setPending(true);
    setError("");
    try {
      // 空にしたら消す
      const result = await updatePlate(plateId, {
        notes: draft.trim() || null,
      });
      if (result && "error" in result) {
        setError(t("actionFailed"));
        return;
      }
      startTransition(() => {
        setEditing(false);
        router.refresh();
      });
    } catch {
      setError(t("actionFailed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <SectionHeader
        label={t("notes")}
        action={readOnly || editing ? undefined : t("edit")}
        onAction={startEditing}
      />
      <div className="mt-3 rounded-xl bg-bg-surface p-4">
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              maxLength={2000}
              autoFocus
              aria-label={t("notes")}
              className="w-full rounded-xl border border-border-default bg-bg-primary p-4 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
            />
            {error && (
              <div className="rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl"
                onClick={handleSave}
                disabled={busy}
              >
                {busy ? t("saving") : t("save")}
              </Button>
            </div>
          </div>
        ) : readOnly ? (
          <NotesText notes={notes} />
        ) : (
          // 文面を押しても書き換えを始められる
          <button
            type="button"
            onClick={startEditing}
            className="w-full cursor-pointer text-left"
          >
            <NotesText notes={notes} />
          </button>
        )}
      </div>
    </div>
  );
}

function NotesText({ notes }: { notes?: string }) {
  const { t } = useTranslation();
  if (!notes) {
    return <p className="text-[14px] text-text-tertiary">{t("noNotes")}</p>;
  }
  return (
    <p className="whitespace-pre-wrap break-words text-[14px] text-text-primary">
      {notes}
    </p>
  );
}
