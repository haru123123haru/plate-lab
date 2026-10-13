import { describe, expect, it } from "vitest";
import {
  buildReminderPayload,
  daysSince,
  selectReminderPlates,
  tokyoToday,
} from "../lib/notifications";
import { parseReminderDraft } from "../components/reminder-days-field";

const date = (value: string) => new Date(`${value}T00:00:00Z`);

describe("tokyoToday", () => {
  it.each([
    ["2026-10-07T14:59:00Z", "2026-10-07"],
    ["2026-10-07T15:00:00Z", "2026-10-08"],
    ["2026-10-08T00:30:00Z", "2026-10-08"],
  ])("treats %s as %s in Japan", (now, expected) => {
    expect(tokyoToday(new Date(now))).toEqual(date(expected));
  });
});

describe("daysSince", () => {
  it("counts whole days from the setup date", () => {
    expect(daysSince(date("2026-10-01"), date("2026-10-08"))).toBe(7);
    expect(daysSince(date("2026-09-25"), date("2026-10-08"))).toBe(13);
  });
});

describe("selectReminderPlates", () => {
  const plate = (
    overrides: Partial<Parameters<typeof selectReminderPlates>[0][0]>
  ) => ({
    id: "p",
    name: "Plate",
    setupDate: date("2026-10-01"),
    reminderDays: 7,
    reminderSentFor: null,
    lastObservedAt: null,
    ...overrides,
  });
  const ids = (plates: { id: string }[]) => plates.map((p) => p.id);

  it("picks plates on their reminder day and returns that day", () => {
    expect(selectReminderPlates([plate({})], date("2026-10-08"))).toEqual([
      expect.objectContaining({ id: "p", dueDate: date("2026-10-08") }),
    ]);
  });

  it("catches up for 3 days after a missed morning, but not longer", () => {
    for (const [today, expected] of [
      ["2026-10-07", []],
      ["2026-10-09", ["p"]],
      ["2026-10-11", ["p"]],
      ["2026-10-12", []],
    ] as const) {
      expect(ids(selectReminderPlates([plate({})], date(today)))).toEqual(
        expected
      );
    }
  });

  it("skips plates turned off, already sent, or observed since the day", () => {
    const plates = [
      plate({ id: "off", reminderDays: null }),
      plate({ id: "sent", reminderSentFor: date("2026-10-08") }),
      plate({ id: "observed", lastObservedAt: date("2026-10-08") }),
      // 前に送ったのは別の日の分（日数を変えた）、観察はリマインドの日より前
      plate({
        id: "due",
        reminderSentFor: date("2026-10-04"),
        lastObservedAt: date("2026-10-07"),
      }),
    ];
    expect(ids(selectReminderPlates(plates, date("2026-10-09")))).toEqual([
      "due",
    ]);
  });
});

describe("buildReminderPayload", () => {
  it("sends nothing without plates", () => {
    expect(buildReminderPayload([], "ja")).toBeNull();
  });

  it("opens the plate when there is only one", () => {
    expect(
      buildReminderPayload([{ id: "p1", name: "A-001", reminderDays: 7 }], "ja")
    ).toEqual({
      title: "観察の時期です",
      body: "「A-001」が仕込みから 7 日目になりました。",
      url: "/plates/p1",
    });
  });

  it("keeps names with replacement patterns as they are", () => {
    expect(
      buildReminderPayload(
        [{ id: "p1", name: "Lys $& {days} $$", reminderDays: 3 }],
        "en"
      )?.body
    ).toBe('"Lys $& {days} $$" reached day 3 since setup.');
  });

  it("lists a few names and opens home when there are several", () => {
    const plates = ["A", "B", "C", "D", "E"].map((name, i) => ({
      id: `p${i}`,
      name,
      reminderDays: 7,
    }));
    expect(buildReminderPayload(plates.slice(0, 2), "en")).toEqual({
      title: "Time to observe",
      body: "2 plates are due: A, B",
      url: "/",
    });
    expect(buildReminderPayload(plates, "ja")?.body).toBe(
      "5 枚のプレートが観察どきです: A、B、C ほか 2 枚"
    );
  });

  it("stays well under the Web Push size limit with long names", () => {
    const plates = Array.from({ length: 50 }, (_, i) => ({
      id: `p${i}`,
      name: "結".repeat(200),
      reminderDays: 7,
    }));
    const payload = buildReminderPayload(plates, "ja");
    expect(
      new TextEncoder().encode(JSON.stringify(payload)).length
    ).toBeLessThan(1000);
  });
});

describe("parseReminderDraft", () => {
  it("returns null when reminders are off", () => {
    expect(parseReminderDraft({ enabled: false, days: "abc" })).toBeNull();
  });

  it.each([
    ["7", 7],
    [" 14 ", 14],
    ["365", 365],
  ])("reads %j as %i", (days, expected) => {
    expect(parseReminderDraft({ enabled: true, days })).toBe(expected);
  });

  it.each(["", "0", "366", "1.5", "-3", "seven"])("rejects %j", (days) => {
    expect(parseReminderDraft({ enabled: true, days })).toBeUndefined();
  });
});
