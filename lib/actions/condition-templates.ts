"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import {
  accessibleConditionSetWhere,
  accessibleConditionTemplateWhere,
  getAccessibleConditionTemplate,
} from "@/lib/access-control";
import {
  createConditionSetSchema,
  createConditionTemplateSchema,
  positiveIntegerSchema,
} from "@/lib/validations";

export async function getConditionTemplates() {
  const userId = await getCurrentUserId();

  return prisma.conditionTemplate.findMany({
    where: accessibleConditionTemplateWhere(userId),
    orderBy: { name: "asc" },
  });
}

export async function createConditionTemplate(data: {
  name: string;
  description?: string;
}) {
  const userId = await getCurrentUserId();
  const parsed = createConditionTemplateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  return prisma.conditionTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      createdById: userId,
      isDefault: false,
    },
  });
}

export async function getConditionSets() {
  const userId = await getCurrentUserId();

  return prisma.conditionSet.findMany({
    where: {
      AND: [
        accessibleConditionSetWhere(userId),
        { reservoirTemplate: accessibleConditionTemplateWhere(userId) },
        { screeningTemplate: accessibleConditionTemplateWhere(userId) },
      ],
    },
    include: {
      reservoirTemplate: true,
      screeningTemplate: true,
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function deleteConditionTemplate(id: number) {
  const userId = await getCurrentUserId();
  const parsedId = positiveIntegerSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  return prisma.$transaction(async (tx) => {
    const template = await tx.conditionTemplate.findFirst({
      where: {
        id: parsedId.data,
        createdById: userId,
        isDefault: false,
      },
      select: { id: true },
    });
    if (!template) return { error: "Not found" };

    const references = [
      { reservoirTemplateId: template.id },
      { screeningTemplateId: template.id },
    ];
    const blockingSets = await tx.conditionSet.count({
      where: {
        OR: references,
        NOT: {
          AND: [{ createdById: userId }, { isDefault: false }],
        },
      },
    });
    if (blockingSets > 0) {
      return { error: "Cannot delete while it is used by another condition set" };
    }

    const otherPlateReferences = await tx.plate.count({
      where: {
        userId: { not: userId },
        OR: references,
      },
    });
    if (otherPlateReferences > 0) {
      return { error: "Cannot delete while it is used by another plate" };
    }

    await tx.conditionSet.deleteMany({
      where: {
        createdById: userId,
        isDefault: false,
        OR: references,
      },
    });
    await tx.templateWell.deleteMany({ where: { templateId: template.id } });
    await tx.plate.updateMany({
      where: { userId, reservoirTemplateId: template.id },
      data: { reservoirTemplateId: null },
    });
    await tx.plate.updateMany({
      where: { userId, screeningTemplateId: template.id },
      data: { screeningTemplateId: null },
    });
    await tx.conditionTemplate.delete({ where: { id: template.id } });

    return { success: true };
  });
}

export async function deleteConditionSet(id: number) {
  const userId = await getCurrentUserId();
  const parsedId = positiveIntegerSchema.safeParse(id);
  if (!parsedId.success) return { error: "Not found" };

  const deleted = await prisma.conditionSet.deleteMany({
    where: {
      id: parsedId.data,
      createdById: userId,
      isDefault: false,
    },
  });
  return deleted.count > 0 ? { success: true } : { error: "Not found" };
}

export async function createConditionSet(data: {
  name: string;
  reservoirTemplateId: number;
  screeningTemplateId: number;
}) {
  const userId = await getCurrentUserId();
  const parsed = createConditionSetSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  const [reservoirTemplate, screeningTemplate] = await Promise.all([
    getAccessibleConditionTemplate(parsed.data.reservoirTemplateId, userId),
    getAccessibleConditionTemplate(parsed.data.screeningTemplateId, userId),
  ]);
  if (!reservoirTemplate || !screeningTemplate) {
    throw new Error("Not found");
  }

  return prisma.conditionSet.create({
    data: {
      name: parsed.data.name,
      reservoirTemplateId: parsed.data.reservoirTemplateId,
      screeningTemplateId: parsed.data.screeningTemplateId,
      createdById: userId,
      isDefault: false,
    },
    include: {
      reservoirTemplate: true,
      screeningTemplate: true,
    },
  });
}
