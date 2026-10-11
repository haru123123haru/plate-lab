import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  addObservation,
  createDrop,
  deleteDrop,
  deleteObservation,
  updateDrop,
} from "@/lib/actions/drops";
import { createPlate, createTwoUsers, signInAs } from "./fixtures";

const newDrop = (wellId: string) => ({
  wellId,
  slot: 1,
  sampleName: "thaumatin",
  concentration: "5 mg/mL",
});

describe("drops and observations can only be changed by the plate's owner", () => {
  it("does not add a drop to another user's well", async () => {
    const { alice, bobPlate } = await createTwoUsers();
    signInAs(alice);
    const emptyBobWell = bobPlate.plate.wells[1];

    expect(await createDrop(newDrop(emptyBobWell.id))).toEqual({
      error: "Not found",
    });
    expect(
      await prisma.drop.count({ where: { wellId: emptyBobWell.id } })
    ).toBe(0);
  });

  it("does not add a drop to a plate in the trash", async () => {
    const { alice, sharedType } = await createTwoUsers();
    const trashed = await createPlate({
      ownerId: alice.id,
      plateTypeId: sharedType.id,
      name: "Alice trashed",
      trashed: true,
    });
    signInAs(alice);

    expect(await createDrop(newDrop(trashed.well.id))).toEqual({
      error: "Not found",
    });
  });

  it("adds a drop to the user's own well", async () => {
    const { alice, alicePlate } = await createTwoUsers();
    signInAs(alice);
    const emptyWell = alicePlate.plate.wells[1];

    const drop = await createDrop(newDrop(emptyWell.id));
    expect("error" in drop).toBe(false);
    expect(await prisma.drop.count({ where: { wellId: emptyWell.id } })).toBe(
      1
    );
  });

  it("does not update or delete another user's drop", async () => {
    const { alice, bobPlate } = await createTwoUsers();
    signInAs(alice);
    const bobDrop = bobPlate.drop!;

    expect(await updateDrop(bobDrop.id, { sampleName: "taken" })).toEqual({
      error: "Not found",
    });
    expect(await deleteDrop(bobDrop.id)).toEqual({ error: "Not found" });

    const drop = await prisma.drop.findUniqueOrThrow({
      where: { id: bobDrop.id },
    });
    expect(drop.sampleName).toBe("lysozyme");
  });

  it("updates and deletes the user's own drops and observations", async () => {
    const { alice, alicePlate } = await createTwoUsers();
    signInAs(alice);
    const dropId = alicePlate.drop!.id;

    expect(
      "error" in (await updateDrop(dropId, { sampleName: "Lysozyme" }))
    ).toBe(false);
    expect(
      "error" in
        (await addObservation({
          dropId,
          observedAt: "2026-10-03",
          notes: "second look",
        }))
    ).toBe(false);
    expect(await deleteObservation(alicePlate.observation!.id)).toEqual({
      success: true,
    });
    expect(await prisma.observation.count({ where: { dropId } })).toBe(1);
    expect(
      (await prisma.drop.findUniqueOrThrow({ where: { id: dropId } }))
        .sampleName
    ).toBe("Lysozyme");
    expect(await deleteDrop(dropId)).toEqual({ success: true });
    // 観察も一緒に消える
    expect(await prisma.observation.count({ where: { dropId } })).toBe(0);
  });

  it("does not add or delete observations on another user's drop", async () => {
    const { alice, bobPlate } = await createTwoUsers();
    signInAs(alice);

    expect(
      await addObservation({
        dropId: bobPlate.drop!.id,
        observedAt: "2026-10-03",
        notes: "peek",
      })
    ).toEqual({ error: "Not found" });
    expect(await deleteObservation(bobPlate.observation!.id)).toEqual({
      error: "Not found",
    });
    expect(
      await prisma.observation.count({ where: { dropId: bobPlate.drop!.id } })
    ).toBe(1);
  });

  it("does not change drops of the user's own plate once it is in the trash", async () => {
    const { alice, alicePlate } = await createTwoUsers();
    await prisma.plate.update({
      where: { id: alicePlate.plate.id },
      data: { deletedAt: new Date() },
    });
    signInAs(alice);

    expect(await updateDrop(alicePlate.drop!.id, { sampleName: "x" })).toEqual({
      error: "Not found",
    });
    expect(await deleteDrop(alicePlate.drop!.id)).toEqual({
      error: "Not found",
    });
    expect(
      await addObservation({
        dropId: alicePlate.drop!.id,
        observedAt: "2026-10-03",
        notes: "late",
      })
    ).toEqual({ error: "Not found" });
  });
});
