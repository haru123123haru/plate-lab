import { describe, expect, it } from "vitest";
import { toTokyoDate } from "@/lib/utils";

describe("toTokyoDate", () => {
  it("日本時間の0〜9時は UTC では前日だが、日本時間の日付で返す", () => {
    // 2026-10-02 08:30 JST = 2026-10-01 23:30 UTC
    expect(toTokyoDate(new Date("2026-10-01T23:30:00Z"))).toBe("2026-10-02");
  });

  it("日本時間の9時以降は UTC と同じ日付になる", () => {
    expect(toTokyoDate(new Date("2026-10-02T03:00:00Z"))).toBe("2026-10-02");
  });
});
