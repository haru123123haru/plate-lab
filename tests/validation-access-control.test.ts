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
  updateWellSchema,
} from "../lib/validations";

describe("validation schemas", () => {
  it("accepts only supported plate type shapes", () => {
    const base = { name: "type", maxDrops: 1, layout: "SITTING" as const };
    expect(
      createPlateTypeSchema.safeParse({ ...base, rows: 4, cols: 6 }).success
    ).toBe(true);
    expect(
      createPlateTypeSchema.safeParse({ ...base, rows: 8, cols: 12 }).success
    ).toBe(true);
    // 描き方が追いつくまでは 3×5 も複数ドロップも通さない
    expect(
      createPlateTypeSchema.safeParse({ ...base, rows: 3, cols: 5 }).success
    ).toBe(false);
    expect(
      createPlateTypeSchema.safeParse({
        ...base,
        rows: 4,
        cols: 6,
        maxDrops: 4,
      }).success
    ).toBe(false);
    expect(
      createPlateTypeSchema.safeParse({ ...base, rows: 9, cols: 12 }).success
    ).toBe(false);
  });

  it("rejects duplicate and malformed filled well positions", () => {
    expect(
      createPlateSchema.safeParse({
        name: "Plate A",
        plateTypeId: "plate-type-1",
        filledPositions: ["0-0", "0-0"],
      }).success
    ).toBe(false);
    expect(
      createPlateSchema.safeParse({
        name: "Plate A",
        plateTypeId: "plate-type-1",
        filledPositions: ["A1"],
      }).success
    ).toBe(false);
  });

  it("rejects unknown keys and invalid enum values for plate and well updates", () => {
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
    expect(updateWellSchema.safeParse({ status: "INVALID" }).success).toBe(
      false
    );
    expect(
      updateWellSchema.safeParse({ status: "EMPTY", unexpected: true }).success
    ).toBe(false);
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
