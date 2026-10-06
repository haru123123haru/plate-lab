"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { Prisma } from "../../generated/prisma/client";
import {
  createPlateSchema,
  resourceIdSchema,
  searchPlatesSchema,
  updatePlateSchema,
} from "@/lib/validations";
import {
  accessiblePlateTypeWhere,
  accessibleConditionTemplateWhere,
  activePlateWhere,
  getAccessibleConditionTemplate,
  trashedPlateWhere,
} from "@/lib/access-control";

// 一覧で使うのはウェル数と使用中ウェル数（countUsedWells）だけなので、ドロップは件数だけ引く
const wellDropCount = {
  select: { _count: { select: { drops: true } } },
} as const;

// 検索結果には、件数に加えてサンプル名も添える（summarizeSamples）。
// サンプル名は出てきた順に並べるので、ウェルとドロップの順を固定する
const wellDropSamples = {
  orderBy: [{ row: "asc" }, { col: "asc" }],
  select: {
    _count: { select: { drops: true } },
    drops: { orderBy: { slot: "asc" }, select: { sampleName: true } },
  },
} satisfies Prisma.WellFindManyArgs;

export async function getPlates() {
  const userId = await getCurrentUserId();
  return prisma.plate.findMany({
    where: {
      ...activePlateWhere(userId),
      plateType: accessiblePlateTypeWhere(userId),
    },
    include: {
      plateType: true,
      wells: wellDropCount,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPlateById(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return null;

  const plate = await prisma.plate.findFirst({
    where: {
      id: parsedId.data,
      userId,
      plateType: accessiblePlateTypeWhere(userId),
      OR: [
        { reservoirTemplateId: null },
        { reservoirTemplate: accessibleConditionTemplateWhere(userId) },
      ],
      AND: [
        {
          OR: [
            { screeningTemplateId: null },
            { screeningTemplate: accessibleConditionTemplateWhere(userId) },
          ],
        },
      ],
    },
    include: {
      plateType: true,
      reservoirTemplate: {
        include: {
          wells: true,
        },
      },
      screeningTemplate: {
        include: {
          wells: true,
        },
      },
      wells: {
        orderBy: [{ row: "asc" }, { col: "asc" }],
        include: {
          drops: {
            orderBy: { slot: "asc" },
            include: {
              // 観察日は日付だけなので、同じ日の中は書いた順で並べる
              observations: {
                orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!plate || plate.userId !== userId) {
    return null;
  }

  return plate;
}

export async function createPlate(data: {
  name: string;
  plateTypeId: string;
  reservoirTemplateId?: number | null;
  screeningTemplateId?: number | null;
  notes?: string;
  setupDate: string;
  drops?: {
    positions: string[];
    sampleName: string;
    drops: { slot: number; concentration: string }[];
    style?: { icon: string; color: string };
  };
}) {
  const userId = await getCurrentUserId();
  const parsed = createPlateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // プレートタイプの形からウェルを自動生成
  const plateType = await prisma.plateType.findFirst({
    where: {
      AND: [{ id: parsed.data.plateTypeId }, accessiblePlateTypeWhere(userId)],
    },
  });
  if (!plateType) return { error: "Not found" };

  const { rows, cols, maxDrops } = plateType;
  const batch = parsed.data.drops;
  const dropPositions = new Set(batch?.positions);
  if (batch?.drops.some(({ slot }) => slot > maxDrops)) {
    return { error: "Invalid slot" };
  }

  const templateIds = [
    parsed.data.reservoirTemplateId,
    parsed.data.screeningTemplateId,
  ].filter((id): id is number => id !== null && id !== undefined);
  const accessibleTemplates = await Promise.all(
    templateIds.map((id) => getAccessibleConditionTemplate(id, userId))
  );
  if (accessibleTemplates.some((template) => !template)) {
    return { error: "Not found" };
  }

  const rowLabels = "ABCDEFGH";
  // トランザクションの関数から読むと推論が効かないので、型を書く
  const wells: Prisma.WellCreateWithoutPlateInput[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const position = `${rowLabels[r]}${c + 1}`;
      wells.push({
        position,
        row: r,
        col: c,
        drops:
          batch && dropPositions.delete(position)
            ? {
                create: batch.drops.map(({ slot, concentration }) => ({
                  slot,
                  sampleName: batch.sampleName,
                  concentration,
                })),
              }
            : undefined,
      });
    }
  }
  // 残った位置はこのプレートの範囲の外
  if (dropPositions.size > 0) return { error: "Invalid well position" };

  const style = batch?.style;
  return prisma.$transaction(async (tx) => {
    const plate = await tx.plate.create({
      data: {
        name: parsed.data.name,
        plateTypeId: parsed.data.plateTypeId,
        reservoirTemplateId: parsed.data.reservoirTemplateId ?? null,
        screeningTemplateId: parsed.data.screeningTemplateId ?? null,
        notes: parsed.data.notes,
        setupDate: new Date(`${parsed.data.setupDate}T00:00:00Z`),
        userId,
        wells: { create: wells },
      },
      include: {
        plateType: true,
        wells: true,
      },
    });
    if (batch && style) {
      await tx.sample.upsert({
        where: { userId_name: { userId, name: batch.sampleName } },
        create: { userId, name: batch.sampleName, ...style },
        update: style,
      });
    }
    return plate;
  });
}

export async function updatePlate(
  id: string,
  data: {
    name?: string;
    notes?: string | null;
    setupDate?: string;
    reservoirTemplateId?: number | null;
    screeningTemplateId?: number | null;
  }
) {
  const userId = await getCurrentUserId();
  const parsed = updatePlateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const plate = await prisma.plate.findFirst({
    where: { id: parsedId.data, ...activePlateWhere(userId) },
    select: { id: true },
  });

  if (!plate) {
    return { error: "Not found" };
  }

  const templateIds = [
    parsed.data.reservoirTemplateId,
    parsed.data.screeningTemplateId,
  ].filter(
    (templateId): templateId is number =>
      templateId !== null && templateId !== undefined
  );
  const accessibleTemplates = await Promise.all(
    templateIds.map((templateId) =>
      getAccessibleConditionTemplate(templateId, userId)
    )
  );
  if (accessibleTemplates.some((template) => !template)) {
    return { error: "Not found" };
  }

  // 仕込み日は "YYYY-MM-DD" のままでは DateTime の列に入らないので Date に直す
  const { setupDate, ...rest } = parsed.data;

  // 確認と更新の間にゴミ箱へ移された場合は更新しない
  return prisma.plate.update({
    where: { id: parsedId.data, deletedAt: null },
    data: {
      ...rest,
      ...(setupDate && { setupDate: new Date(`${setupDate}T00:00:00Z`) }),
    },
    include: {
      plateType: true,
      wells: true,
    },
  });
}

// 似ているとみなす word_similarity の下限（pg_trgm の <% と同じ既定値）
const FUZZY_SEARCH_THRESHOLD = 0.6;
// これより短い検索語は部分一致だけにする。短いと似ているものが出すぎる
const FUZZY_SEARCH_MIN_LENGTH = 3;
// 似ているだけのプレートは、似ている順にここまで出す
const FUZZY_SEARCH_LIMIT = 50;

// 部分一致で見つかったプレートを先に、似ているだけのプレート（打ち間違いや表記の揺れ）をあとに並べる
export async function searchPlates(query: string) {
  const userId = await getCurrentUserId();
  const parsed = searchPlatesSchema.safeParse(query);
  if (!parsed.success) return [];
  const normalizedQuery = parsed.data;
  const visiblePlateWhere = {
    ...activePlateWhere(userId),
    plateType: accessiblePlateTypeWhere(userId),
  };
  if (!normalizedQuery) {
    return prisma.plate.findMany({
      where: visiblePlateWhere,
      include: { plateType: true, wells: wellDropSamples },
      orderBy: { updatedAt: "desc" },
    });
  }

  const [matched, similarIds] = await Promise.all([
    prisma.plate.findMany({
      where: {
        ...visiblePlateWhere,
        OR: [
          { name: { contains: normalizedQuery, mode: "insensitive" } },
          // サンプル名はドロップにだけある。部分一致なので索引は効かない
          {
            wells: {
              some: {
                drops: {
                  some: {
                    sampleName: {
                      contains: normalizedQuery,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          },
          {
            plateType: {
              name: { contains: normalizedQuery, mode: "insensitive" },
            },
          },
          { notes: { contains: normalizedQuery, mode: "insensitive" } },
        ],
      },
      include: { plateType: true, wells: wellDropSamples },
      orderBy: { updatedAt: "desc" },
    }),
    normalizedQuery.length < FUZZY_SEARCH_MIN_LENGTH
      ? Promise.resolve([])
      : findSimilarPlateIds(userId, normalizedQuery),
  ]);

  const matchedIds = new Set(matched.map((plate) => plate.id));
  const extraIds = similarIds.filter((id) => !matchedIds.has(id));
  if (extraIds.length === 0) return matched;

  // 持ち主・ゴミ箱・タイプの条件は、部分一致と同じものをもう一度かける
  const similar = await prisma.plate.findMany({
    where: { ...visiblePlateWhere, id: { in: extraIds } },
    include: { plateType: true, wells: wellDropSamples },
  });
  const rank = new Map(extraIds.map((id, index) => [id, index]));
  similar.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  return [...matched, ...similar];
}

// プレート名・メモ・サンプル名のどれかが検索語に似ているプレートの ID を、似ている順に返す。
// word_similarity は、長い文の中の1語に似ていても拾う（メモの中の打ち間違いなど）。
// 持ち主とゴミ箱の条件は候補を減らすためだけのもので、守るのは呼び出し元の findMany の条件。
// 似ているものは付け足しなので、失敗しても（pg_trgm が無いなど）部分一致の結果は返せるようにする
async function findSimilarPlateIds(userId: string, query: string) {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p."id"
      FROM (
        SELECT
          p."id",
          p."updatedAt",
          greatest(
            word_similarity(${query}, p."name"),
            word_similarity(${query}, coalesce(p."notes", '')),
            (
              SELECT coalesce(max(word_similarity(${query}, d."sampleName")), 0)
              FROM "Well" w
              JOIN "Drop" d ON d."wellId" = w."id"
              WHERE w."plateId" = p."id"
            )
          ) AS score
        FROM "Plate" p
        WHERE p."userId" = ${userId} AND p."deletedAt" IS NULL
      ) p
      WHERE p.score >= ${FUZZY_SEARCH_THRESHOLD}
      ORDER BY p.score DESC, p."updatedAt" DESC
      LIMIT ${FUZZY_SEARCH_LIMIT}
    `;
    return rows.map((row) => row.id);
  } catch (error) {
    console.error("Fuzzy plate search failed", error);
    return [];
  }
}

// ゴミ箱へ移す。物理削除は purgePlate だけが行う
export async function deletePlate(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const { count } = await prisma.plate.updateMany({
    where: { id: parsedId.data, ...activePlateWhere(userId) },
    data: { deletedAt: new Date() },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}

export async function getTrashedPlates() {
  const userId = await getCurrentUserId();
  return prisma.plate.findMany({
    where: {
      ...trashedPlateWhere(userId),
      // getPlates と揃え、一覧に出るのに詳細が開けないプレートを作らない
      plateType: accessiblePlateTypeWhere(userId),
    },
    include: { plateType: true },
    orderBy: { deletedAt: "desc" },
  });
}

export async function restorePlate(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const { count } = await prisma.plate.updateMany({
    where: { id: parsedId.data, ...trashedPlateWhere(userId) },
    data: { deletedAt: null },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}

// ゴミ箱に入っているプレートだけを物理削除する。ウェルは onDelete: Cascade で消える
export async function purgePlate(id: string) {
  const userId = await getCurrentUserId();
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const { count } = await prisma.plate.deleteMany({
    where: { id: parsedId.data, ...trashedPlateWhere(userId) },
  });
  if (count === 0) return { error: "Not found" };
  return { success: true };
}
