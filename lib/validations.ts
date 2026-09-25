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

const dropFieldsSchema = z.object({
  sampleName: z.string().trim().min(1).max(200),
  concentration: z.string().trim().min(1).max(100),
  notes: z.string().max(2000).nullable().optional(),
});

const slotSchema = z.number().int().min(1);

export const createDropSchema = dropFieldsSchema.extend({
  wellId: z.string().trim().min(1).max(100),
  slot: slotSchema,
});

// slot は受け付けない。置き場所を変えたいときは消して作り直す
export const updateDropSchema = dropFieldsSchema.partial().strict();

// 同じサンプルを複数のウェル・置き場所へまとめて入れる内容
const dropBatchSchema = z.object({
  // ウェルの位置ラベル（"A1" など）
  positions: z
    .array(z.string().regex(/^[A-H](?:[1-9]|1[0-2])$/, "Invalid well position"))
    .min(1)
    .max(96),
  sampleName: dropFieldsSchema.shape.sampleName,
  // 置き場所ごとの濃度。同じ置き場所が2回来たらどちらを採るか決められないので拒否する
  drops: z
    .array(
      z.object({
        slot: slotSchema,
        concentration: dropFieldsSchema.shape.concentration,
      })
    )
    .min(1)
    .max(4)
    .refine(
      (drops) => new Set(drops.map((d) => d.slot)).size === drops.length,
      { message: "Duplicate slot" }
    ),
});

export const bulkCreateDropsSchema = dropBatchSchema.extend({
  plateId: z.string().trim().min(1).max(100),
});

export const createPlateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  plateTypeId: z.string().trim().min(1).max(100),
  reservoirTemplateId: z.number().int().positive().nullable().optional(),
  screeningTemplateId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).optional(),
  // 作成と同時に入れるドロップ。ウェルを選ばなければ省く
  drops: dropBatchSchema.optional(),
});

export const createPlateTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    // 行ラベルが A〜H なので行は8まで
    rows: z.number().int().min(1).max(8),
    cols: z.number().int().min(1).max(12),
    maxDrops: z.number().int().min(1).max(4),
    layout: z.enum(["SITTING", "HANGING"]),
    description: z.string().max(500).optional(),
  })
  // 描き方があるのは、1ドロップ・SITTING の4ドロップ・HANGING の3ドロップだけ
  .refine(
    ({ layout, maxDrops }) =>
      maxDrops === 1 ||
      (layout === "SITTING" && maxDrops === 4) ||
      (layout === "HANGING" && maxDrops === 3),
    { message: "Unsupported plate shape" }
  );

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
    notes: z.string().max(2000).nullable().optional(),
    reservoirTemplateId: z.number().int().positive().nullable().optional(),
    screeningTemplateId: z.number().int().positive().nullable().optional(),
  })
  .strict();

// 観察日は日付だけ。Date で送ると日本時間の0〜9時が UTC で前日になるので文字列で受ける
export const addObservationSchema = z.object({
  dropId: z.string().trim().min(1).max(100),
  observedAt: z.iso.date(),
  notes: z.string().trim().min(1).max(2000),
});

export const updateUserSettingsSchema = z
  .object({
    language: z.enum(["en", "ja"]).optional(),
    appearance: z.enum(["light", "dark", "system"]).optional(),
    notifNewPlate: z.boolean().optional(),
    notifStatus: z.boolean().optional(),
    notifReminder: z.boolean().optional(),
  })
  .strict();

export const searchPlatesSchema = z
  .string()
  .max(200)
  .transform((query) => query.trim());

export const resourceIdSchema = z.string().trim().min(1).max(100);

export const positiveIntegerSchema = z.number().int().positive();

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.string().max(100).optional(),
  email: z.string().email().optional(),
  organization: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
});
