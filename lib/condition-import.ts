// CSV から条件テンプレートの中身（ウェルごとの条件）を確かめる。ブラウザの確認画面で使う。
// 形と決まりは docs/plans/2026-10-10-template-wells.md

export const CONDITION_MAX_ROWS = 96;
export const CONDITION_MAX_LENGTH = 200;

export const CONDITION_FIELDS = [
  "salt",
  "precipitant",
  "polyamine",
  "buffer",
] as const;

export type ConditionField = (typeof CONDITION_FIELDS)[number];

export const CONDITION_COLUMNS = ["well", ...CONDITION_FIELDS] as const;

export type ConditionColumn = (typeof CONDITION_COLUMNS)[number];

// 日本語の見出し。書き出す CSV の見出しにも使う
export const CONDITION_COLUMN_LABELS_JA: Record<ConditionColumn, string> = {
  well: "ウェル",
  salt: "塩",
  precipitant: "沈殿剤",
  polyamine: "ポリアミン",
  buffer: "バッファー",
};

// ウェルの位置ラベル。条件テンプレートは 96 ウェルまで
export const CONDITION_WELL_PATTERN = /^([A-H])([1-9]|1[0-2])$/;

export type ConditionWell = { position: string } & Record<
  ConditionField,
  string
>;

// 画面で文言に直すので、コードと値で返す。line は Excel の行番号（見出しが1行目）
export type ConditionImportErrorCode =
  | "empty"
  | "missingColumn"
  | "tooManyRows"
  | "required"
  | "tooLong"
  | "invalidWell"
  | "duplicateWell"
  | "emptyCondition";

export interface ConditionImportError {
  line: number | null;
  code: ConditionImportErrorCode;
  column?: ConditionColumn;
  value?: string;
}

export interface ConditionImportResult {
  wells: ConditionWell[];
  errors: ConditionImportError[];
}

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

const HEADER_ALIASES = new Map<string, ConditionColumn>(
  CONDITION_COLUMNS.flatMap((column) => [
    [column, column],
    [normalizeHeader(CONDITION_COLUMN_LABELS_JA[column]), column],
  ])
);

// A1, A2, …, A12, B1 の順に並べる
export function compareWellPosition(a: string, b: string) {
  const [, rowA = "", colA = "0"] = a.match(/^([A-Z]+)(\d+)$/) ?? [];
  const [, rowB = "", colB = "0"] = b.match(/^([A-Z]+)(\d+)$/) ?? [];
  return rowA === rowB ? Number(colA) - Number(colB) : rowA.localeCompare(rowB);
}

export function buildConditionImport(table: string[][]): ConditionImportResult {
  const fail = (error: ConditionImportError): ConditionImportResult => ({
    wells: [],
    errors: [error],
  });

  const [header = [], ...body] = table;
  const columnIndex = new Map<ConditionColumn, number>();
  header.forEach((value, i) => {
    const column = HEADER_ALIASES.get(normalizeHeader(value));
    if (column && !columnIndex.has(column)) columnIndex.set(column, i);
  });

  const rows = body
    .map((cells, i) => ({
      line: i + 2,
      get: (column: ConditionColumn) => {
        const index = columnIndex.get(column);
        return index === undefined ? "" : (cells[index] ?? "").trim();
      },
      blank: cells.every((cell) => cell.trim() === ""),
    }))
    .filter((row) => !row.blank);

  if (rows.length === 0) return fail({ line: null, code: "empty" });
  if (!columnIndex.has("well")) {
    return fail({ line: null, code: "missingColumn", column: "well" });
  }
  if (rows.length > CONDITION_MAX_ROWS) {
    return fail({ line: null, code: "tooManyRows" });
  }

  const errors: ConditionImportError[] = [];
  const wells: ConditionWell[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    let ok = true;
    // "a1" も受ける
    const position = row.get("well").toUpperCase();
    if (position === "") {
      errors.push({ line: row.line, code: "required", column: "well" });
      ok = false;
    } else if (!CONDITION_WELL_PATTERN.test(position)) {
      errors.push({ line: row.line, code: "invalidWell", value: position });
      ok = false;
    } else if (seen.has(position)) {
      errors.push({ line: row.line, code: "duplicateWell", value: position });
      ok = false;
    }
    seen.add(position);

    for (const field of CONDITION_FIELDS) {
      if (row.get(field).length > CONDITION_MAX_LENGTH) {
        errors.push({ line: row.line, code: "tooLong", column: field });
        ok = false;
      }
    }
    if (CONDITION_FIELDS.every((field) => row.get(field) === "")) {
      errors.push({ line: row.line, code: "emptyCondition" });
      ok = false;
    }

    if (ok) {
      wells.push({
        position,
        salt: row.get("salt"),
        precipitant: row.get("precipitant"),
        polyamine: row.get("polyamine"),
        buffer: row.get("buffer"),
      });
    }
  }

  // エラーがあれば何も入れない
  if (errors.length > 0) return { wells: [], errors };
  wells.sort((a, b) => compareWellPosition(a.position, b.position));
  return { wells, errors };
}
