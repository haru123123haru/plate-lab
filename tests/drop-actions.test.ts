import { beforeEach, describe, expect, it, vi } from "vitest";

// plate-trash-actions.test.ts と同じく、Action が prisma に渡す条件そのものを検査する
const prismaMock = vi.hoisted(() => ({
  plate: { findFirst: vi.fn(), create: vi.fn() },
  plateType: { findFirst: vi.fn() },
  well: { findFirst: vi.fn() },
  drop: {
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  observation: { create: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => "user-a" }));

import {
  addObservation,
  bulkCreateDrops,
  createDrop,
  deleteDrop,
  deleteObservation,
  updateDrop,
} from "../lib/actions/drops";
import { createPlate } from "../lib/actions/plates";
import {
  isDropBatchComplete,
  toDropBatchInput,
} from "../components/bulk-drop-form";
import { countUsedWells, summarizeSamples } from "../lib/wells";

const editablePlate = { userId: "user-a", deletedAt: null };
const editableWell = { plate: editablePlate };
const editableDrop = { well: editableWell };

const dropInput = { sampleName: "Lysozyme", concentration: "10 mg/mL" };

function prismaError(code: string) {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDrop", () => {
  beforeEach(() => {
    prismaMock.well.findFirst.mockResolvedValue({
      plate: { plateType: { maxDrops: 4 } },
    });
  });

  it("checks the well and connects to it under the owner and trash guard", async () => {
    prismaMock.drop.create.mockResolvedValue({ id: "drop-1" });

    const result = await createDrop({
      wellId: "well-1",
      slot: 4,
      ...dropInput,
    });

    expect(result).toEqual({ id: "drop-1" });
    expect(prismaMock.well.findFirst.mock.calls[0][0].where).toEqual({
      id: "well-1",
      ...editableWell,
    });
    expect(prismaMock.drop.create.mock.calls[0][0].data.well).toEqual({
      connect: { id: "well-1", ...editableWell },
    });
  });

  it("rejects a slot beyond the plate type's maxDrops", async () => {
    const result = await createDrop({
      wellId: "well-1",
      slot: 5,
      ...dropInput,
    });

    expect(result).toEqual({ error: "Invalid slot" });
    expect(prismaMock.drop.create).not.toHaveBeenCalled();
  });

  it("does not create a drop on a well it cannot edit", async () => {
    prismaMock.well.findFirst.mockResolvedValue(null);

    const result = await createDrop({
      wellId: "well-1",
      slot: 1,
      ...dropInput,
    });

    expect(result).toEqual({ error: "Not found" });
    expect(prismaMock.drop.create).not.toHaveBeenCalled();
  });

  it("reports an occupied slot and a plate trashed meanwhile", async () => {
    prismaMock.drop.create.mockRejectedValueOnce(prismaError("P2002"));
    expect(
      await createDrop({ wellId: "well-1", slot: 1, ...dropInput })
    ).toEqual({ error: "Slot in use" });

    prismaMock.drop.create.mockRejectedValueOnce(prismaError("P2025"));
    expect(
      await createDrop({ wellId: "well-1", slot: 1, ...dropInput })
    ).toEqual({ error: "Not found" });
  });
});

describe("updateDrop", () => {
  it("updates only an editable drop", async () => {
    prismaMock.drop.update.mockResolvedValue({ id: "drop-1" });

    await updateDrop("drop-1", { notes: "x" });

    expect(prismaMock.drop.update.mock.calls[0][0].where).toEqual({
      id: "drop-1",
      ...editableDrop,
    });
  });

  it("does not accept a slot change", async () => {
    const result = await updateDrop("drop-1", {
      slot: 2,
    } as unknown as { notes: string });

    expect(result).toHaveProperty("error");
    expect(prismaMock.drop.update).not.toHaveBeenCalled();
  });

  it("returns an error when the drop is not editable", async () => {
    prismaMock.drop.update.mockRejectedValue(prismaError("P2025"));

    expect(await updateDrop("drop-1", { notes: "x" })).toEqual({
      error: "Not found",
    });
  });
});

describe("deleteDrop", () => {
  it("deletes only an editable drop", async () => {
    prismaMock.drop.deleteMany.mockResolvedValue({ count: 0 });

    expect(await deleteDrop("drop-1")).toEqual({ error: "Not found" });
    expect(prismaMock.drop.deleteMany).toHaveBeenCalledWith({
      where: { id: "drop-1", ...editableDrop },
    });
  });
});

describe("bulkCreateDrops", () => {
  const input = {
    plateId: "plate-1",
    positions: ["A1", "A2"],
    sampleName: "Lysozyme",
    drops: [
      { slot: 1, concentration: "10 mg/mL" },
      { slot: 2, concentration: "20 mg/mL" },
    ],
  };

  it("checks the plate owner and reports skipped duplicates", async () => {
    prismaMock.plate.findFirst.mockResolvedValue({
      plateType: { maxDrops: 4 },
      wells: [{ id: "well-1" }, { id: "well-2" }],
    });
    prismaMock.drop.createMany.mockResolvedValue({ count: 3 });

    const result = await bulkCreateDrops(input);

    expect(result).toEqual({ created: 3, skipped: 1 });
    expect(prismaMock.plate.findFirst.mock.calls[0][0].where).toEqual({
      id: "plate-1",
      ...editablePlate,
    });
    const args = prismaMock.drop.createMany.mock.calls[0][0];
    expect(args.skipDuplicates).toBe(true);
    expect(args.data).toHaveLength(4);
    // 置き場所ごとの濃度で作る
    expect(args.data.slice(0, 2)).toEqual([
      {
        wellId: "well-1",
        slot: 1,
        sampleName: "Lysozyme",
        concentration: "10 mg/mL",
      },
      {
        wellId: "well-1",
        slot: 2,
        sampleName: "Lysozyme",
        concentration: "20 mg/mL",
      },
    ]);
  });

  it("does nothing for a plate it cannot edit", async () => {
    prismaMock.plate.findFirst.mockResolvedValue(null);

    expect(await bulkCreateDrops(input)).toEqual({ error: "Not found" });
    expect(prismaMock.drop.createMany).not.toHaveBeenCalled();
  });

  it("rejects positions missing from the plate and slots beyond maxDrops", async () => {
    prismaMock.plate.findFirst.mockResolvedValueOnce({
      plateType: { maxDrops: 4 },
      wells: [{ id: "well-1" }],
    });
    expect(await bulkCreateDrops(input)).toEqual({
      error: "Invalid well position",
    });

    prismaMock.plate.findFirst.mockResolvedValueOnce({
      plateType: { maxDrops: 1 },
      wells: [{ id: "well-1" }, { id: "well-2" }],
    });
    expect(await bulkCreateDrops(input)).toEqual({ error: "Invalid slot" });
    expect(prismaMock.drop.createMany).not.toHaveBeenCalled();
  });

  it("rejects the same slot twice before touching the database", async () => {
    const slot1 = { slot: 1, concentration: "10 mg/mL" };
    expect(await bulkCreateDrops({ ...input, drops: [slot1, slot1] })).toEqual({
      error: "Duplicate slot",
    });
    expect(prismaMock.plate.findFirst).not.toHaveBeenCalled();
  });
});

describe("drop batch form helpers", () => {
  const batch = {
    positions: new Set(["1-2"]),
    sampleName: " Lysozyme ",
    drops: [
      { slot: 3, concentration: " 5 mg/mL " },
      { slot: 1, concentration: "10 mg/mL" },
    ],
  };

  it("converts to the server shape with trimmed values in slot order", () => {
    expect(toDropBatchInput(batch)).toEqual({
      positions: ["B3"],
      sampleName: "Lysozyme",
      drops: [
        { slot: 1, concentration: "10 mg/mL" },
        { slot: 3, concentration: "5 mg/mL" },
      ],
    });
    expect(
      toDropBatchInput({ ...batch, positions: new Set() })
    ).toBeUndefined();
  });

  it("is incomplete without a slot or with a blank concentration", () => {
    expect(isDropBatchComplete(batch)).toBe(true);
    expect(isDropBatchComplete({ ...batch, drops: [] })).toBe(false);
    expect(
      isDropBatchComplete({
        ...batch,
        drops: [{ slot: 1, concentration: " " }],
      })
    ).toBe(false);
    // ウェルを選ばなければ空のままでよい
    expect(
      isDropBatchComplete({ ...batch, positions: new Set(), drops: [] })
    ).toBe(true);
  });
});

describe("addObservation", () => {
  it("connects only to an editable drop and stores the date as UTC midnight", async () => {
    prismaMock.observation.create.mockResolvedValue({ id: "obs-1" });

    await addObservation({
      dropId: "drop-1",
      observedAt: "2026-09-25",
      notes: "small needles",
    });

    const { data } = prismaMock.observation.create.mock.calls[0][0];
    expect(data.drop).toEqual({ connect: { id: "drop-1", ...editableDrop } });
    expect(data.observedAt.toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });

  it("rejects a malformed date and an empty note", async () => {
    expect(
      await addObservation({
        dropId: "d",
        observedAt: "2026/09/25",
        notes: "x",
      })
    ).toHaveProperty("error");
    expect(
      await addObservation({
        dropId: "d",
        observedAt: "2026-09-25",
        notes: " ",
      })
    ).toHaveProperty("error");
    expect(prismaMock.observation.create).not.toHaveBeenCalled();
  });
});

describe("deleteObservation", () => {
  it("deletes only an observation of an editable drop", async () => {
    prismaMock.observation.deleteMany.mockResolvedValue({ count: 1 });

    expect(await deleteObservation("obs-1")).toEqual({ success: true });
    expect(prismaMock.observation.deleteMany).toHaveBeenCalledWith({
      where: { id: "obs-1", drop: editableDrop },
    });
  });
});

describe("createPlate", () => {
  const batch = {
    positions: ["A1", "B2"],
    sampleName: "Lysozyme",
    drops: [
      { slot: 1, concentration: "10 mg/mL" },
      { slot: 3, concentration: "5 mg/mL" },
    ],
  };

  beforeEach(() => {
    prismaMock.plateType.findFirst.mockResolvedValue({
      id: "type-1",
      rows: 4,
      cols: 6,
      maxDrops: 4,
    });
    prismaMock.plate.create.mockResolvedValue({ id: "plate-1" });
  });

  it("creates drops only in the chosen wells and slots", async () => {
    await createPlate({ name: "P", plateTypeId: "type-1", drops: batch });

    const wells = prismaMock.plate.create.mock.calls[0][0].data.wells.create;
    expect(wells).toHaveLength(24);
    const withDrops = wells.filter(
      (w: { drops?: unknown }) => w.drops !== undefined
    );
    expect(withDrops.map((w: { position: string }) => w.position)).toEqual([
      "A1",
      "B2",
    ]);
    expect(withDrops[0].drops.create).toEqual([
      { slot: 1, sampleName: "Lysozyme", concentration: "10 mg/mL" },
      { slot: 3, sampleName: "Lysozyme", concentration: "5 mg/mL" },
    ]);
  });

  it("ignores duplicate positions and rejects duplicate slots", async () => {
    await createPlate({
      name: "P",
      plateTypeId: "type-1",
      drops: { ...batch, positions: ["A1", "A1"] },
    });

    const wells = prismaMock.plate.create.mock.calls[0][0].data.wells.create;
    const a1 = wells.filter((w: { position: string }) => w.position === "A1");
    expect(a1).toHaveLength(1);
    expect(a1[0].drops.create).toHaveLength(2);

    // 同じ置き場所に2つの濃度が来たら、どちらを採るか決められない
    expect(
      await createPlate({
        name: "P",
        plateTypeId: "type-1",
        drops: {
          ...batch,
          drops: [
            { slot: 1, concentration: "10 mg/mL" },
            { slot: 1, concentration: "5 mg/mL" },
          ],
        },
      })
    ).toEqual({ error: "Duplicate slot" });
  });

  it("creates an empty plate without drops", async () => {
    await createPlate({ name: "P", plateTypeId: "type-1" });

    const wells = prismaMock.plate.create.mock.calls[0][0].data.wells.create;
    expect(wells.every((w: { drops?: unknown }) => !w.drops)).toBe(true);
  });

  it("rejects slots beyond maxDrops and positions outside the plate", async () => {
    expect(
      await createPlate({
        name: "P",
        plateTypeId: "type-1",
        drops: { ...batch, drops: [{ slot: 5, concentration: "1 mg/mL" }] },
      })
    ).toEqual({ error: "Invalid slot" });
    expect(
      await createPlate({
        name: "P",
        plateTypeId: "type-1",
        drops: { ...batch, positions: ["A1", "H12"] },
      })
    ).toEqual({ error: "Invalid well position" });
    expect(prismaMock.plate.create).not.toHaveBeenCalled();
  });
});

describe("countUsedWells", () => {
  it("counts wells that have at least one drop", () => {
    expect(
      countUsedWells([
        { _count: { drops: 0 } },
        { _count: { drops: 1 } },
        { _count: { drops: 4 } },
      ])
    ).toBe(2);
  });
});

describe("summarizeSamples", () => {
  it("lists each sample name once and counts every drop", () => {
    expect(
      summarizeSamples([
        { drops: [{ sampleName: "Lysozyme" }, { sampleName: "Thaumatin" }] },
        { drops: [] },
        { drops: [{ sampleName: "Lysozyme" }] },
      ])
    ).toEqual({ names: ["Lysozyme", "Thaumatin"], dropCount: 3 });
  });
});
