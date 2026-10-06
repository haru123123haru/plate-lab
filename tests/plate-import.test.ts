import { describe, expect, it } from "vitest";
import {
  buildPlateImport,
  IMPORT_MAX_PLATES,
  IMPORT_MAX_ROWS,
  parseImportDate,
  type ImportCatalog,
} from "@/lib/plate-import";

const catalog: ImportCatalog = {
  plateTypes: [
    {
      id: "t24x4",
      name: "24 Well - Sitting 4 Drop",
      rows: 4,
      cols: 6,
      maxDrops: 4,
    },
    { id: "t96", name: "96 Well - Sitting", rows: 8, cols: 12, maxDrops: 1 },
    { id: "dupA", name: "Dup", rows: 4, cols: 6, maxDrops: 1 },
    { id: "dupB", name: "Dup", rows: 4, cols: 6, maxDrops: 1 },
  ],
  templates: [
    { id: 1, name: "MPD" },
    { id: 2, name: "PEG" },
    { id: 3, name: "Twice" },
    { id: 4, name: "Twice" },
  ],
};

const TODAY = "2026-10-06";

// 見出しと行から取り込む
function run(header: string[], ...rows: string[][]) {
  return buildPlateImport([header, ...rows], catalog, TODAY);
}

const HEADER = [
  "plate_name",
  "plate_type",
  "setup_date",
  "well",
  "slot",
  "sample",
  "concentration",
];

describe("parseImportDate", () => {
  it("ハイフンとスラッシュの書き方を読む", () => {
    expect(parseImportDate("2026-08-01")).toBe("2026-08-01");
    expect(parseImportDate("2026/8/1")).toBe("2026-08-01");
  });

  it("無い日付や別の書き方は null", () => {
    expect(parseImportDate("2026/2/30")).toBeNull();
    expect(parseImportDate("8/1/2026")).toBeNull();
    expect(parseImportDate("")).toBeNull();
  });
});

