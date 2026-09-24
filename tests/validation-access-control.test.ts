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
  createPlateSchema,
  createPlateTypeSchema,
  updatePlateSchema,
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
    const plate = { name: "Plate A", plateTypeId: "plate-type-1" };
    const drops = {
      positions: ["A1", "H12"],
      slots: [1],
      sampleName: "Lysozyme",
      concentration: "10 mg/mL",
    };
    expect(createPlateSchema.safeParse(plate).success).toBe(true);
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
      createPlateSchema.safeParse({ ...plate, drops: { ...drops, slots: [] } })
        .success
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
