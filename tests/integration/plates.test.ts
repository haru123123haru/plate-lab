import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createPlate as createPlateAction,
  deletePlate,
  getPlateById,
  getPlates,
  getTrashedPlates,
  purgePlate,
  restorePlate,
  searchPlates,
  updatePlate,
} from "@/lib/actions/plates";
import { importPlates } from "@/lib/actions/plate-import";
import {
  createPlate,
  createPlateType,
  createTemplate,
  createTwoUsers,
  signInAs,
} from "./fixtures";

describe("plates are only visible to their owner", () => {
  it("lists only the signed-in user's active plates", async () => {
    const { alice, sharedType, alicePlate } = await createTwoUsers();
    await createPlate({
      ownerId: alice.id,
      plateTypeId: sharedType.id,
      name: "Alice trashed",
      trashed: true,
    });
    signInAs(alice);

    expect((await getPlates()).map((p) => p.id)).toEqual([alicePlate.plate.id]);
    expect((await getTrashedPlates()).map((p) => p.name)).toEqual([
      "Alice trashed",
    ]);
  });

  it("does not open another user's plate", async () => {
    const { alice, bobPlate } = await createTwoUsers();
    signInAs(alice);

    expect(await getPlateById(bobPlate.plate.id)).toBeNull();
  });

  it("does not find another user's plates by name, notes or sample, even when similar", async () => {
    const { alice, alicePlate } = await createTwoUsers();
    signInAs(alice);

    // 部分一致
    expect((await searchPlates("lysozyme")).map((p) => p.id)).toEqual([
      alicePlate.plate.id,
    ]);
    expect(await searchPlates("Bob")).toEqual([]);
    expect(await searchPlates("secret")).toEqual([]);
    // 似ているもの（pg_trgm）。Bob のメモにだけ似ている
    expect(await searchPlates("secrte notes")).toEqual([]);
    // 空の検索語は全部のプレート
    expect((await searchPlates("")).map((p) => p.id)).toEqual([
      alicePlate.plate.id,
    ]);
  });

  it("finds similar plates of the signed-in user", async () => {
    const { bob, bobPlate } = await createTwoUsers();
    signInAs(bob);

    const results = await searchPlates("secrte notes");
    expect(results.map((p) => [p.id, p.similar])).toEqual([
      [bobPlate.plate.id, true],
    ]);
  });
});

describe("plates can only be changed by their owner", () => {
  it("does not update, trash, restore or purge another user's plate", async () => {
    const { alice, bob, sharedType, bobPlate } = await createTwoUsers();
    const bobTrashed = await createPlate({
      ownerId: bob.id,
      plateTypeId: sharedType.id,
      name: "Bob trashed",
      trashed: true,
    });
    signInAs(alice);

    expect(await updatePlate(bobPlate.plate.id, { name: "taken" })).toEqual({
      error: "Not found",
    });
    expect(await deletePlate(bobPlate.plate.id)).toEqual({
      error: "Not found",
    });
    expect(await restorePlate(bobTrashed.plate.id)).toEqual({
      error: "Not found",
    });
    expect(await purgePlate(bobTrashed.plate.id)).toEqual({
      error: "Not found",
    });

    const plates = await prisma.plate.findMany({
      where: { userId: bob.id },
      orderBy: { name: "asc" },
    });
    expect(plates.map((p) => [p.name, p.deletedAt === null])).toEqual([
      ["Bob lysozyme", true],
      ["Bob trashed", false],
    ]);
  });

  it("does not purge a plate that is not in the trash", async () => {
    const { alice, alicePlate } = await createTwoUsers();
    signInAs(alice);

    expect(await purgePlate(alicePlate.plate.id)).toEqual({
      error: "Not found",
    });
    expect(
      await prisma.plate.count({ where: { id: alicePlate.plate.id } })
    ).toBe(1);
  });

  it("does not attach another user's template to a plate", async () => {
    const { alice, bob, alicePlate } = await createTwoUsers();
    const bobTemplate = await createTemplate({
      name: "Bob screen",
      ownerId: bob.id,
    });
    signInAs(alice);

    expect(
      await updatePlate(alicePlate.plate.id, {
        reservoirTemplateId: bobTemplate.id,
      })
    ).toEqual({ error: "Not found" });
    const plate = await prisma.plate.findUniqueOrThrow({
      where: { id: alicePlate.plate.id },
    });
    expect(plate.reservoirTemplateId).toBeNull();
  });

  it("hides a plate that points at another user's template", async () => {
    const { alice, bob, sharedType } = await createTwoUsers();
    const bobTemplate = await createTemplate({
      name: "Bob screen",
      ownerId: bob.id,
    });
    // アプリからは作れない形。DB に直接入っていても、相手のテンプレートの中身は見せない
    const { plate } = await createPlate({
      ownerId: alice.id,
      plateTypeId: sharedType.id,
      name: "Alice with Bob's template",
      reservoirTemplateId: bobTemplate.id,
    });
    signInAs(alice);

    expect(await getPlateById(plate.id)).toBeNull();
  });
});

describe("creating plates only uses accessible types and templates", () => {
  it("does not create a plate with another user's plate type or template", async () => {
    const { alice, bob, sharedType } = await createTwoUsers();
    const bobType = await createPlateType({
      name: "Bob type",
      ownerId: bob.id,
    });
    const bobTemplate = await createTemplate({
      name: "Bob screen",
      ownerId: bob.id,
    });
    signInAs(alice);
    const before = await prisma.plate.count();

    expect(
      await createPlateAction({
        name: "x",
        plateTypeId: bobType.id,
        setupDate: "2026-10-01",
      })
    ).toEqual({ error: "Not found" });
    expect(
      await createPlateAction({
        name: "x",
        plateTypeId: sharedType.id,
        screeningTemplateId: bobTemplate.id,
        setupDate: "2026-10-01",
      })
    ).toEqual({ error: "Not found" });
    expect(await prisma.plate.count()).toBe(before);
  });

  it("creates a plate with a shared type and the user's own template", async () => {
    const { alice, sharedType } = await createTwoUsers();
    const aliceTemplate = await createTemplate({
      name: "Alice screen",
      ownerId: alice.id,
    });
    signInAs(alice);

    const created = await createPlateAction({
      name: "New plate",
      plateTypeId: sharedType.id,
      reservoirTemplateId: aliceTemplate.id,
      setupDate: "2026-10-01",
    });
    expect("error" in created).toBe(false);
    const plate = await prisma.plate.findFirstOrThrow({
      where: { name: "New plate" },
      include: { wells: true },
    });
    expect(plate.userId).toBe(alice.id);
    expect(plate.wells).toHaveLength(4);
  });

  it("does not import plates with another user's plate type or template", async () => {
    const { alice, bob, sharedType } = await createTwoUsers();
    const bobType = await createPlateType({
      name: "Bob type",
      ownerId: bob.id,
    });
    const bobTemplate = await createTemplate({
      name: "Bob screen",
      ownerId: bob.id,
    });
    signInAs(alice);
    const before = await prisma.plate.count();
    const plate = {
      name: "Imported",
      plateTypeId: sharedType.id,
      setupDate: "2026-10-01",
      reservoirTemplateId: null,
      screeningTemplateId: null,
      notes: null,
      drops: [],
    };

    expect(await importPlates([{ ...plate, plateTypeId: bobType.id }])).toEqual(
      {
        error: "Not found",
      }
    );
    expect(
      await importPlates([{ ...plate, reservoirTemplateId: bobTemplate.id }])
    ).toEqual({ error: "Not found" });
    expect(await prisma.plate.count()).toBe(before);
  });
});
