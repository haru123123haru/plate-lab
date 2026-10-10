import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createConditionSet,
  deleteConditionSet,
  deleteConditionTemplate,
  getConditionSets,
  getConditionTemplate,
  getConditionTemplates,
  replaceConditionTemplateWells,
} from "@/lib/actions/condition-templates";
import { deletePlateType, getPlateTypes } from "@/lib/actions/plate-types";
import {
  createPlate,
  createPlateType,
  createTemplate,
  createTwoUsers,
  signInAs,
} from "./fixtures";

describe("condition templates and sets", () => {
  it("lists shared and own templates and sets, not another user's", async () => {
    const { alice, bob } = await createTwoUsers();
    const shared = await createTemplate({ name: "PEG" });
    const mine = await createTemplate({
      name: "Alice screen",
      ownerId: alice.id,
    });
    const bobs = await createTemplate({ name: "Bob screen", ownerId: bob.id });
    await prisma.conditionSet.createMany({
      data: [
        {
          name: "Shared set",
          isDefault: true,
          reservoirTemplateId: shared.id,
          screeningTemplateId: shared.id,
        },
        {
          name: "Alice set",
          createdById: alice.id,
          reservoirTemplateId: mine.id,
          screeningTemplateId: shared.id,
        },
        {
          name: "Bob set",
          createdById: bob.id,
          reservoirTemplateId: bobs.id,
          screeningTemplateId: shared.id,
        },
      ],
    });
    signInAs(alice);

    expect((await getConditionTemplates()).map((t) => t.name)).toEqual([
      "Alice screen",
      "PEG",
    ]);
    expect((await getConditionSets()).map((s) => s.name)).toEqual([
      "Shared set",
      "Alice set",
    ]);
  });

  it("does not delete a shared or another user's template or set", async () => {
    const { alice, bob } = await createTwoUsers();
    const shared = await createTemplate({ name: "PEG" });
    const bobs = await createTemplate({ name: "Bob screen", ownerId: bob.id });
    const bobSet = await prisma.conditionSet.create({
      data: {
        name: "Bob set",
        createdById: bob.id,
        reservoirTemplateId: bobs.id,
        screeningTemplateId: bobs.id,
      },
    });
    signInAs(alice);

    expect(await deleteConditionTemplate(shared.id)).toEqual({
      error: "Not found",
    });
    expect(await deleteConditionTemplate(bobs.id)).toEqual({
      error: "Not found",
    });
    expect(await deleteConditionSet(bobSet.id)).toEqual({ error: "Not found" });
    expect(await prisma.conditionTemplate.count()).toBe(2);
    expect(await prisma.conditionSet.count()).toBe(1);
  });

  it("does not build a set from another user's template", async () => {
    const { alice, bob } = await createTwoUsers();
    const shared = await createTemplate({ name: "PEG" });
    const bobs = await createTemplate({ name: "Bob screen", ownerId: bob.id });
    signInAs(alice);

    await expect(
      createConditionSet({
        name: "x",
        reservoirTemplateId: bobs.id,
        screeningTemplateId: shared.id,
      })
    ).rejects.toThrow("Not found");
    expect(await prisma.conditionSet.count()).toBe(0);
  });

  it("keeps an own template that another user's plate or set still uses", async () => {
    const { alice, bob, sharedType } = await createTwoUsers();
    const usedByPlate = await createTemplate({
      name: "Alice A",
      ownerId: alice.id,
    });
    const usedBySet = await createTemplate({
      name: "Alice B",
      ownerId: alice.id,
    });
    await createPlate({
      ownerId: bob.id,
      plateTypeId: sharedType.id,
      name: "Bob uses Alice A",
      reservoirTemplateId: usedByPlate.id,
    });
    await prisma.conditionSet.create({
      data: {
        name: "Bob uses Alice B",
        createdById: bob.id,
        reservoirTemplateId: usedBySet.id,
        screeningTemplateId: usedBySet.id,
      },
    });
    signInAs(alice);

    expect(await deleteConditionTemplate(usedByPlate.id)).toEqual({
      error: "Cannot delete while it is used by another plate",
    });
    expect(await deleteConditionTemplate(usedBySet.id)).toEqual({
      error: "Cannot delete while it is used by another condition set",
    });
    expect(await prisma.conditionTemplate.count()).toBe(2);
  });

  it("deletes an own template with its wells, own sets and own plates' references", async () => {
    const { alice, sharedType } = await createTwoUsers();
    const mine = await createTemplate({
      name: "Alice screen",
      ownerId: alice.id,
    });
    await prisma.templateWell.create({
      data: { templateId: mine.id, position: "A1", composition: "{}" },
    });
    await prisma.conditionSet.create({
      data: {
        name: "Alice set",
        createdById: alice.id,
        reservoirTemplateId: mine.id,
        screeningTemplateId: mine.id,
      },
    });
    const { plate } = await createPlate({
      ownerId: alice.id,
      plateTypeId: sharedType.id,
      name: "Alice uses it",
      reservoirTemplateId: mine.id,
    });
    signInAs(alice);

    expect(await deleteConditionTemplate(mine.id)).toEqual({ success: true });
    expect(await prisma.conditionTemplate.count()).toBe(0);
    expect(await prisma.templateWell.count()).toBe(0);
    expect(await prisma.conditionSet.count()).toBe(0);
    const after = await prisma.plate.findUniqueOrThrow({
      where: { id: plate.id },
    });
    expect(after.reservoirTemplateId).toBeNull();
  });
});

