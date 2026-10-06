import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  accessibleConditionSetWhere,
  accessibleConditionTemplateWhere,
  accessiblePlateTypeWhere,
  activePlateWhere,
  trashedPlateWhere,
} from "../lib/access-control";
import {
  addObservationSchema,
  createPlateSchema,
  createPlateTypeSchema,
  updatePlateSchema,
  updateSampleSchema,
  updateUserSettingsSchema,
} from "../lib/validations";

describe("validation schemas", () => {
  it("accepts only plate type shapes that can be drawn", () => {
    const parse = (
      rows: number,
      cols: number,
      layout: "SITTING" | "HANGING",
      maxDrops: number
    ) =>
      createPlateTypeSchema.safeParse({
        name: "type",
        rows,
        cols,
        layout,
        maxDrops,
      }).success;

    expect(parse(8, 12, "SITTING", 1)).toBe(true);
    expect(parse(4, 6, "HANGING", 1)).toBe(true);
    expect(parse(4, 6, "SITTING", 4)).toBe(true);
    expect(parse(3, 5, "HANGING", 3)).toBe(true);
    // 描き方の無い組み合わせ
    expect(parse(4, 6, "HANGING", 4)).toBe(false);
    expect(parse(3, 5, "SITTING", 3)).toBe(false);
    expect(parse(4, 6, "SITTING", 2)).toBe(false);
    // 行ラベルは A〜H まで
    expect(parse(9, 12, "SITTING", 1)).toBe(false);
  });

  it("requires a complete drop batch when creating a plate with drops", () => {
    const plate = {
      name: "Plate A",
      plateTypeId: "plate-type-1",
      setupDate: "2026-09-25",
    };
    const drops = {
      positions: ["A1", "H12"],
      sampleName: "Lysozyme",
      drops: [{ slot: 1, concentration: "10 mg/mL" }],
    };
    expect(createPlateSchema.safeParse(plate).success).toBe(true);
    // 仕込み日は必須で、"YYYY-MM-DD" だけ受ける
    expect(
      createPlateSchema.safeParse({ ...plate, setupDate: undefined }).success
    ).toBe(false);
    expect(
      createPlateSchema.safeParse({ ...plate, setupDate: "2026/09/25" }).success
    ).toBe(false);
    expect(createPlateSchema.safeParse({ ...plate, drops }).success).toBe(true);
    // 位置は "A1" 形式だけ。WellGridSelector の "0-0" 形式はフォーム側で変換する
    expect(
      createPlateSchema.safeParse({
        ...plate,
        drops: { ...drops, positions: ["0-0"] },
      }).success
    ).toBe(false);
    expect(
      createPlateSchema.safeParse({
        ...plate,
        drops: { ...drops, sampleName: " " },
      }).success
    ).toBe(false);
    expect(
      createPlateSchema.safeParse({ ...plate, drops: { ...drops, drops: [] } })
        .success
    ).toBe(false);
    // 置き場所ごとの濃度は空にできず、同じ置き場所は2回来ない
    expect(
      createPlateSchema.safeParse({
        ...plate,
        drops: { ...drops, drops: [{ slot: 1, concentration: " " }] },
      }).success
    ).toBe(false);
    expect(
      createPlateSchema.safeParse({
        ...plate,
        drops: {
          ...drops,
          drops: [
            { slot: 1, concentration: "10 mg/mL" },
            { slot: 1, concentration: "5 mg/mL" },
          ],
        },
      }).success
    ).toBe(false);
  });

  it("rejects unknown keys and invalid enum values for plate updates", () => {
    expect(
      updatePlateSchema.safeParse({ name: "plate", unexpected: true }).success
    ).toBe(false);
    // アーカイブ廃止で status は受け付けない（ゴミ箱に一本化）
    expect(updatePlateSchema.safeParse({ status: "ACTIVE" }).success).toBe(
      false
    );
    expect(updatePlateSchema.safeParse({ status: "ARCHIVED" }).success).toBe(
      false
    );
  });

  it("accepts only supported settings values", () => {
    expect(
      updateUserSettingsSchema.safeParse({
        language: "ja",
        appearance: "system",
        notifStatus: false,
      }).success
    ).toBe(true);
    expect(updateUserSettingsSchema.safeParse({ language: "fr" }).success).toBe(
      false
    );
    expect(
      updateUserSettingsSchema.safeParse({ appearance: "sepia" }).success
    ).toBe(false);
  });

  it("requires an observation to have a note or a mark, and only known marks", () => {
    const parse = (fields: object) =>
      addObservationSchema.safeParse({
        dropId: "drop-1",
        observedAt: "2026-10-05",
        ...fields,
      }).success;

    expect(parse({ notes: "needles" })).toBe(true);
    expect(parse({ notes: "", mark: "HARVESTED" })).toBe(true);
    expect(parse({ notes: " ", mark: null })).toBe(false);
    expect(parse({ notes: "" })).toBe(false);
    expect(parse({ notes: "x", mark: "PRECIPITATE" })).toBe(false);
  });

  it("accepts sample icons and colors from the candidates only", () => {
    const parse = (fields: Record<string, unknown>) =>
      updateSampleSchema.safeParse({
        name: "Lysozym",
        newName: "Lysozyme",
        icon: "dna",
        color: "blue",
        ...fields,
      }).success;

    expect(parse({})).toBe(true);
    expect(parse({ merge: true })).toBe(true);
    expect(parse({ icon: "skull" })).toBe(false);
    expect(parse({ color: "#ff0000" })).toBe(false);
    expect(parse({ newName: "  " })).toBe(false);
    expect(parse({ userId: "user-b" })).toBe(false);
  });
});

describe("access-control predicates", () => {
  it("allow defaults or the matching owner only", () => {
    const templateWhere = accessibleConditionTemplateWhere("user-a");
    const setWhere = accessibleConditionSetWhere("user-a");
    const plateTypeWhere = accessiblePlateTypeWhere("user-a");

    expect(templateWhere).toEqual({
      OR: [{ isDefault: true }, { createdById: "user-a" }],
    });
    expect(setWhere).toEqual({
      OR: [{ isDefault: true }, { createdById: "user-a" }],
    });
    expect(plateTypeWhere).toEqual({
      OR: [{ isDefault: true }, { createdById: "user-a" }],
    });
    expect(templateWhere).not.toEqual(
      accessibleConditionTemplateWhere("user-b")
    );
  });

  it("limits active plates to the owner's non-trashed plates", () => {
    expect(activePlateWhere("user-a")).toEqual({
      userId: "user-a",
      deletedAt: null,
    });
  });

  it("limits trashed plates to the owner's trashed plates", () => {
    expect(trashedPlateWhere("user-a")).toEqual({
      userId: "user-a",
      deletedAt: { not: null },
    });
  });
});
