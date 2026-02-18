"use client";

import {
  Globe,
  Moon,
  Bell,
  Download,
  Upload,
  Database,
  Info,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";

export default function SettingsPage() {
  return (
    <div className="bg-bg-primary min-h-dvh">
      <PageHeader title="Settings" />

      <div className="flex flex-col gap-8 px-6 pb-8">
        {/* GENERAL */}
        <div className="flex flex-col gap-1">
          <SectionHeader label="General" />
          <div>
            <ListRow icon={Globe} title="Language" />
            <ListRow icon={Moon} title="Appearance" />
            <ListRow icon={Bell} title="Notifications" />
          </div>
        </div>

        {/* DATA */}
        <div className="flex flex-col gap-1">
          <SectionHeader label="Data" />
          <div>
            <ListRow icon={Download} title="Export Data" />
            <ListRow icon={Upload} title="Import Data" />
            <ListRow icon={Database} title="Database" />
          </div>
        </div>

        {/* ABOUT */}
        <div className="flex flex-col gap-1">
          <SectionHeader label="About" />
          <div>
            <ListRow icon={Info} title="Version" />
            <ListRow icon={FileText} title="License" />
          </div>
        </div>
      </div>
    </div>
  );
}