describe("buildPlateImport", () => {
  it("同じプレート名の行を1枚にまとめ、違うサンプルも入れる", () => {
    const result = run(
      HEADER,
      [
        "P1",
        "24 Well - Sitting 4 Drop",
        "2026/8/1",
        "A1",
        "1",
        "lysozyme",
        "10 mg/mL",
      ],
      ["P1", "", "", "a1", "2", "thaumatin", "5 mg/mL"],
      ["P2", "96 Well - Sitting", "", "H12", "", "lysozyme", "10 mg/mL"]
    );
    expect(result.errors).toEqual([]);
    expect(result.plates).toEqual([
      {
        name: "P1",
        plateTypeId: "t24x4",
        setupDate: "2026-08-01",
        reservoirTemplateId: null,
        screeningTemplateId: null,
        notes: null,
        drops: [
          {
            position: "A1",
            slot: 1,
            sampleName: "lysozyme",
            concentration: "10 mg/mL",
            notes: null,
            observations: [],
          },
          {
            position: "A1",
            slot: 2,
            sampleName: "thaumatin",
            concentration: "5 mg/mL",
            notes: null,
            observations: [],
          },
        ],
      },
      {
        name: "P2",
        plateTypeId: "t96",
        // 仕込み日が空なら取り込んだ日
        setupDate: TODAY,
        reservoirTemplateId: null,
        screeningTemplateId: null,
        notes: null,
        drops: [
          {
            position: "H12",
            slot: 1,
            sampleName: "lysozyme",
            concentration: "10 mg/mL",
            notes: null,
            observations: [],
          },
        ],
      },
    ]);
  });

  it("日本語の見出しを読み、列の順番と知らない列は問わない", () => {
    const result = run(
      [
        "メモ欄",
        "ウェル",
        "プレートタイプ",
        "プレート名",
        "サンプル名",
        "濃度",
        "リザーバー",
        "スクリーニング",
      ],
      ["x", "B2", "96 Well - Sitting", "P1", "s", "1", "MPD", "PEG"]
    );
    expect(result.errors).toEqual([]);
    expect(result.plates[0]).toMatchObject({
      name: "P1",
      reservoirTemplateId: 1,
      screeningTemplateId: 2,
      drops: [{ position: "B2", slot: 1, sampleName: "s" }],
    });
  });

  it("ウェルの無い行は、ドロップの無いプレートにする", () => {
    const result = run(
      ["plate_name", "plate_type"],
      ["P1", "96 Well - Sitting"]
    );
    expect(result.errors).toEqual([]);
    expect(result.plates[0].drops).toEqual([]);
  });

  it("空行は飛ばすが、エラーの行番号は Excel の行に合わせる", () => {
    const result = run(
      HEADER,
      ["", "", "", "", "", "", ""],
      ["P1", "Nope", "", "", "", "", ""]
    );
    expect(result.errors).toEqual([
      {
        line: 3,
        code: "unknownPlateType",
        column: "plate_type",
        value: "Nope",
      },
    ]);
  });

  it("エラーが1つでもあれば、プレートを返さない", () => {
    const result = run(
      HEADER,
      ["P1", "96 Well - Sitting", "", "A1", "", "s", "1"],
      ["P2", "Nope", "", "", "", "", ""]
    );
    expect(result.plates).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  it("中身や必須の列が無いファイルを拒む", () => {
    expect(buildPlateImport([], catalog, TODAY).errors).toEqual([
      { line: null, code: "empty" },
    ]);
    expect(run(["plate_name"], ["P1"]).errors).toEqual([
      { line: null, code: "missingColumn", column: "plate_type" },
    ]);
  });

  it("行とプレートの上限を超えたら拒む", () => {
    const rows = Array.from({ length: IMPORT_MAX_ROWS + 1 }, () => [
      "P1",
      "96 Well - Sitting",
    ]);
    expect(run(["plate_name", "plate_type"], ...rows).errors).toEqual([
      { line: null, code: "tooManyRows" },
    ]);
    const plates = Array.from({ length: IMPORT_MAX_PLATES + 1 }, (_, i) => [
      `P${i}`,
      "96 Well - Sitting",
    ]);
    expect(run(["plate_name", "plate_type"], ...plates).errors).toEqual([
      { line: null, code: "tooManyPlates" },
    ]);
  });

  it("同じプレートの行でプレートの欄が食い違えばエラー", () => {
    const result = run(
      HEADER,
      ["P1", "96 Well - Sitting", "2026-08-01", "", "", "", ""],
      ["P1", "96 Well - Sitting", "2026-08-02", "", "", "", ""]
    );
    expect(result.errors).toEqual([
      { line: 3, code: "conflict", column: "setup_date", value: "2026-08-02" },
    ]);
  });

  it("タイプやテンプレートの名前が無い・1つに決まらないときはエラー", () => {
    expect(run(["plate_name", "plate_type"], ["P1", "Dup"]).errors).toEqual([
      {
        line: 2,
        code: "ambiguousPlateType",
        column: "plate_type",
        value: "Dup",
      },
    ]);
    expect(run(["plate_name", "plate_type"], ["P1", ""]).errors).toEqual([
      { line: 2, code: "required", column: "plate_type" },
    ]);
    const result = run(
      ["plate_name", "plate_type", "reservoir", "screening"],
      ["P1", "96 Well - Sitting", "Nope", "Twice"]
    );
    expect(result.errors).toEqual([
      { line: 2, code: "unknownTemplate", column: "reservoir", value: "Nope" },
      {
        line: 2,
        code: "ambiguousTemplate",
        column: "screening",
        value: "Twice",
      },
    ]);
  });

  it("プレートの形の外のウェルと置き場所を拒む", () => {
    const result = run(
      HEADER,
      ["P1", "24 Well - Sitting 4 Drop", "", "E1", "1", "s", "1"],
      ["P1", "", "", "A7", "1", "s", "1"],
      ["P1", "", "", "A1", "5", "s", "1"],
      ["P1", "", "", "Z1", "1", "s", "1"],
      ["P1", "", "", "A1", "1.5", "s", "1"]
    );
    expect(result.errors.map((e) => [e.line, e.code])).toEqual([
      [2, "invalidWell"],
      [3, "invalidWell"],
      [4, "invalidSlot"],
      [5, "invalidWell"],
      [6, "invalidSlot"],
    ]);
  });

  it("ドロップにはサンプル名と濃度が要り、ウェルの無い行にドロップの欄は書けない", () => {
    const result = run(
      HEADER,
      ["P1", "96 Well - Sitting", "", "A1", "", "", ""],
      ["P1", "", "", "", "", "s", "1"]
    );
    expect(result.errors).toEqual([
      { line: 2, code: "required", column: "sample" },
      { line: 2, code: "required", column: "concentration" },
      { line: 3, code: "required", column: "well" },
    ]);
  });

  it("長すぎる値と、プレート名の無い行を拒む", () => {
    const result = run(HEADER, [
      "",
      "96 Well - Sitting",
      "",
      "A1",
      "",
      "x".repeat(201),
      "1",
    ]);
    expect(result.errors).toEqual([
      { line: 2, code: "tooLong", column: "sample" },
      { line: 2, code: "required", column: "plate_name" },
    ]);
  });
});

describe("buildPlateImport の観察", () => {
  const OBS_HEADER = [...HEADER, "observed_on", "mark", "observation_notes"];

  it("同じドロップの行を観察の数だけ並べられ、2行目以降はドロップの欄を空にできる", () => {
    const result = run(
      OBS_HEADER,
      [
        "P1",
        "96 Well - Sitting",
        "",
        "A1",
        "",
        "s",
        "1",
        "2026/8/8",
        "",
        "小さな沈殿",
      ],
      ["P1", "", "", "A1", "", "", "", "2026/8/15", "結晶あり", "針状"],
      ["P1", "", "", "A1", "1", "s", "1", "2026-08-20", "harvested", ""]
    );
    expect(result.errors).toEqual([]);
    expect(result.plates[0].drops).toEqual([
      {
        position: "A1",
        slot: 1,
        sampleName: "s",
        concentration: "1",
        notes: null,
        observations: [
          { observedAt: "2026-08-08", mark: null, notes: "小さな沈殿" },
          { observedAt: "2026-08-15", mark: "CRYSTAL", notes: "針状" },
          { observedAt: "2026-08-20", mark: "HARVESTED", notes: "" },
        ],
      },
    ]);
  });

  it("同じドロップの行でサンプル名が食い違えばエラー", () => {
    const result = run(
      HEADER,
      ["P1", "96 Well - Sitting", "", "A1", "", "s", "1"],
      ["P1", "", "", "A1", "", "t", ""]
    );
    expect(result.errors).toEqual([
      { line: 3, code: "conflict", column: "sample", value: "t" },
    ]);
  });

  it("観察日が無い・読めない、目印が無い・知らない、ウェルが無い観察を拒む", () => {
    const result = run(
      OBS_HEADER,
      ["P1", "96 Well - Sitting", "", "A1", "", "s", "1", "", "CRYSTAL", ""],
      ["P1", "", "", "A1", "", "", "", "8/15", "CRYSTAL", ""],
      ["P1", "", "", "A1", "", "", "", "2026/8/15", "", ""],
      ["P1", "", "", "A1", "", "", "", "2026/8/15", "constructor", ""],
      ["P1", "", "", "", "", "", "", "2026/8/15", "CRYSTAL", ""]
    );
    expect(result.errors.map((e) => [e.line, e.code, e.column])).toEqual([
      [2, "required", "observed_on"],
      [3, "invalidDate", "observed_on"],
      [4, "observationNeedsContent", undefined],
      [5, "invalidMark", "mark"],
      [6, "required", "well"],
    ]);
  });
});
