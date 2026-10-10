"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SectionHeader } from "@/components/section-header";
import { useTranslation } from "@/components/locale-provider";
import { replaceConditionTemplateWells } from "@/lib/actions/condition-templates";
import { decodeCsv, parseCsv, toCsv } from "@/lib/csv";
import {
  buildConditionImport,
  CONDITION_COLUMNS,
  CONDITION_COLUMN_LABELS_JA,
  CONDITION_FIELDS,
  CONDITION_MAX_ROWS,
  type ConditionColumn,
  type ConditionImportError,
  type ConditionImportResult,
  type ConditionWell,
} from "@/lib/condition-import";
import type { TranslationKey } from "@/lib/i18n";

// 画面に並べるエラーの数。多すぎると読めないので、残りは件数だけ出す
const MAX_ERRORS_SHOWN = 50;

const ERROR_MESSAGES: Record<ConditionImportError["code"], TranslationKey> = {
  empty: "importErrEmpty",
  missingColumn: "importErrMissingColumn",
  tooManyRows: "conditionErrTooManyRows",
  required: "importErrRequired",
  tooLong: "importErrTooLong",
  invalidWell: "conditionErrInvalidWell",
  duplicateWell: "conditionErrDuplicateWell",
  emptyCondition: "conditionErrEmptyCondition",
};

// 空のテンプレートで書き出す例の行
const EXAMPLE_WELLS: ConditionWell[] = [
  {
    position: "A1",
    salt: "100 mM LiCl",
    precipitant: "10% PEG3350",
    polyamine: "10 mM Spermine",
    buffer: "50 mM MOPS (pH7)",
  },
  {
    position: "A2",
    salt: "200 mM LiCl",
    precipitant: "10% PEG3350",
    polyamine: "10 mM Spermine",
    buffer: "50 mM MOPS (pH7)",
  },
];

interface TemplateClientProps {
  template: {
    id: number;
    name: string;
    description: string | null;
    isDefault: boolean;
    isOwn: boolean;
    wells: ConditionWell[];
  } | null;
}

