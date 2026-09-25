import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  plateType: { findFirst: vi.fn(), delete: vi.fn() },
  plate: { count: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => "user-a" }));

import { deletePlateType } from "../lib/actions/plate-types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deletePlateType", () => {
  it("returns Not found before counting for another user's or a shared type", async () => {
    prismaMock.plateType.findFirst.mockResolvedValue(null);

    expect(await deletePlateType("type-1")).toEqual({ error: "Not found" });
    expect(prismaMock.plateType.findFirst.mock.calls[0][0].where).toEqual({
      id: "type-1",
      createdById: "user-a",
      isDefault: false,
    });
    expect(prismaMock.plate.count).not.toHaveBeenCalled();
    expect(prismaMock.plateType.delete).not.toHaveBeenCalled();
  });

  it("does not delete a type in use and returns the count, trash included", async () => {
    prismaMock.plateType.findFirst.mockResolvedValue({ id: "type-1" });
    prismaMock.plate.count.mockResolvedValue(2);

    expect(await deletePlateType("type-1")).toEqual({
      error: "In use",
      count: 2,
    });
    // deletedAt で絞らない（ゴミ箱のプレートも数える）
    expect(prismaMock.plate.count).toHaveBeenCalledWith({
      where: { plateTypeId: "type-1" },
    });
    expect(prismaMock.plateType.delete).not.toHaveBeenCalled();
  });

  it("deletes an unused type", async () => {
    prismaMock.plateType.findFirst.mockResolvedValue({ id: "type-1" });
    prismaMock.plate.count.mockResolvedValue(0);
    prismaMock.plateType.delete.mockResolvedValue({ id: "type-1" });

    expect(await deletePlateType("type-1")).toEqual({ success: true });
    expect(prismaMock.plateType.delete).toHaveBeenCalledWith({
      where: { id: "type-1" },
    });
  });

  it("returns In use without a count when the foreign key rejects the delete", async () => {
    prismaMock.plateType.findFirst.mockResolvedValue({ id: "type-1" });
    prismaMock.plate.count.mockResolvedValue(0);
    prismaMock.plateType.delete.mockRejectedValue({ code: "P2003" });

    expect(await deletePlateType("type-1")).toEqual({ error: "In use" });
  });

  it("returns Not found when the type was deleted in the meantime", async () => {
    prismaMock.plateType.findFirst.mockResolvedValue({ id: "type-1" });
    prismaMock.plate.count.mockResolvedValue(0);
    prismaMock.plateType.delete.mockRejectedValue({ code: "P2025" });

    expect(await deletePlateType("type-1")).toEqual({ error: "Not found" });
  });

  it("rethrows other errors", async () => {
    prismaMock.plateType.findFirst.mockResolvedValue({ id: "type-1" });
    prismaMock.plate.count.mockResolvedValue(0);
    prismaMock.plateType.delete.mockRejectedValue(new Error("boom"));

    await expect(deletePlateType("type-1")).rejects.toThrow("boom");
  });
});
