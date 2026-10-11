import { describe, expect, it } from "vitest";
import {
  buildConditionImport,
  compareWellPosition,
} from "../lib/condition-import";

const HEADER = ["well", "salt", "precipitant", "polyamine", "buffer"];

describe("buildConditionImport", () => {
  it("reads rows into wells sorted A1, A2, …, B1", () => {
    const result = buildConditionImport([
      HEADER,
      ["B1", "NaCl", "PEG", "", "MOPS"],
      ["a10", "LiCl", "PEG", "Spermine", "MOPS"],
      ["A2", "LiCl", "", "", ""],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.wells.map((w) => w.position)).toEqual(["A2", "A10", "B1"]);
    expect(result.wells[1]).toEqual({
      position: "A10",
      salt: "LiCl",
      precipitant: "PEG",
      polyamine: "Spermine",
      buffer: "MOPS",
    });
  });

  it("accepts Japanese headers in any order and ignores unknown columns", () => {
    const result = buildConditionImport([
      ["メモ", "バッファー", "ウェル", "塩"],
      ["x", "MOPS", "A1", "LiCl"],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.wells).toEqual([
      {
        position: "A1",
        salt: "LiCl",
        precipitant: "",
        polyamine: "",
        buffer: "MOPS",
      },
    ]);
  });

  it("skips blank rows and reports an empty file", () => {
    expect(buildConditionImport([HEADER, ["", "", ""]]).errors).toEqual([
      { line: null, code: "empty" },
    ]);
  });

  it("needs the well column", () => {
    expect(buildConditionImport([["salt"], ["LiCl"]]).errors).toEqual([
      { line: null, code: "missingColumn", column: "well" },
    ]);
  });

  it("rejects more than 96 rows", () => {
    const rows = Array.from({ length: 97 }, () => ["A1", "LiCl", "", "", ""]);
    expect(buildConditionImport([HEADER, ...rows]).errors).toEqual([
      { line: null, code: "tooManyRows" },
    ]);
  });

  it("reports every bad row with its Excel line and imports nothing", () => {
    const result = buildConditionImport([
      HEADER,
      ["A1", "LiCl", "", "", ""],
      ["", "LiCl", "", "", ""],
      ["I1", "LiCl", "", "", ""],
      ["A13", "LiCl", "", "", ""],
      ["A1", "NaCl", "", "", ""],
      ["A3", "", "", "", ""],
      ["A4", "x".repeat(201), "", "", ""],
    ]);

    expect(result.wells).toEqual([]);
    expect(result.errors).toEqual([
      { line: 3, code: "required", column: "well" },
      { line: 4, code: "invalidWell", value: "I1" },
      { line: 5, code: "invalidWell", value: "A13" },
      { line: 6, code: "duplicateWell", value: "A1" },
      { line: 7, code: "emptyCondition" },
      { line: 8, code: "tooLong", column: "salt" },
    ]);
  });
});

describe("compareWellPosition", () => {
  it("orders by row, then by column number", () => {
    expect(["B1", "A10", "A2", "A1"].sort(compareWellPosition)).toEqual([
      "A1",
      "A2",
      "A10",
      "B1",
    ]);
  });
});
