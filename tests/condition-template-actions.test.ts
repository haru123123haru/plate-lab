import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => {
  const mock = {
    conditionTemplate: { findFirst: vi.fn() },
    templateWell: { deleteMany: vi.fn(), createMany: vi.fn() },
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
  getConditionTemplate,
  replaceConditionTemplateWells,
} from "../lib/actions/condition-templates";

const well = (position: string, salt = "LiCl") => ({
  position,
  salt,
  precipitant: "PEG",
  polyamine: "",
  buffer: "MOPS",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getConditionTemplate", () => {
  it("only finds shared or own templates", async () => {
    prismaMock.conditionTemplate.findFirst.mockResolvedValue(null);

    expect(await getConditionTemplate(5)).toBeNull();
    expect(
      prismaMock.conditionTemplate.findFirst.mock.calls[0][0].where
    ).toEqual({
      AND: [
        { id: 5 },
        { OR: [{ isDefault: true }, { createdById: "user-a" }] },
      ],
    });
  });

  it("returns null for an invalid id without querying", async () => {
    expect(await getConditionTemplate(Number("abc"))).toBeNull();
    expect(prismaMock.conditionTemplate.findFirst).not.toHaveBeenCalled();
  });

  it("returns wells sorted by position and skips unreadable ones", async () => {
    prismaMock.conditionTemplate.findFirst.mockResolvedValue({
      id: 5,
      name: "Mine",
      description: null,
      isDefault: false,
      createdById: "user-a",
      wells: [
        { position: "A10", composition: JSON.stringify(well("A10")) },
        { position: "A2", composition: '{"salt":"NaCl"}' },
        { position: "A3", composition: "not json" },
      ],
    });

    const template = await getConditionTemplate(5);
    expect(template?.isOwn).toBe(true);
    expect(template?.wells).toEqual([
      {
        position: "A2",
        salt: "NaCl",
        precipitant: "",
        polyamine: "",
        buffer: "",
      },
      {
        position: "A10",
        salt: "LiCl",
        precipitant: "PEG",
        polyamine: "",
        buffer: "MOPS",
      },
    ]);
  });

  it("marks shared templates as not own", async () => {
    prismaMock.conditionTemplate.findFirst.mockResolvedValue({
      id: 1,
      name: "PEG",
      description: null,
      isDefault: true,
      createdById: null,
      wells: [],
    });

    expect((await getConditionTemplate(1))?.isOwn).toBe(false);
  });
});

describe("replaceConditionTemplateWells", () => {
  it("returns Not found for a shared or another user's template", async () => {
    prismaMock.conditionTemplate.findFirst.mockResolvedValue(null);

    expect(await replaceConditionTemplateWells(5, [well("A1")])).toEqual({
      error: "Not found",
    });
    expect(
      prismaMock.conditionTemplate.findFirst.mock.calls[0][0].where
    ).toEqual({ id: 5, createdById: "user-a", isDefault: false });
    expect(prismaMock.templateWell.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.templateWell.createMany).not.toHaveBeenCalled();
  });

  it("replaces all wells of an own template", async () => {
    prismaMock.conditionTemplate.findFirst.mockResolvedValue({ id: 5 });

    expect(
      await replaceConditionTemplateWells(5, [well("A1"), well("B12", "NaCl")])
    ).toEqual({ success: true, count: 2 });
    expect(prismaMock.templateWell.deleteMany).toHaveBeenCalledWith({
      where: { templateId: 5 },
    });
    expect(prismaMock.templateWell.createMany).toHaveBeenCalledWith({
      data: [
        {
          templateId: 5,
          position: "A1",
          composition: JSON.stringify({
            salt: "LiCl",
            precipitant: "PEG",
            polyamine: "",
            buffer: "MOPS",
          }),
        },
        {
          templateId: 5,
          position: "B12",
          composition: JSON.stringify({
            salt: "NaCl",
            precipitant: "PEG",
            polyamine: "",
            buffer: "MOPS",
          }),
        },
      ],
    });
  });

  it.each([
    ["no wells", []],
    ["a duplicate well", [well("A1"), well("A1")]],
    ["a well off the plate", [well("I1")]],
    [
      "an empty condition",
      [{ ...well("A1"), salt: "", precipitant: "", buffer: "" }],
    ],
    ["a field that is too long", [well("A1", "x".repeat(201))]],
    ["an unknown field", [{ ...well("A1"), extra: "x" }]],
    [
      "more than 96 wells",
      Array.from({ length: 97 }, (_, i) => well(`A${(i % 12) + 1}`)),
    ],
  ])("rejects %s before touching the database", async (_, wells) => {
    expect(
      await replaceConditionTemplateWells(5, wells as ReturnType<typeof well>[])
    ).toEqual({ error: "Invalid input" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
