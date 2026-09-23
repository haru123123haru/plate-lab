import { beforeEach, describe, expect, it, vi } from "vitest";

// Action が prisma に渡す条件そのものを検査する。
// ヘルパー単体のテストだけでは「ヘルパーを呼び忘れた Action」を検出できないため。
const prismaMock = vi.hoisted(() => ({
  plate: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  well: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => "user-a" }));

import {
  deletePlate,
  purgePlate,
  restorePlate,
  updatePlate,
} from "../lib/actions/plates";
import { updateWell } from "../lib/actions/wells";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deletePlate", () => {
  it("moves only the owner's non-trashed plate to the trash", async () => {
    prismaMock.plate.updateMany.mockResolvedValue({ count: 1 });

    const result = await deletePlate("plate-1");

    expect(result).toEqual({ success: true });
    const args = prismaMock.plate.updateMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      id: "plate-1",
      userId: "user-a",
      deletedAt: null,
    });
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });

  it("returns an error when nothing was moved", async () => {
    prismaMock.plate.updateMany.mockResolvedValue({ count: 0 });

    expect(await deletePlate("plate-1")).toEqual({ error: "Not found" });
  });
});

describe("restorePlate", () => {
  it("restores only the owner's trashed plate", async () => {
    prismaMock.plate.updateMany.mockResolvedValue({ count: 1 });

    const result = await restorePlate("plate-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.plate.updateMany).toHaveBeenCalledWith({
      where: {
        id: "plate-1",
        userId: "user-a",
        deletedAt: { not: null },
      },
      data: { deletedAt: null },
    });
  });

  it("returns an error when nothing was restored", async () => {
    prismaMock.plate.updateMany.mockResolvedValue({ count: 0 });

    expect(await restorePlate("plate-1")).toEqual({ error: "Not found" });
  });
});

describe("purgePlate", () => {
  it("deletes only the owner's trashed plate", async () => {
    prismaMock.plate.deleteMany.mockResolvedValue({ count: 1 });

    const result = await purgePlate("plate-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.plate.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "plate-1",
        userId: "user-a",
        deletedAt: { not: null },
      },
    });
  });

  it("returns an error when nothing was deleted", async () => {
    prismaMock.plate.deleteMany.mockResolvedValue({ count: 0 });

    expect(await purgePlate("plate-1")).toEqual({ error: "Not found" });
  });
});

describe("updatePlate", () => {
  it("does not update a plate that is not active", async () => {
    prismaMock.plate.findFirst.mockResolvedValue(null);

    const result = await updatePlate("plate-1", { name: "renamed" });

    expect(result).toEqual({ error: "Not found" });
    expect(prismaMock.plate.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "plate-1",
      userId: "user-a",
      deletedAt: null,
    });
    expect(prismaMock.plate.update).not.toHaveBeenCalled();
  });

  it("guards the update itself against a plate trashed meanwhile", async () => {
    prismaMock.plate.findFirst.mockResolvedValue({ id: "plate-1" });
    prismaMock.plate.update.mockResolvedValue({ id: "plate-1" });

    await updatePlate("plate-1", { name: "renamed" });

    expect(prismaMock.plate.update.mock.calls[0][0].where).toEqual({
      id: "plate-1",
      deletedAt: null,
    });
  });
});

describe("updateWell", () => {
  it("does not update a well of a trashed plate", async () => {
    prismaMock.well.findUnique.mockResolvedValue({
      id: "well-1",
      plate: { userId: "user-a", deletedAt: new Date() },
    });

    const result = await updateWell("well-1", { notes: "x" });

    expect(result).toEqual({ error: "Not found" });
    expect(prismaMock.well.update).not.toHaveBeenCalled();
  });

  it("does not update a well of another user's plate", async () => {
    prismaMock.well.findUnique.mockResolvedValue({
      id: "well-1",
      plate: { userId: "user-b", deletedAt: null },
    });

    const result = await updateWell("well-1", { notes: "x" });

    expect(result).toEqual({ error: "Not found" });
    expect(prismaMock.well.update).not.toHaveBeenCalled();
  });
});
