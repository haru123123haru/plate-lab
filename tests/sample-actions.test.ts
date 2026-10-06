import { beforeEach, describe, expect, it, vi } from "vitest";

// トランザクションの中で呼ぶ prisma も同じ mock にする
const prismaMock = vi.hoisted(() => {
  const mock = {
    drop: {
      groupBy: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    sample: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((fn: (tx: typeof mock) => unknown) =>
    fn(mock)
  );
  return mock;
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => "user-a" }));

import {
  getSampleStyles,
  getSamples,
  mergeSamples,
  updateSample,
} from "../lib/actions/samples";

// ゴミ箱も含めた自分のプレートのドロップ
const ownDrops = (sampleName: string) => ({
  sampleName,
  well: { plate: { userId: "user-a" } },
});

const input = {
  name: "Lysozym",
  newName: "Lysozyme",
  icon: "dna",
  color: "blue",
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.drop.findFirst.mockResolvedValue(null);
});

describe("getSamples", () => {
  it("lists names from drops of active plates and overlays stored styles", async () => {
    prismaMock.drop.groupBy.mockResolvedValue([
      { sampleName: "Thaumatin", _count: { _all: 2 } },
      { sampleName: "Lysozyme", _count: { _all: 5 } },
    ]);
    prismaMock.sample.findMany.mockResolvedValue([
      { name: "Lysozyme", icon: "dna", color: "blue" },
      // ドロップの無いサンプルの行は一覧に出さない
      { name: "Insulin", icon: "gem", color: "red" },
    ]);

    expect(await getSamples()).toEqual([
      {
        name: "Lysozyme",
        dropCount: 5,
        style: { icon: "dna", color: "blue" },
      },
      {
        name: "Thaumatin",
        dropCount: 2,
        style: { icon: "flask", color: "gray" },
      },
    ]);
    expect(prismaMock.drop.groupBy.mock.calls[0][0].where).toEqual({
      well: { plate: { userId: "user-a", deletedAt: null } },
    });
    expect(prismaMock.sample.findMany.mock.calls[0][0].where).toEqual({
      userId: "user-a",
    });
  });
});

describe("getSampleStyles", () => {
  it("falls back to the default for values no longer in the candidates", async () => {
    prismaMock.sample.findMany.mockResolvedValue([
      { name: "Lysozyme", icon: "skull", color: "blue" },
    ]);

    expect(await getSampleStyles()).toEqual({
      Lysozyme: { icon: "flask", color: "blue" },
    });
  });
});

describe("updateSample", () => {
  it("rejects icons outside the candidates without touching the DB", async () => {
    expect(await updateSample({ ...input, icon: "skull" })).toEqual({
      error: "Invalid input",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("upserts only the style when the name is unchanged", async () => {
    expect(await updateSample({ ...input, newName: "Lysozym" })).toEqual({
      success: true,
    });
    expect(prismaMock.drop.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.sample.upsert).toHaveBeenCalledWith({
      where: { userId_name: { userId: "user-a", name: "Lysozym" } },
      create: { userId: "user-a", name: "Lysozym", icon: "dna", color: "blue" },
      update: { icon: "dna", color: "blue" },
    });
  });

  it("renames the drops of the user's plates, trash included, and moves the style", async () => {
    expect(await updateSample(input)).toEqual({ success: true });
    expect(prismaMock.drop.updateMany).toHaveBeenCalledWith({
      where: ownDrops("Lysozym"),
      data: { sampleName: "Lysozyme" },
    });
    expect(prismaMock.sample.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-a", name: "Lysozym" },
    });
    expect(prismaMock.sample.upsert.mock.calls[0][0].where).toEqual({
      userId_name: { userId: "user-a", name: "Lysozyme" },
    });
  });

  it("asks before merging into an existing sample and changes nothing", async () => {
    prismaMock.drop.findFirst.mockResolvedValue({ id: "drop-9" });
    prismaMock.drop.count.mockResolvedValue(3);

    expect(await updateSample(input)).toEqual({
      needsMerge: true,
      dropCount: 3,
    });
    expect(prismaMock.drop.findFirst.mock.calls[0][0].where).toEqual(
      ownDrops("Lysozyme")
    );
    expect(prismaMock.drop.count).toHaveBeenCalledWith({
      where: ownDrops("Lysozym"),
    });
    expect(prismaMock.drop.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.sample.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.sample.upsert).not.toHaveBeenCalled();
  });

  it("overwrites a leftover style row of a name with no drops instead of merging", async () => {
    expect(await updateSample(input)).toEqual({ success: true });
    expect(prismaMock.drop.count).not.toHaveBeenCalled();
    expect(prismaMock.sample.upsert).toHaveBeenCalledWith({
      where: { userId_name: { userId: "user-a", name: "Lysozyme" } },
      create: {
        userId: "user-a",
        name: "Lysozyme",
        icon: "dna",
        color: "blue",
      },
      update: { icon: "dna", color: "blue" },
    });
  });

  it("merges and keeps the target's style", async () => {
    prismaMock.drop.findFirst.mockResolvedValue({ id: "drop-9" });

    expect(await updateSample({ ...input, merge: true })).toEqual({
      success: true,
    });
    expect(prismaMock.drop.updateMany).toHaveBeenCalledWith({
      where: ownDrops("Lysozym"),
      data: { sampleName: "Lysozyme" },
    });
    expect(prismaMock.sample.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-a", name: "Lysozym" },
    });
    expect(prismaMock.sample.upsert).not.toHaveBeenCalled();
  });
});

describe("mergeSamples", () => {
  it("renames the drops of every name, trash included, in one transaction", async () => {
    expect(
      await mergeSamples({ from: ["lysozyme", "LYSOZYME"], into: "Lysozyme" })
    ).toEqual({ success: true });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.drop.updateMany).toHaveBeenCalledWith({
      where: {
        sampleName: { in: ["lysozyme", "LYSOZYME"] },
        well: { plate: { userId: "user-a" } },
      },
      data: { sampleName: "Lysozyme" },
    });
    // まとめた名前の見た目の行だけ消し、残す名前の見た目は触らない
    expect(prismaMock.sample.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-a", name: { in: ["lysozyme", "LYSOZYME"] } },
    });
    expect(prismaMock.sample.upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["no names to merge", { from: [], into: "Lysozyme" }],
    ["the kept name among them", { from: ["Lysozyme"], into: "Lysozyme" }],
    ["an empty kept name", { from: ["lysozyme"], into: " " }],
    ["names that are not variants", { from: ["Thaumatin"], into: "Lysozyme" }],
  ])("rejects %s without touching the DB", async (_, input) => {
    expect(await mergeSamples(input)).toEqual({ error: "Invalid input" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
