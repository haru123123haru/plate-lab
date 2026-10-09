import { describe, expect, it } from "vitest";
import { isPlateSort, sortPlates } from "../lib/plate-sort";

const plates = [
  { id: "a", setupDate: "2026-08-01", updatedAt: "2026-10-01T00:00:00.000Z" },
  { id: "b", setupDate: "2026-09-15", updatedAt: "2026-09-20T00:00:00.000Z" },
  { id: "c", setupDate: "2026-08-01", updatedAt: "2026-10-05T00:00:00.000Z" },
  { id: "d", setupDate: "2026-07-10", updatedAt: "2026-09-01T00:00:00.000Z" },
];
const ids = (list: { id: string }[]) => list.map((plate) => plate.id);

describe("sortPlates", () => {
  it("orders by the latest update", () => {
    expect(ids(sortPlates(plates, "updated"))).toEqual(["c", "a", "b", "d"]);
  });

  it("orders by setup date, newest or oldest first, then by update", () => {
    expect(ids(sortPlates(plates, "setupNewest"))).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(ids(sortPlates(plates, "setupOldest"))).toEqual([
      "d",
      "c",
      "a",
      "b",
    ]);
  });

  it("keeps similar search results after substring matches, each sorted", () => {
    const results = [
      { ...plates[0], similar: false },
      { ...plates[3], similar: true },
      { ...plates[1], similar: true },
      { ...plates[2], similar: false },
    ];
    expect(ids(sortPlates(results, "setupOldest"))).toEqual([
      "c",
      "a",
      "d",
      "b",
    ]);
    expect(ids(sortPlates(results, "setupNewest"))).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
    // 既定の並べ方では、似ているものは渡した順（似ている順）のまま
    expect(ids(sortPlates(results, "updated"))).toEqual(["c", "a", "d", "b"]);
  });

  it("does not change the given array", () => {
    const copy = [...plates];
    sortPlates(plates, "setupNewest");
    expect(plates).toEqual(copy);
  });
});

describe("isPlateSort", () => {
  it("accepts only known sorts", () => {
    expect(isPlateSort("setupNewest")).toBe(true);
    expect(isPlateSort("name")).toBe(false);
    expect(isPlateSort(null)).toBe(false);
  });
});
