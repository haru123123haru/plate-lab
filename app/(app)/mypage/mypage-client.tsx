"use client";

import { useState } from "react";
import Link from "next/link";
import { User, FlaskConical, Activity, Archive, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";
import { MenuSheet } from "@/components/menu-sheet";
import { useTranslation } from "@/components/locale-provider";

interface MyPageClientProps {
  user: {
    name: string;
    email: string;
    role: string | null;
    organization: string | null;
  };
  stats: {
    totalPlates: number;
    activePlates: number;
    archivedPlates: number;
  };
}

export function MyPageClient({ user, stats }: MyPageClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="bg-bg-primary min-h-screen">
      <PageHeader
        title={t("myPage")}
        rightAction={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-6 text-text-primary" />
          </Button>
        }
      />

      <div className="space-y-6 px-6">
        {/* Profile Card */}
        <div className="flex flex-col items-center rounded-xl bg-bg-surface p-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-border-default">
            <User className="size-7 text-text-secondary" />
          </div>
          <h2 className="mt-3 text-[20px] font-bold text-text-primary">
            {user.name}
          </h2>
          <p className="mt-1 text-[14px] text-text-secondary">
            {user.role ?? ""}
          </p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {user.email}
          </p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {user.organization ?? ""}
          </p>
        </div>

        {/* Edit Profile Button */}
        <Link href="/mypage/edit" className="block">
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl text-[15px]"
          >
            {t("editProfile")}
          </Button>
        </Link>

        {/* Statistics */}
        <div className="space-y-3">
          <SectionHeader label={t("statistics")} />
          <div>
            <ListRow
              icon={FlaskConical}
              title={t("totalPlates")}
              description={`${stats.totalPlates}`}
            />
            <ListRow
              icon={Activity}
              title={t("activePlates")}
              description={`${stats.activePlates}`}
            />
            <ListRow
              icon={Archive}
              title={t("archivedCount")}
              description={`${stats.archivedPlates}`}
            />
          </div>
        </div>
      </div>

      <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
}
