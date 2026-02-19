import { getUserSettings } from "@/lib/actions/settings";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <SettingsClient
      initialSettings={{
        language: settings?.language ?? "en",
        appearance: settings?.appearance ?? "light",
      }}
    />
  );
}
