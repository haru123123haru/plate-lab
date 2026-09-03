import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createPlateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  plateTypeId: z.string().trim().min(1).max(100),
  sampleName: z.string().trim().max(200).optional(),
  reservoirTemplateId: z.number().int().positive().nullable().optional(),
  screeningTemplateId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).optional(),
  filledPositions: z
    .array(
      z
        .string()
        .regex(/^(?:0|[1-9]\d*)-(?:0|[1-9]\d*)$/, "Invalid well position")
    )
    .max(96)
    .superRefine((positions, ctx) => {
      if (new Set(positions).size !== positions.length) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate well positions are not allowed",
        });
      }
    })
    .optional(),
});

export const createPlateTypeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  wellCount: z.union([z.literal(24), z.literal(96)]),
  description: z.string().max(500).optional(),
});

export const createConditionTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const createConditionSetSchema = z.object({
  name: z.string().trim().min(1).max(100),
  reservoirTemplateId: z.number().int().positive(),
  screeningTemplateId: z.number().int().positive(),
});

export const updatePlateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
    notes: z.string().max(2000).nullable().optional(),
    sampleName: z.string().max(200).nullable().optional(),
    reservoirTemplateId: z.number().int().positive().nullable().optional(),
    screeningTemplateId: z.number().int().positive().nullable().optional(),
  })
  .strict();

export const updateWellSchema = z
  .object({
    status: z
      .enum(["FILLED", "EMPTY", "CRYSTAL", "PRECIPITATE", "CLEAR"])
      .optional(),
    protein: z.string().max(200).nullable().optional(),
    concentration: z.string().max(100).nullable().optional(),
    buffer: z.string().max(200).nullable().optional(),
    ph: z.string().max(50).nullable().optional(),
    precipitant: z.string().max(500).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();

export const updateUserSettingsSchema = z
  .object({
    language: z.enum(["en", "ja"]).optional(),
    appearance: z.enum(["light", "dark", "system"]).optional(),
    notifNewPlate: z.boolean().optional(),
    notifStatus: z.boolean().optional(),
    notifReminder: z.boolean().optional(),
  })
  .strict();

export const searchPlatesSchema = z.string().max(200).transform((query) => query.trim());

export const resourceIdSchema = z.string().trim().min(1).max(100);

export const positiveIntegerSchema = z.number().int().positive();

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.string().max(100).optional(),
  email: z.string().email().optional(),
  organization: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
});
