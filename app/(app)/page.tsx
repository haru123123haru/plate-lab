"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";
import { FabButton } from "@/components/fab-button";
import { plates } from "@/lib/mock-data";

export default function DashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredPlates = plates.filter((plate) =>
    plate.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-bg-primary min-h-screen">
      <PageHeader
        title="Dashboard"
        rightAction={
          <Link href="/menu">
            <Button variant="ghost" size="icon">
              <Menu className="size-6 text-text-primary" />
            </Button>
          </Link>
        }
      />

      <div className="space-y-5 px-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search plates..."
        />

        <SectionHeader
          label="RECENT PLATES"
          action="View All"
          onAction={() => router.push("/samples")}
        />

        <div>
          {filteredPlates.map((plate) => (
            <ListRow
              key={plate.id}
              icon={FlaskConical}
              title={plate.name}
              description={`${plate.plateType.name} · ${plate.filledWells}/${plate.totalWells}`}
              onClick={() => router.push(`/plates/${plate.id}`)}
            />
          ))}
          {filteredPlates.length === 0 && (
            <p className="py-8 text-center text-[14px] text-text-secondary">
              No plates found
            </p>
          )}
        </div>
      </div>

      <FabButton onClick={() => router.push("/plates/new")} />
    </div>
  );
}
