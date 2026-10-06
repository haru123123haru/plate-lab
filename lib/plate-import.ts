// CSV から取り込むプレートを、行からまとめて確かめる。ブラウザの確認画面で使う。
// 形と決まりは docs/plans/2026-10-06-plate-import.md

export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_MAX_PLATES = 50;

export const IMPORT_COLUMNS = [
  "plate_name",
  "plate_type",
  "setup_date",
  "reservoir",
  "screening",
  "plate_notes",
  "well",
  "slot",
  "sample",
  "concentration",
  "drop_notes",
  "observed_on",
  "mark",
  "observation_notes",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

// 日本語の見出し。テンプレートの見出しにも使う
export const IMPORT_COLUMN_LABELS_JA: Record<ImportColumn, string> = {
  plate_name: "プレート名",
  plate_type: "プレートタイプ",
  setup_date: "仕込み日",
  reservoir: "リザーバー",
  screening: "スクリーニング",
  plate_notes: "プレートのメモ",
  well: "ウェル",
  slot: "置き場所",
  sample: "サンプル名",
  concentration: "濃度",
  drop_notes: "ドロップのメモ",
  observed_on: "観察日",
  mark: "目印",
  observation_notes: "観察のメモ",
};

// 長さの上限は lib/validations.ts の各スキーマに合わせる
const MAX_LENGTH: Partial<Record<ImportColumn, number>> = {
  plate_name: 200,
  plate_notes: 2000,
  sample: 200,
  concentration: 100,
  drop_notes: 2000,
  observation_notes: 2000,
};

const MARKS = {
  POSSIBLE: "POSSIBLE",
  CRYSTAL: "CRYSTAL",
  HARVESTED: "HARVESTED",
  怪しい: "POSSIBLE",
  結晶あり: "CRYSTAL",
  結晶取り済み: "HARVESTED",
} as const;

export type ImportMark = (typeof MARKS)[keyof typeof MARKS];

export interface ImportCatalog {
  plateTypes: {
    id: string;
    name: string;
    rows: number;
    cols: number;
    maxDrops: number;
  }[];
  templates: { id: number; name: string }[];
}

export interface ImportObservation {
  observedAt: string;
  mark: ImportMark | null;
  notes: string;
}

export interface ImportDrop {
  position: string;
  slot: number;
  sampleName: string;
  concentration: string;
  notes: string | null;
  observations: ImportObservation[];
}

export interface ImportPlate {
  name: string;
  plateTypeId: string;
  setupDate: string;
  reservoirTemplateId: number | null;
  screeningTemplateId: number | null;
  notes: string | null;
  drops: ImportDrop[];
}

// 画面で文言に直すので、コードと値で返す。line は Excel の行番号（見出しが1行目）
export type ImportErrorCode =
  | "empty"
  | "missingColumn"
  | "tooManyRows"
  | "tooManyPlates"
  | "required"
  | "tooLong"
  | "conflict"
  | "unknownPlateType"
  | "ambiguousPlateType"
  | "unknownTemplate"
  | "ambiguousTemplate"
  | "invalidDate"
  | "invalidWell"
  | "invalidSlot"
  | "invalidMark"
  | "observationNeedsContent";

export interface ImportError {
  line: number | null;
  code: ImportErrorCode;
  column?: ImportColumn;
  value?: string;
}

export interface ImportResult {
  plates: ImportPlate[];
  errors: ImportError[];
}

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

const HEADER_ALIASES = new Map<string, ImportColumn>(
  IMPORT_COLUMNS.flatMap((column) => [
    [column, column],
    [normalizeHeader(IMPORT_COLUMN_LABELS_JA[column]), column],
  ])
);

// "2026-08-01"・"2026/8/1" を "2026-08-01" にする。無い日付なら null
export function parseImportDate(value: string): string | null {
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

type Row = { line: number; get: (column: ImportColumn) => string };

// 同じプレート・同じドロップの行で、値を1つに決める。
// 空の行はほかの行の値を使い、違う値が来たらエラーにする
class MergedField {
  value = "";
  constructor(
    private column: ImportColumn,
    private errors: ImportError[]
  ) {}
  take(row: Row) {
    const value = row.get(this.column);
    if (value === "") return;
    if (this.value === "") this.value = value;
    else if (this.value !== value) {
      this.errors.push({
        line: row.line,
        code: "conflict",
        column: this.column,
        value,
      });
    }
  }
}

function findByName<T extends { name: string }>(items: T[], name: string) {
  const matches = items.filter((item) => item.name === name);
  return matches.length === 1 ? matches[0] : matches.length;
}

export function buildPlateImport(
  table: string[][],
  catalog: ImportCatalog,
  today: string
): ImportResult {
  const errors: ImportError[] = [];
  const fail = (error: ImportError): ImportResult => ({
    plates: [],
    errors: [error],
  });

  const [header = [], ...body] = table;
  const columnIndex = new Map<ImportColumn, number>();
  header.forEach((value, i) => {
    const column = HEADER_ALIASES.get(normalizeHeader(value));
    if (column && !columnIndex.has(column)) columnIndex.set(column, i);
  });

  const rows: Row[] = body
    .map((cells, i) => ({
      line: i + 2,
      get: (column: ImportColumn) => {
        const index = columnIndex.get(column);
        return index === undefined ? "" : (cells[index] ?? "").trim();
      },
      blank: cells.every((cell) => cell.trim() === ""),
    }))
    .filter((row) => !row.blank);

  if (rows.length === 0) return fail({ line: null, code: "empty" });
  for (const column of ["plate_name", "plate_type"] as const) {
    if (!columnIndex.has(column)) {
      return fail({ line: null, code: "missingColumn", column });
    }
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    return fail({ line: null, code: "tooManyRows" });
  }

  // 長さと、プレート名の有無は行ごとに見る
  const usable: Row[] = [];
  for (const row of rows) {
    let ok = true;
    for (const [column, max] of Object.entries(MAX_LENGTH)) {
      if (row.get(column as ImportColumn).length > max) {
        errors.push({
          line: row.line,
          code: "tooLong",
          column: column as ImportColumn,
        });
        ok = false;
      }
    }
    if (row.get("plate_name") === "") {
      errors.push({ line: row.line, code: "required", column: "plate_name" });
      ok = false;
    }
    if (ok) usable.push(row);
  }

  // プレート名でまとめる。並びはファイルに出てきた順
  const groups = new Map<string, Row[]>();
  for (const row of usable) {
    const name = row.get("plate_name");
    groups.set(name, [...(groups.get(name) ?? []), row]);
  }
  if (groups.size > IMPORT_MAX_PLATES) {
    return fail({ line: null, code: "tooManyPlates" });
  }

  const plates: ImportPlate[] = [];
  for (const [name, plateRows] of groups) {
    const plate = buildPlate(name, plateRows, catalog, today, errors);
    if (plate) plates.push(plate);
  }

  errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  return { plates: errors.length > 0 ? [] : plates, errors };
}

function buildPlate(
  name: string,
  rows: Row[],
  catalog: ImportCatalog,
  today: string,
  errors: ImportError[]
): ImportPlate | null {
  const firstLine = rows[0].line;
  const errorCount = errors.length;

  const fields = {
    plate_type: new MergedField("plate_type", errors),
    setup_date: new MergedField("setup_date", errors),
    reservoir: new MergedField("reservoir", errors),
    screening: new MergedField("screening", errors),
    plate_notes: new MergedField("plate_notes", errors),
  };
  for (const row of rows) {
    for (const field of Object.values(fields)) field.take(row);
  }

  // プレートタイプ
  const typeName = fields.plate_type.value;
  let plateType: ImportCatalog["plateTypes"][number] | null = null;
  if (typeName === "") {
    errors.push({ line: firstLine, code: "required", column: "plate_type" });
  } else {
    const found = findByName(catalog.plateTypes, typeName);
    if (typeof found === "number") {
      errors.push({
        line: firstLine,
        code: found === 0 ? "unknownPlateType" : "ambiguousPlateType",
        column: "plate_type",
        value: typeName,
      });
    } else {
      plateType = found;
    }
  }

  // 仕込み日。空なら取り込んだ日
  let setupDate = today;
  if (fields.setup_date.value !== "") {
    const parsed = parseImportDate(fields.setup_date.value);
    if (parsed) setupDate = parsed;
    else {
      errors.push({
        line: firstLine,
        code: "invalidDate",
        column: "setup_date",
        value: fields.setup_date.value,
      });
    }
  }

  // 条件のテンプレート
  const templateId = (column: "reservoir" | "screening") => {
    const value = fields[column].value;
    if (value === "") return null;
    const found = findByName(catalog.templates, value);
    if (typeof found === "number") {
      errors.push({
        line: firstLine,
        code: found === 0 ? "unknownTemplate" : "ambiguousTemplate",
        column,
        value,
      });
      return null;
    }
    return found.id;
  };
  const reservoirTemplateId = templateId("reservoir");
  const screeningTemplateId = templateId("screening");

  // ドロップ。同じウェル・置き場所の行は同じドロップで、観察が行の数だけ付く
  const drops = new Map<
    string,
    {
      line: number;
      position: string;
      slot: number;
      fields: Record<"sample" | "concentration" | "drop_notes", MergedField>;
      observations: ImportObservation[];
    }
  >();
  for (const row of rows) {
    const well = row.get("well").toUpperCase();
    const slotText = row.get("slot");
    const observation = parseObservation(row, errors);

    if (well === "") {
      // ドロップの欄だけ書いてウェルが無い行は、どこに入れるか決められない
      const dropColumns = [
        "slot",
        "sample",
        "concentration",
        "drop_notes",
      ] as const;
      if (observation !== undefined || dropColumns.some((c) => row.get(c))) {
        errors.push({ line: row.line, code: "required", column: "well" });
      }
      continue;
    }

    const match = well.match(/^([A-H])([1-9]|1[0-2])$/);
    const rowIndex = match ? "ABCDEFGH".indexOf(match[1]) : -1;
    if (
      !match ||
      (plateType &&
        (rowIndex >= plateType.rows || Number(match[2]) > plateType.cols))
    ) {
      errors.push({
        line: row.line,
        code: "invalidWell",
        column: "well",
        value: row.get("well"),
      });
      continue;
    }

    const slot = slotText === "" ? 1 : Number(slotText);
    if (
      !Number.isInteger(slot) ||
      slot < 1 ||
      (plateType && slot > plateType.maxDrops)
    ) {
      errors.push({
        line: row.line,
        code: "invalidSlot",
        column: "slot",
        value: slotText,
      });
      continue;
    }

    const key = `${well}-${slot}`;
    let drop = drops.get(key);
    if (!drop) {
      drop = {
        line: row.line,
        position: well,
        slot,
        fields: {
          sample: new MergedField("sample", errors),
          concentration: new MergedField("concentration", errors),
          drop_notes: new MergedField("drop_notes", errors),
        },
        observations: [],
      };
      drops.set(key, drop);
    }
    for (const field of Object.values(drop.fields)) field.take(row);
    if (observation) drop.observations.push(observation);
  }

  const importDrops: ImportDrop[] = [];
  for (const drop of drops.values()) {
    for (const column of ["sample", "concentration"] as const) {
      if (drop.fields[column].value === "") {
        errors.push({ line: drop.line, code: "required", column });
      }
    }
    importDrops.push({
      position: drop.position,
      slot: drop.slot,
      sampleName: drop.fields.sample.value,
      concentration: drop.fields.concentration.value,
      notes: drop.fields.drop_notes.value || null,
      observations: drop.observations,
    });
  }

  if (errors.length > errorCount || !plateType) return null;
  return {
    name,
    plateTypeId: plateType.id,
    setupDate,
    reservoirTemplateId,
    screeningTemplateId,
    notes: fields.plate_notes.value || null,
    drops: importDrops,
  };
}

// 観察の欄。何も書いていなければ undefined、書いてあって問題があれば null
function parseObservation(
  row: Row,
  errors: ImportError[]
): ImportObservation | null | undefined {
  const observedOn = row.get("observed_on");
  const markText = row.get("mark");
  const notes = row.get("observation_notes");
  if (observedOn === "" && markText === "" && notes === "") return undefined;

  let ok = true;
  let observedAt = "";
  if (observedOn === "") {
    errors.push({ line: row.line, code: "required", column: "observed_on" });
    ok = false;
  } else {
    const parsed = parseImportDate(observedOn);
    if (parsed) observedAt = parsed;
    else {
      errors.push({
        line: row.line,
        code: "invalidDate",
        column: "observed_on",
        value: observedOn,
      });
      ok = false;
    }
  }

  let mark: ImportMark | null = null;
  if (markText !== "") {
    // "constructor" のような名前を拾わないよう、自分のキーだけを見る
    const key = [markText.toUpperCase(), markText].find((k) =>
      Object.hasOwn(MARKS, k)
    ) as keyof typeof MARKS | undefined;
    if (key) mark = MARKS[key];
    else {
      errors.push({
        line: row.line,
        code: "invalidMark",
        column: "mark",
        value: markText,
      });
      ok = false;
    }
  } else if (notes === "") {
    // 詳細画面の観察と同じく、目印かメモのどちらかが要る
    errors.push({ line: row.line, code: "observationNeedsContent" });
    ok = false;
  }

  return ok ? { observedAt, mark, notes } : null;
}
