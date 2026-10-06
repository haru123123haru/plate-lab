import { describe, expect, it } from "vitest";
import { findSampleDuplicates, sampleNameKey } from "../lib/samples";

describe("sampleNameKey", () => {
  it("ignores width, case, spaces and separators", () => {
    expect(sampleNameKey("ＨＥＷＬ")).toBe("hewl");
    expect(sampleNameKey(" Lysozyme ")).toBe("lysozyme");
    expect(sampleNameKey("T4-lysozyme")).toBe(sampleNameKey("t4 Lysozyme"));
    expect(sampleNameKey("Protein_A.1")).toBe(sampleNameKey("protein a １"));
  });

  it("keeps spelling differences apart", () => {
    expect(sampleNameKey("Lysozym")).not.toBe(sampleNameKey("Lysozyme"));
    expect(sampleNameKey("Lysozyme A")).not.toBe(sampleNameKey("Lysozyme B"));
  });
});

describe("findSampleDuplicates", () => {
  it("groups names that differ only by notation", () => {
    const samples = [
      { name: "Insulin", dropCount: 1 },
      { name: "insulin", dropCount: 3 },
      { name: "lysozyme", dropCount: 2 },
      { name: "Lysozyme", dropCount: 5 },
      { name: "LYSOZYME", dropCount: 2 },
      { name: "Thaumatin", dropCount: 4 },
    ];

    expect(findSampleDuplicates(samples)).toEqual([
      // グループは渡した順、グループの中はドロップの多い順（同じ数なら渡した順）
      [
        { name: "insulin", dropCount: 3 },
        { name: "Insulin", dropCount: 1 },
      ],
      [
        { name: "Lysozyme", dropCount: 5 },
        { name: "lysozyme", dropCount: 2 },
        { name: "LYSOZYME", dropCount: 2 },
      ],
    ]);
  });

  it("returns nothing when every name is distinct", () => {
    expect(
      findSampleDuplicates([
        { name: "Lysozyme", dropCount: 1 },
        { name: "Lysozym", dropCount: 1 },
      ])
    ).toEqual([]);
  });
});
