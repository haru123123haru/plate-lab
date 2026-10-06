"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/section-header";
import { useTranslation } from "@/components/locale-provider";
import { importPlates } from "@/lib/actions/plate-import";
import { decodeCsv, parseCsv, toCsv } from "@/lib/csv";
import {
  buildPlateImport,
  IMPORT_COLUMNS,
  IMPORT_COLUMN_LABELS_JA,
  IMPORT_MAX_PLATES,
  IMPORT_MAX_ROWS,
  type ImportCatalog,
  type ImportColumn,
  type ImportError,
  type ImportResult,
} from "@/lib/plate-import";
import type { TranslationKey } from "@/lib/i18n";
import { today } from "@/lib/utils";

// 画面に並べるエラーの数。多すぎると読めないので、残りは件数だけ出す
const MAX_ERRORS_SHOWN = 50;

const ERROR_MESSAGES: Record<ImportError["code"], TranslationKey> = {
  empty: "importErrEmpty",
  missingColumn: "importErrMissingColumn",
  tooManyRows: "importErrTooManyRows",
  tooManyPlates: "importErrTooManyPlates",
  required: "importErrRequired",
  tooLong: "importErrTooLong",
  conflict: "importErrConflict",
  unknownPlateType: "importErrUnknownPlateType",
  ambiguousPlateType: "importErrAmbiguousPlateType",
  unknownTemplate: "importErrUnknownTemplate",
  ambiguousTemplate: "importErrAmbiguousTemplate",
  invalidDate: "importErrInvalidDate",
  invalidWell: "importErrInvalidWell",
  invalidSlot: "importErrInvalidSlot",
  invalidMark: "importErrInvalidMark",
  observationNeedsContent: "importErrObservationNeedsContent",
};

interface ImportClientProps {
  catalog: ImportCatalog;
}

export function ImportClient({ catalog }: ImportClientProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const columnLabel = (column: ImportColumn) =>
    locale === "ja" ? IMPORT_COLUMN_LABELS_JA[column] : column;

  const errorMessage = (e: ImportError) =>
    t(ERROR_MESSAGES[e.code])
      .replace("{column}", e.column ? columnLabel(e.column) : "")
      .replace("{value}", e.value ?? "")
      .replace("{rows}", String(IMPORT_MAX_ROWS))
      .replace("{plates}", String(IMPORT_MAX_PLATES));

  // 見出しと、そのまま取り込める例の行。名前は今使えるタイプとテンプレートから採る
  const downloadTemplate = () => {
    const plateType =
      catalog.plateTypes.find((pt) => pt.maxDrops > 1) ?? catalog.plateTypes[0];
    const date = today();
    const example = (values: Partial<Record<ImportColumn, string>>) =>
      IMPORT_COLUMNS.map((column) => values[column] ?? "");
    const plate = { plate_name: "Example plate" };
    const rows = [
      IMPORT_COLUMNS.map(columnLabel),
      example({
        ...plate,
        plate_type: plateType?.name,
        setup_date: date,
        well: "A1",
        slot: "1",
        sample: "lysozyme",
        concentration: "10 mg/mL",
        observed_on: date,
        mark: locale === "ja" ? "結晶あり" : "CRYSTAL",
        observation_notes: locale === "ja" ? "針状の結晶" : "Needles",
      }),
      example({
        ...plate,
        well: "A1",
        observed_on: date,
        observation_notes: locale === "ja" ? "2回目の観察" : "Second look",
      }),
      example({
        ...plate,
        well: "A2",
        slot: "1",
        sample: "thaumatin",
        concentration: "5 mg/mL",
      }),
    ];
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "plate-lab-import.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setError("");
    const table = parseCsv(decodeCsv(await file.arrayBuffer()));
    setResult(buildPlateImport(table, catalog, today()));
  };

  const handleImport = async () => {
    if (!result || importing) return;
    setImporting(true);
    setError("");
    try {
      const response = await importPlates(result.plates);
      if ("error" in response) {
        setError(t("actionFailed"));
        return;
      }
      // 直後に router.refresh() を呼ぶと遷移が取り消される。ホームは動的な画面なので、
      // 移った先で新しく引き直される
      router.push("/");
    } catch {
      setError(t("actionFailed"));
    } finally {
      setImporting(false);
    }
  };

  const plateTypeName = new Map(
    catalog.plateTypes.map((pt) => [pt.id, pt.name])
  );
  const errors = result?.errors ?? [];
  const plates = result?.plates ?? [];

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
          {t("importCsv")}
        </h1>
      </div>

      <div className="flex flex-col gap-6 px-6">
        <div className="space-y-4 rounded-xl bg-bg-surface p-4">
          <p className="text-[14px] leading-relaxed text-text-primary">
            {t("importIntro")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl"
            onClick={downloadTemplate}
          >
            <Download className="size-4" />
            {t("downloadTemplate")}
          </Button>
          <Button
            type="button"
            className="h-11 w-full rounded-xl"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
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

        {plates.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionHeader label={t("importPreview")} />
            <div className="space-y-2">
              {plates.map((plate, i) => (
                <div key={i} className="rounded-xl bg-bg-surface p-4">
                  <div className="truncate text-[15px] font-medium text-text-primary">
                    {plate.name}
                  </div>
                  <div className="text-[13px] text-text-secondary">
                    {plateTypeName.get(plate.plateTypeId)} · {plate.setupDate}
                  </div>
                  <div className="text-[13px] text-text-secondary">
                    {t("importCounts")
                      .replace("{drops}", String(plate.drops.length))
                      .replace(
                        "{observations}",
                        String(
                          plate.drops.reduce(
                            (sum, d) => sum + d.observations.length,
                            0
                          )
                        )
                      )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="mt-2 h-12 w-full rounded-xl"
              onClick={handleImport}
              disabled={importing}
            >
              {importing
                ? t("importing")
                : t("importPlates").replace("{count}", String(plates.length))}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
