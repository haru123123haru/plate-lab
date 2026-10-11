import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getSampleStyles,
  getSamples,
  mergeSamples,
  updateSample,
} from "@/lib/actions/samples";
import { createPlate, createTwoUsers, signInAs } from "./fixtures";

const sampleNamesOf = async (userId: string) =>
  (
    await prisma.drop.findMany({
      where: { well: { plate: { userId } } },
      select: { sampleName: true },
      orderBy: { sampleName: "asc" },
    })
  ).map((d) => d.sampleName);

describe("samples belong to one user", () => {
  it("lists only the signed-in user's samples and styles", async () => {
    const { alice, bob, sharedType } = await createTwoUsers();
    await createPlate({
      ownerId: bob.id,
      plateTypeId: sharedType.id,
      name: "Bob only",
      sampleName: "bob-only",
    });
    await prisma.sample.create({
      data: { userId: bob.id, name: "lysozyme", icon: "gem", color: "red" },
    });
    signInAs(alice);

    expect(await getSamples()).toEqual([
      expect.objectContaining({ name: "lysozyme", dropCount: 1 }),
    ]);
    expect(await getSampleStyles()).toEqual({});
  });

  it("renames only the signed-in user's drops", async () => {
    const { alice, bob } = await createTwoUsers();
    signInAs(alice);

    expect(
      await updateSample({
        name: "lysozyme",
        newName: "Lysozyme",
        icon: "flask",
        color: "gray",
      })
    ).toEqual({ success: true });
    expect(await sampleNamesOf(alice.id)).toEqual(["Lysozyme"]);
    expect(await sampleNamesOf(bob.id)).toEqual(["lysozyme"]);
  });

  it("does not ask to merge with a name only another user has", async () => {
    const { alice, bob, sharedType } = await createTwoUsers();
    await createPlate({
      ownerId: bob.id,
      plateTypeId: sharedType.id,
      name: "Bob thaumatin",
      sampleName: "thaumatin",
    });
    signInAs(alice);

    expect(
      await updateSample({
        name: "lysozyme",
        newName: "thaumatin",
        icon: "flask",
        color: "gray",
      })
    ).toEqual({ success: true });
    expect(await sampleNamesOf(bob.id)).toEqual(["lysozyme", "thaumatin"]);
  });

  it("merges only the signed-in user's drops", async () => {
    const { alice, bob } = await createTwoUsers();
    signInAs(alice);

    expect(
      await mergeSamples({ from: ["lysozyme"], into: "Lysozyme" })
    ).toEqual({
      success: true,
    });
    expect(await sampleNamesOf(alice.id)).toEqual(["Lysozyme"]);
    expect(await sampleNamesOf(bob.id)).toEqual(["lysozyme"]);
  });
});
