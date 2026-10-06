// CSV の文字列を行の配列にする（RFC 4180）。ダブルクォートで囲んだ値は、
// カンマ・改行・"" を含められる。空の行も残す（エラーの行番号を Excel の行と合わせるため）
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endRow = () => {
    row.push(field);
    rows.push(row);
    row = [];
    field = "";
  };

  // Excel の「CSV UTF-8」は先頭に BOM が付く
  const input = text.startsWith("﻿") ? text.slice(1) : text;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      endRow();
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

// ファイルの中身を文字列にする。日本語の Excel で「CSV」として保存すると
// Shift_JIS になるので、UTF-8 として読めなければ Shift_JIS で読む
export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("shift_jis").decode(bytes);
  }
}

// 値を CSV の1マスにする。カンマ・改行・" を含むときはクォートで囲む
function escapeCsvField(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// 行の配列を CSV にする。Excel で文字化けしないよう、先頭に BOM を付ける
export function toCsv(rows: string[][]): string {
  return (
    "﻿" +
    rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n") +
    "\r\n"
  );
}
