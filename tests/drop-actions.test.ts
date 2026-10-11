import { beforeEach, describe, expect, it, vi } from "vitest";

// plate-trash-actions.test.ts と同じく、Action が prisma に渡す条件そのものを検査する
const prismaMock = vi.hoisted(() => {
  const mock = {
    plate: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    plateType: { findFirst: vi.fn() },
    well: { findFirst: vi.fn() },
    drop: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    observation: { create: vi.fn(), deleteMany: vi.fn() },
    sample: { upsert: vi.fn() },
    // トランザクションの中でも同じモックを使う
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
  addObservation,
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
import { bestMark, countUsedWells, summarizeSamples } from "../lib/wells";

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

  it("moves the plate's updatedAt only for the owner's active plate", async () => {
    prismaMock.drop.create.mockResolvedValue({ id: "drop-1" });

    await createDrop({ wellId: "well-1", slot: 1, ...dropInput });

    const touch = prismaMock.plate.updateMany.mock.calls[0][0];
    expect(touch.where).toEqual({
      userId: "user-a",
      deletedAt: null,
      wells: { some: { id: "well-1" } },
    });
    expect(touch.data.updatedAt).toBeInstanceOf(Date);
  });

  it("does not move updatedAt when the drop was not created", async () => {
    prismaMock.drop.create.mockRejectedValue({ code: "P2002" });

    expect(
      await createDrop({ wellId: "well-1", slot: 1, ...dropInput })
    ).toEqual({ error: "Slot in use" });
    expect(prismaMock.plate.updateMany).not.toHaveBeenCalled();
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
    expect(data.mark).toBeNull();
  });

  it("stores a mark, and accepts a mark without a note", async () => {
    prismaMock.observation.create.mockResolvedValue({ id: "obs-1" });

    await addObservation({
      dropId: "drop-1",
      observedAt: "2026-09-25",
      notes: " ",
      mark: "CRYSTAL",
    });

    const { data } = prismaMock.observation.create.mock.calls[0][0];
    expect(data.mark).toBe("CRYSTAL");
    expect(data.notes).toBe("");
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
    await createPlate({
      name: "P",
      plateTypeId: "type-1",
      setupDate: "2026-09-25",
      drops: batch,
    });

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

  it("saves the chosen sample style with the plate", async () => {
    await createPlate({
      name: "P",
      plateTypeId: "type-1",
      setupDate: "2026-09-25",
      drops: { ...batch, style: { icon: "dna", color: "blue" } },
    });

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

  it("leaves sample styles alone without a chosen style", async () => {
    await createPlate({
      name: "P",
      plateTypeId: "type-1",
      setupDate: "2026-09-25",
      drops: batch,
    });

    expect(prismaMock.plate.create).toHaveBeenCalled();
    expect(prismaMock.sample.upsert).not.toHaveBeenCalled();
  });

  it("rejects a style that is not a candidate", async () => {
    expect(
      await createPlate({
        name: "P",
        plateTypeId: "type-1",
        setupDate: "2026-09-25",
        drops: { ...batch, style: { icon: "rocket", color: "blue" } },
      })
    ).toHaveProperty("error");
    expect(prismaMock.plate.create).not.toHaveBeenCalled();
  });

  it("ignores duplicate positions and rejects duplicate slots", async () => {
    await createPlate({
      name: "P",
      plateTypeId: "type-1",
      setupDate: "2026-09-25",
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
        setupDate: "2026-09-25",
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
    await createPlate({
      name: "P",
      plateTypeId: "type-1",
      setupDate: "2026-09-25",
    });

    const wells = prismaMock.plate.create.mock.calls[0][0].data.wells.create;
    expect(wells.every((w: { drops?: unknown }) => !w.drops)).toBe(true);
  });

  it("stores the setup date as UTC midnight and rejects a malformed one", async () => {
    await createPlate({
      name: "P",
      plateTypeId: "type-1",
      setupDate: "2026-09-25",
    });

    const { data } = prismaMock.plate.create.mock.calls[0][0];
    expect(data.setupDate.toISOString()).toBe("2026-09-25T00:00:00.000Z");
    expect(
      await createPlate({
        name: "P",
        plateTypeId: "type-1",
        setupDate: "2026/09/25",
      })
    ).toHaveProperty("error");
  });

  it("rejects slots beyond maxDrops and positions outside the plate", async () => {
    expect(
      await createPlate({
        name: "P",
        plateTypeId: "type-1",
        setupDate: "2026-09-25",
        drops: { ...batch, drops: [{ slot: 5, concentration: "1 mg/mL" }] },
      })
    ).toEqual({ error: "Invalid slot" });
    expect(
      await createPlate({
        name: "P",
        plateTypeId: "type-1",
        setupDate: "2026-09-25",
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

describe("bestMark", () => {
  it("returns the best mark regardless of order, and keeps it after unmarked observations", () => {
    expect(
      bestMark([{ mark: null }, { mark: "CRYSTAL" }, { mark: "POSSIBLE" }])
    ).toBe("CRYSTAL");
    expect(bestMark([{ mark: "HARVESTED" }, { mark: "CRYSTAL" }])).toBe(
      "HARVESTED"
    );
    expect(bestMark([{ mark: null }])).toBeNull();
    expect(bestMark([])).toBeNull();
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
