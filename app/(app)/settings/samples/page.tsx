import { getSamples } from "@/lib/actions/samples";
import { SamplesSettingsClient } from "./samples-client";

export default async function SamplesSettingsPage() {
  const samples = await getSamples();

  return <SamplesSettingsClient samples={samples} />;
}
