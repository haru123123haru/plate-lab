import { describe, expect, it } from "vitest";
import { decodeCsv, parseCsv, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("カンマと改行で区切る。CRLF と LF のどちらも読む", () => {
    expect(parseCsv("a,b\r\nc,d\ne,f")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it('クォートで囲んだ値は、カンマ・改行・"" を含められる', () => {
    expect(parseCsv('"a,1","b\nc","say ""hi"""\n')).toEqual([
      ["a,1", "b\nc", 'say "hi"'],
    ]);
  });

  it("先頭の BOM を外す", () => {
    expect(parseCsv("﻿plate_name\nP1")).toEqual([["plate_name"], ["P1"]]);
  });

  it("途中の空行は残し、末尾の改行では行を足さない", () => {
    expect(parseCsv("a\n\nb\n")).toEqual([["a"], [""], ["b"]]);
  });

  it("末尾の空の値を残す", () => {
    expect(parseCsv("a,\n")).toEqual([["a", ""]]);
  });
});

describe("decodeCsv", () => {
  it("UTF-8 を読む", () => {
    const bytes = new TextEncoder().encode("プレート名").buffer as ArrayBuffer;
    expect(decodeCsv(bytes)).toBe("プレート名");
  });

  it("UTF-8 として読めなければ Shift_JIS で読む", () => {
    // 「ウェル」の Shift_JIS
    const bytes = new Uint8Array([0x83, 0x45, 0x83, 0x46, 0x83, 0x8b]).buffer;
    expect(decodeCsv(bytes)).toBe("ウェル");
  });
});

describe("toCsv", () => {
  it("BOM を付け、必要な値だけクォートする", () => {
    expect(toCsv([["a", "b,c", 'd"e']])).toBe('﻿a,"b,c","d""e"\r\n');
  });

  it("parseCsv で元に戻る", () => {
    const rows = [
      ["plate_name", "drop_notes"],
      ["P1", "1行目\n2行目"],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
