import { beforeEach, describe, expect, it, vi } from "vitest";

// drop-actions.test.ts と同じく、Action が prisma に渡す条件そのものを検査する
const prismaMock = vi.hoisted(() => {
  const mock = {
    plate: { create: vi.fn() },
    plateType: { findMany: vi.fn() },
    conditionTemplate: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((fn: (tx: typeof mock) => unknown) =>
    fn(mock)
  );
  return mock;
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => "user-a" }));

import { importPlates } from "../lib/actions/plate-import";
import type { ImportPlate } from "../lib/plate-import";

const accessible = { OR: [{ isDefault: true }, { createdById: "user-a" }] };

function plate(overrides: Partial<ImportPlate> = {}): ImportPlate {
  return {
    name: "P1",
    plateTypeId: "t-2x2",
    setupDate: "2026-08-01",
    reservoirTemplateId: null,
    screeningTemplateId: null,
    notes: null,
    drops: [],
    ...overrides,
  };
}

const drop = {
  position: "A1",
  slot: 1,
  sampleName: "lysozyme",
  concentration: "10 mg/mL",
  notes: null,
  observations: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.plateType.findMany.mockResolvedValue([
    { id: "t-2x2", rows: 2, cols: 2, maxDrops: 2 },
  ]);
  prismaMock.conditionTemplate.findMany.mockResolvedValue([{ id: 1 }]);
  prismaMock.plate.create.mockResolvedValue({ id: "plate-1" });
});

describe("importPlates", () => {
  it("引けるタイプとテンプレートだけを使い、1つのトランザクションで全部作る", async () => {
    const result = await importPlates([
      plate({ reservoirTemplateId: 1, drops: [drop] }),
      plate({ name: "P2" }),
    ]);

    expect(result).toEqual({ count: 2 });
    expect(prismaMock.plateType.findMany.mock.calls[0][0].where).toEqual({
      AND: [{ id: { in: ["t-2x2"] } }, accessible],
    });
    expect(
      prismaMock.conditionTemplate.findMany.mock.calls[0][0].where
    ).toEqual({
      AND: [{ id: { in: [1] } }, accessible],
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.plate.create).toHaveBeenCalledTimes(2);

    const data = prismaMock.plate.create.mock.calls[0][0].data;
    expect(data.user).toEqual({ connect: { id: "user-a" } });
    expect(data.reservoirTemplate).toEqual({ connect: { id: 1 } });
    expect(data.screeningTemplate).toBeUndefined();
    expect(data.setupDate).toEqual(new Date("2026-08-01T00:00:00Z"));
    // タイプの形どおりにウェルを全部作り、ドロップは A1 にだけ入る
    expect(
      data.wells.create.map((w: { position: string }) => w.position)
    ).toEqual(["A1", "A2", "B1", "B2"]);
    expect(data.wells.create[0].drops.create).toHaveLength(1);
    expect(data.wells.create[1].drops).toBeUndefined();
  });

  it("観察をドロップと一緒に作る", async () => {
    await importPlates([
      plate({
        drops: [
          {
            ...drop,
            observations: [
              { observedAt: "2026-08-15", mark: "CRYSTAL", notes: "" },
              { observedAt: "2026-08-08", mark: null, notes: "沈殿" },
            ],
          },
        ],
      }),
    ]);

    const created =
      prismaMock.plate.create.mock.calls[0][0].data.wells.create[0].drops
        .create[0];
    expect(created.observations.create).toEqual([
      {
        observedAt: new Date("2026-08-15T00:00:00Z"),
        notes: "",
        mark: "CRYSTAL",
      },
      {
        observedAt: new Date("2026-08-08T00:00:00Z"),
        notes: "沈殿",
        mark: null,
      },
    ]);
  });

  it("他の人のタイプやテンプレートなら何も作らない", async () => {
    prismaMock.plateType.findMany.mockResolvedValue([]);
    expect(await importPlates([plate()])).toEqual({ error: "Not found" });

    prismaMock.plateType.findMany.mockResolvedValue([
      { id: "t-2x2", rows: 2, cols: 2, maxDrops: 2 },
    ]);
    prismaMock.conditionTemplate.findMany.mockResolvedValue([]);
    expect(await importPlates([plate({ screeningTemplateId: 9 })])).toEqual({
      error: "Not found",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("形の外のウェルと置き場所を拒む", async () => {
    expect(
      await importPlates([plate({ drops: [{ ...drop, position: "C1" }] })])
    ).toEqual({ error: "Invalid well position" });
    expect(
      await importPlates([plate({ drops: [{ ...drop, slot: 3 }] })])
    ).toEqual({ error: "Invalid slot" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("同じウェル・置き場所のドロップと、目印もメモも無い観察を拒む", async () => {
    expect(await importPlates([plate({ drops: [drop, drop] })])).toEqual({
      error: "Duplicate drop",
    });
    expect(
      await importPlates([
        plate({
          drops: [
            {
              ...drop,
              observations: [
                { observedAt: "2026-08-15", mark: null, notes: "" },
              ],
            },
          ],
        }),
      ])
    ).toEqual({ error: "Add a note or a mark" });
    expect(await importPlates([])).toHaveProperty("error");
    expect(prismaMock.plateType.findMany).not.toHaveBeenCalled();
  });
});
