import { beforeEach, describe, expect, it, vi } from "vitest";

// Action が prisma に渡す条件と、部分一致と似ているものの並べ方を検査する
const prismaMock = vi.hoisted(() => ({
  plate: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => "user-a" }));

import { searchPlates } from "../lib/actions/plates";

const visiblePlateWhere = {
  userId: "user-a",
  deletedAt: null,
  plateType: { OR: [{ isDefault: true }, { createdById: "user-a" }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.plate.findMany.mockResolvedValue([]);
  prismaMock.$queryRaw.mockResolvedValue([]);
});

describe("searchPlates", () => {
  it("lists every visible plate for an empty query without fuzzy search", async () => {
    await searchPlates("  ");
    expect(prismaMock.plate.findMany.mock.calls[0][0].where).toEqual(
      visiblePlateWhere
    );
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it("puts substring matches first and similar plates after them, most similar first", async () => {
    prismaMock.plate.findMany
      .mockResolvedValueOnce([{ id: "plate-1" }])
      .mockResolvedValueOnce([{ id: "plate-2" }, { id: "plate-3" }]);
    // 似ている順。plate-1 は部分一致にもあるので、二度は出さない
    prismaMock.$queryRaw.mockResolvedValue([
      { id: "plate-3" },
      { id: "plate-1" },
      { id: "plate-2" },
    ]);

    expect(await searchPlates(" lysozme ")).toEqual([
      { id: "plate-1", similar: false },
      { id: "plate-3", similar: true },
      { id: "plate-2", similar: true },
    ]);
    // 似ているものにも、持ち主・ゴミ箱・タイプの条件をかけ直す
    expect(prismaMock.plate.findMany.mock.calls[1][0].where).toEqual({
      ...visiblePlateWhere,
      id: { in: ["plate-3", "plate-2"] },
    });
    // 検索語と持ち主はパラメータとして渡す
    const [sql, ...values] = prismaMock.$queryRaw.mock.calls[0];
    expect(sql.join("?")).toContain("word_similarity");
    expect(values).toContain("user-a");
    expect(values).toContain("lysozme");
  });

  it("skips the second query when nothing new is similar", async () => {
    prismaMock.plate.findMany.mockResolvedValueOnce([{ id: "plate-1" }]);
    prismaMock.$queryRaw.mockResolvedValue([{ id: "plate-1" }]);

    expect(await searchPlates("Lysozyme")).toEqual([
      { id: "plate-1", similar: false },
    ]);
    expect(prismaMock.plate.findMany).toHaveBeenCalledTimes(1);
  });

  it("still returns substring matches when the fuzzy query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.plate.findMany.mockResolvedValueOnce([{ id: "plate-1" }]);
    prismaMock.$queryRaw.mockRejectedValue(
      new Error("function word_similarity(text, text) does not exist")
    );

    expect(await searchPlates("lysozme")).toEqual([
      { id: "plate-1", similar: false },
    ]);
  });

  it("uses only substring matching for short queries", async () => {
    await searchPlates("ly");
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(prismaMock.plate.findMany).toHaveBeenCalledTimes(1);
  });
});