describe("template conditions", () => {
  const well = (position: string) => ({
    position,
    salt: "100 mM LiCl",
    precipitant: "10% PEG3350",
    polyamine: "",
    buffer: "50 mM MOPS",
  });

  it("reads shared and own templates' conditions, not another user's", async () => {
    const { alice, bob } = await createTwoUsers();
    const shared = await createTemplate({ name: "PEG" });
    const bobs = await createTemplate({ name: "Bob screen", ownerId: bob.id });
    await prisma.templateWell.create({
      data: {
        templateId: shared.id,
        position: "A1",
        composition: JSON.stringify(well("A1")),
      },
    });
    signInAs(alice);

    const template = await getConditionTemplate(shared.id);
    expect(template?.isOwn).toBe(false);
    expect(template?.wells).toEqual([well("A1")]);
    expect(await getConditionTemplate(bobs.id)).toBeNull();
  });

  it("replaces only the user's own template's conditions", async () => {
    const { alice, bob } = await createTwoUsers();
    const shared = await createTemplate({ name: "PEG" });
    const bobs = await createTemplate({ name: "Bob screen", ownerId: bob.id });
    const mine = await createTemplate({
      name: "Alice screen",
      ownerId: alice.id,
    });
    await prisma.templateWell.create({
      data: { templateId: mine.id, position: "H12", composition: "{}" },
    });
    signInAs(alice);

    expect(
      await replaceConditionTemplateWells(shared.id, [well("A1")])
    ).toEqual({
      error: "Not found",
    });
    expect(await replaceConditionTemplateWells(bobs.id, [well("A1")])).toEqual({
      error: "Not found",
    });
    expect(
      await replaceConditionTemplateWells(mine.id, [well("A1"), well("A2")])
    ).toEqual({ success: true, count: 2 });

    const wells = await prisma.templateWell.findMany({
      orderBy: { position: "asc" },
    });
    expect(wells.map((w) => [w.templateId, w.position])).toEqual([
      [mine.id, "A1"],
      [mine.id, "A2"],
    ]);
  });
});

describe("plate types", () => {
  it("lists shared and own types, not another user's", async () => {
    const { alice, bob } = await createTwoUsers();
    await createPlateType({ name: "Alice type", ownerId: alice.id });
    await createPlateType({ name: "Bob type", ownerId: bob.id });
    signInAs(alice);

    expect((await getPlateTypes()).map((t) => t.name)).toEqual([
      "Shared 2x2",
      "Alice type",
    ]);
  });

  it("does not delete a shared or another user's type", async () => {
    const { alice, bob, sharedType } = await createTwoUsers();
    const bobType = await createPlateType({
      name: "Bob type",
      ownerId: bob.id,
    });
    signInAs(alice);

    expect(await deletePlateType(sharedType.id)).toEqual({
      error: "Not found",
    });
    expect(await deletePlateType(bobType.id)).toEqual({ error: "Not found" });
    expect(await prisma.plateType.count()).toBe(2);
  });

  it("does not delete an own type that a plate uses, even in the trash", async () => {
    const { alice } = await createTwoUsers();
    const aliceType = await createPlateType({
      name: "Alice type",
      ownerId: alice.id,
    });
    await createPlate({
      ownerId: alice.id,
      plateTypeId: aliceType.id,
      name: "Trashed",
      trashed: true,
    });
    signInAs(alice);

    expect(await deletePlateType(aliceType.id)).toEqual({
      error: "In use",
      count: 1,
    });
  });
});
