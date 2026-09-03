import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  accessibleConditionSetWhere,
  accessibleConditionTemplateWhere,
  accessiblePlateTypeWhere,
} from "../lib/access-control";
import {
  createPlateSchema,
  createPlateTypeSchema,
  updatePlateSchema,
  updateUserSettingsSchema,
  updateWellSchema,
} from "../lib/validations";

describe("validation schemas", () => {
  it("accepts only supported plate type well counts", () => {
    expect(
      createPlateTypeSchema.safeParse({ name: "24 well", wellCount: 24 })
        .success
    ).toBe(true);
    expect(
      createPlateTypeSchema.safeParse({ name: "96 well", wellCount: 96 })
        .success
    ).toBe(true);
    expect(
      createPlateTypeSchema.safeParse({ name: "48 well", wellCount: 48 })
        .success
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
    expect(updatePlateSchema.safeParse({ status: "INVALID" }).success).toBe(
      false
    );
    expect(
      updatePlateSchema.safeParse({ status: "ACTIVE", unexpected: true })
        .success
    ).toBe(false);
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
});
