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
    slots: [1, 2],
    ...dropInput,
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
    slots: [1, 3],
    ...dropInput,
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
      { slot: 1, ...dropInput },
      { slot: 3, ...dropInput },
    ]);
  });

  it("ignores duplicate positions and slots instead of hitting the unique constraint", async () => {
    await createPlate({
      name: "P",
      plateTypeId: "type-1",
      drops: { ...batch, positions: ["A1", "A1"], slots: [1, 1] },
    });

    const wells = prismaMock.plate.create.mock.calls[0][0].data.wells.create;
    const a1 = wells.find((w: { position: string }) => w.position === "A1");
    expect(a1.drops.create).toEqual([{ slot: 1, ...dropInput }]);
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
        drops: { ...batch, slots: [5] },
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
