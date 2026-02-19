"use server";

import { prisma } from "@/lib/prisma";

export async function getConditionTemplates() {
  return prisma.conditionTemplate.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createConditionTemplate(data: {
  name: string;
  description?: string;
}) {
  return prisma.conditionTemplate.create({
    data: {
      name: data.name,
      description: data.description ?? null,
    },
  });
}

export async function getConditionSets() {
  return prisma.conditionSet.findMany({
    include: {
      reservoirTemplate: true,
      screeningTemplate: true,
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function deleteConditionTemplate(id: number) {
  // セットで参照されている場合は先にセットを削除
  await prisma.conditionSet.deleteMany({
    where: {
      OR: [{ reservoirTemplateId: id }, { screeningTemplateId: id }],
    },
  });
  // テンプレートのウェルデータも削除
  await prisma.templateWell.deleteMany({ where: { templateId: id } });
  // プレートの参照を外す
  await prisma.plate.updateMany({
    where: { reservoirTemplateId: id },
    data: { reservoirTemplateId: null },
  });
  await prisma.plate.updateMany({
    where: { screeningTemplateId: id },
    data: { screeningTemplateId: null },
  });
  return prisma.conditionTemplate.delete({ where: { id } });
}

export async function deleteConditionSet(id: number) {
  return prisma.conditionSet.delete({ where: { id } });
}

export async function createConditionSet(data: {
  name: string;
  reservoirTemplateId: number;
  screeningTemplateId: number;
}) {
  return prisma.conditionSet.create({
    data: {
      name: data.name,
      reservoirTemplateId: data.reservoirTemplateId,
      screeningTemplateId: data.screeningTemplateId,
    },
    include: {
      reservoirTemplate: true,
      screeningTemplate: true,
    },
  });
}
