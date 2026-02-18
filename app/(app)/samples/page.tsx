"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { PlateCard } from "@/components/plate-card";
import { FabButton } from "@/components/fab-button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { plates } from "@/lib/mock-data";

export default function SamplesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filteredPlates = plates.filter((plate) => {
    const matchesTab =
      tab === "all" ||
      (tab === "active" && plate.status === "active") ||
      (tab === "archived" && plate.status === "archived");
    const matchesSearch = plate.name
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="bg-bg-primary min-h-screen">
      <PageHeader title="Samples" />

      <div className="px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList
            variant="line"
            className="w-full justify-start gap-0 bg-transparent p-0"
          >
            <TabsTrigger
              value="all"
              className="rounded-none bg-transparent text-text-tertiary data-[state=active]:border-b-2 data-[state=active]:border-border-strong data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="rounded-none bg-transparent text-text-tertiary data-[state=active]:border-b-2 data-[state=active]:border-border-strong data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              className="rounded-none bg-transparent text-text-tertiary data-[state=active]:border-b-2 data-[state=active]:border-border-strong data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              Archived
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search plates..."
            />
          </div>

        </Tabs>

        <div className="mt-4 space-y-3">
          {filteredPlates.length > 0 ? (
            filteredPlates.map((plate) => (
              <PlateCard
                key={plate.id}
                plate={plate}
                onEdit={() => router.push(`/plates/${plate.id}`)}
              />
            ))
          ) : (
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
