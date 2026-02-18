"use client";

import Link from "next/link";
import { User, FlaskConical, Activity, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";
import { currentUser, plates } from "@/lib/mock-data";

export default function MyPage() {
  const totalPlates = plates.length;
  const activePlates = plates.filter((p) => p.status === "active").length;
  const archivedPlates = plates.filter((p) => p.status === "archived").length;

  return (
    <div className="bg-bg-primary min-h-screen">
      <PageHeader title="My Page" />

      <div className="space-y-6 px-6">
        {/* Profile Card */}
        <div className="flex flex-col items-center rounded-xl bg-bg-surface p-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-border-default">
            <User className="size-7 text-text-secondary" />
          </div>
          <h2 className="mt-3 text-[20px] font-bold text-text-primary">
            {currentUser.name}
          </h2>
          <p className="mt-1 text-[14px] text-text-secondary">
            {currentUser.role}
          </p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {currentUser.email}
          </p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {currentUser.organization}
          </p>
        </div>

        {/* Edit Profile Button */}
        <Link href="/mypage/edit" className="block">
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl text-[15px]"
          >
            Edit Profile
          </Button>
        </Link>

        {/* Statistics */}
        <div className="space-y-3">
          <SectionHeader label="STATISTICS" />
          <div>
            <ListRow
              icon={FlaskConical}
              title="Total Plates"
              description={`${totalPlates}`}
            />
            <ListRow
              icon={Activity}
              title="Active Plates"
              description={`${activePlates}`}
            />
            <ListRow
              icon={Archive}
              title="Archived"
              description={`${archivedPlates}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
