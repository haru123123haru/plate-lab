import { prisma } from "@/lib/prisma";

// setup.ts の getCurrentUserId が返すユーザー
export const currentUser: { id: string | null } = { id: null };

export function signInAs(user: { id: string }) {
  currentUser.id = user.id;
}

export function createUser(name: string) {
  return prisma.user.create({
    data: { name, email: `${name}@example.com` },
  });
}

export function createPlateType(options: {
  name: string;
  ownerId?: string;
  rows?: number;
  cols?: number;
  maxDrops?: number;
}) {
  return prisma.plateType.create({
    data: {
      name: options.name,
      rows: options.rows ?? 2,
      cols: options.cols ?? 2,
      maxDrops: options.maxDrops ?? 1,
      layout: "SITTING",
      isDefault: !options.ownerId,
      createdById: options.ownerId ?? null,
    },
  });
}

export function createTemplate(options: { name: string; ownerId?: string }) {
  return prisma.conditionTemplate.create({
    data: {
      name: options.name,
      isDefault: !options.ownerId,
      createdById: options.ownerId ?? null,
    },
  });
}

// 2×2 のウェルを持つプレート。sampleName を渡すと A1 の1番にドロップを1つ置き、観察を1つ付ける
export async function createPlate(options: {
  ownerId: string;
  plateTypeId: string;
  name: string;
  notes?: string;
  sampleName?: string;
  trashed?: boolean;
  reservoirTemplateId?: number;
}) {
  const plate = await prisma.plate.create({
    data: {
      name: options.name,
      notes: options.notes,
      userId: options.ownerId,
      plateTypeId: options.plateTypeId,
      reservoirTemplateId: options.reservoirTemplateId ?? null,
      setupDate: new Date("2026-10-01T00:00:00Z"),
      deletedAt: options.trashed ? new Date() : null,
      wells: {
        create: ["A1", "A2", "B1", "B2"].map((position, i) => ({
          position,
          row: Math.floor(i / 2),
          col: i % 2,
        })),
      },
    },
    include: { wells: { orderBy: { position: "asc" } } },
  });
  const [a1] = plate.wells;
  if (!options.sampleName)
    return { plate, well: a1, drop: null, observation: null };

  const drop = await prisma.drop.create({
    data: {
      wellId: a1.id,
      slot: 1,
      sampleName: options.sampleName,
      concentration: "10 mg/mL",
    },
  });
  const observation = await prisma.observation.create({
    data: {
      dropId: drop.id,
      observedAt: new Date("2026-10-02T00:00:00Z"),
      notes: "first look",
    },
  });
  return { plate, well: a1, drop, observation };
}

// 2人のユーザーと、それぞれのプレート。認可のテストはこれを土台にする。
// どちらのプレートも共有のタイプで、A1 に同じ名前のサンプルのドロップを持つ
export async function createTwoUsers() {
  const alice = await createUser("alice");
  const bob = await createUser("bob");
  const sharedType = await createPlateType({ name: "Shared 2x2" });
  const alicePlate = await createPlate({
    ownerId: alice.id,
    plateTypeId: sharedType.id,
    name: "Alice lysozyme",
    sampleName: "lysozyme",
  });
  const bobPlate = await createPlate({
    ownerId: bob.id,
    plateTypeId: sharedType.id,
    name: "Bob lysozyme",
    notes: "secret notes",
    sampleName: "lysozyme",
  });
  return { alice, bob, sharedType, alicePlate, bobPlate };
}