export function TemplateClient({ template }: TemplateClientProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ConditionImportResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // 中身の再取得中。終わるまで同じファイルで置き換え直させない
  const [refreshing, startRefresh] = useTransition();

  const columnLabel = (column: ConditionColumn) =>
    locale === "ja" ? CONDITION_COLUMN_LABELS_JA[column] : column;

  const errorMessage = (e: ConditionImportError) =>
    t(ERROR_MESSAGES[e.code])
      .replace("{column}", e.column ? columnLabel(e.column) : "")
      .replace("{value}", e.value ?? "")
      .replace("{rows}", String(CONDITION_MAX_ROWS));

  const header = (
    <div className="flex items-center gap-3 px-6 pt-14 pb-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="cursor-pointer"
        aria-label={t("back")}
      >
        <ArrowLeft className="size-6 text-text-primary" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold text-text-primary">
        {template?.name ?? t("conditions")}
      </h1>
    </div>
  );

  if (!template) {
    return (
      <div className="bg-bg-primary min-h-dvh pb-10">
        {header}
        <p className="px-6 text-[15px] text-text-secondary">
          {t("templateNotFound")}
        </p>
      </div>
    );
  }

  // 今の中身を、取り込みと同じ形で書き出す。空なら例の行を入れる
  const downloadCsv = () => {
    const wells = template.wells.length > 0 ? template.wells : EXAMPLE_WELLS;
    const rows = [
      CONDITION_COLUMNS.map(columnLabel),
      ...wells.map((w) => [
        w.position,
        ...CONDITION_FIELDS.map((field) => w[field]),
      ]),
    ];
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${template.name}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFile = async (file: File) => {
    // 読めなかったときに、前のファイルの中身で置き換えさせない
    setResult(null);
    setFileName(file.name);
    setError("");
    try {
      const table = parseCsv(decodeCsv(await file.arrayBuffer()));
      setResult(buildConditionImport(table));
    } catch {
      setFileName("");
      setError(t("actionFailed"));
    }
  };

  const handleReplace = async () => {
    if (!result || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await replaceConditionTemplateWells(
        template.id,
        result.wells
      );
      if ("error" in response) {
        setError(t("actionFailed"));
        return;
      }
      setResult(null);
      setFileName("");
      startRefresh(() => router.refresh());
    } catch {
      setError(t("actionFailed"));
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const errors = result?.errors ?? [];
  const incoming = result?.wells ?? [];

  return (
    <div className="bg-bg-primary min-h-dvh pb-10">
      {header}

      <div className="flex flex-col gap-6 px-6">
        {template.description && (
          <p className="text-[14px] text-text-secondary">
            {template.description}
          </p>
        )}

        <div className="space-y-4 rounded-xl bg-bg-surface p-4">
          <p className="text-[14px] leading-relaxed text-text-primary">
            {template.isOwn
              ? t("templateWellsIntro")
              : t("templateWellsSharedNote")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl"
            onClick={downloadCsv}
          >
            <Download className="size-4" />
            {t("exportConditionsCsv")}
          </Button>
          {template.isOwn && (
            <>
              <Button
                type="button"
                className="h-11 w-full rounded-xl"
                onClick={() => fileInput.current?.click()}
                disabled={saving || refreshing}
              >
                <FileUp className="size-4" />
                {t("chooseCsv")}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  // 同じファイルを直して選び直したときも読む
                  e.target.value = "";
                }}
              />
              {fileName && (
                <p className="truncate text-[13px] text-text-secondary">
                  {fileName}
                </p>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
            {error}
          </div>
        )}

        {errors.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionHeader label={t("importErrors")} />
            <ul className="space-y-1 rounded-xl bg-accent-negative/10 px-4 py-3">
              {errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => (
                <li key={i} className="text-[13px] text-accent-negative">
                  {e.line !== null && (
                    <span className="font-semibold">
                      {t("importLine").replace("{line}", String(e.line))}
                    </span>
                  )}
                  {e.line !== null && " "}
                  {errorMessage(e)}
                </li>
              ))}
              {errors.length > MAX_ERRORS_SHOWN && (
                <li className="text-[13px] text-accent-negative">
                  {t("importMoreErrors").replace(
                    "{count}",
                    String(errors.length - MAX_ERRORS_SHOWN)
                  )}
                </li>
              )}
            </ul>
          </div>
        )}

        {incoming.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionHeader label={t("importPreview")} />
            <ConditionList wells={incoming} />
            <Button
              type="button"
              className="mt-2 h-12 w-full rounded-xl"
              onClick={() =>
                template.wells.length > 0
                  ? setConfirmOpen(true)
                  : handleReplace()
              }
              disabled={saving || refreshing}
            >
              {saving
                ? t("replacingConditions")
                : t("replaceConditions").replace(
                    "{count}",
                    String(incoming.length)
                  )}
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <SectionHeader
            label={
              template.wells.length > 0
                ? t("conditionCount").replace(
                    "{count}",
                    String(template.wells.length)
                  )
                : t("conditionEmpty")
            }
          />
          {template.wells.length > 0 && (
            <ConditionList wells={template.wells} />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("replaceConditionsConfirmTitle")}
        description={t("replaceConditionsConfirmBody")
          .replace("{current}", String(template.wells.length))
          .replace("{count}", String(incoming.length))}
        confirmLabel={t("replaceConditions").replace(
          "{count}",
          String(incoming.length)
        )}
        pendingLabel={t("replacingConditions")}
        pending={saving}
        onConfirm={handleReplace}
      />
    </div>
  );
}

function ConditionList({ wells }: { wells: ConditionWell[] }) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y divide-border-default rounded-xl bg-bg-surface">
      {wells.map((w) => (
        <li key={w.position} className="flex gap-4 px-4 py-3">
          <span className="w-9 shrink-0 text-[15px] font-semibold text-text-primary">
            {w.position}
          </span>
          <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
            {CONDITION_FIELDS.map((field) => (
              <div key={field} className="min-w-0">
                <dt className="text-[11px] text-text-tertiary">{t(field)}</dt>
                <dd className="break-words text-text-primary">
                  {w[field] || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
