import { getUserSettings } from "@/lib/actions/settings";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <SettingsClient
      initialSettings={{
        language: settings?.language ?? "en",
        appearance: settings?.appearance ?? "light",
        // 設定の行が無ければ既定（オン）
        notifReminder: settings?.notifReminder ?? true,
        notifNeglect: settings?.notifNeglect ?? true,
      }}
    />
  );
}
