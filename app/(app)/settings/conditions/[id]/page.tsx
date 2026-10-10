import { getConditionTemplate } from "@/lib/actions/condition-templates";
import { TemplateClient } from "./template-client";

export default async function ConditionTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getConditionTemplate(Number(id));

  return <TemplateClient template={template} />;
}
