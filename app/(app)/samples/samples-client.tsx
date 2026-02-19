"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { PlateCard } from "@/components/plate-card";
import { FabButton } from "@/components/fab-button";
import { MenuSheet } from "@/components/menu-sheet";
import { NewPlateSheet } from "@/components/new-plate-sheet";
import { useTranslation } from "@/components/locale-provider";
import { searchPlates } from "@/lib/actions/plates";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { PlateType } from "@/types";

interface UiPlate {
  id: string;
  name: string;
  status: "active" | "archived";
  plateType: { name: string; wellCount: number };
  filledWells: number;
  totalWells: number;
  createdAt: string;
}

import type { UiConditionSet } from "@/app/(app)/dashboard-client";

interface SamplesClientProps {
  plates: UiPlate[];
  plateTypes: PlateType[];
  conditionTemplates: {
    id: number;
    name: string;
    description?: string | null;
  }[];
  conditionSets: UiConditionSet[];
}

export function SamplesClient({
  plates,
  plateTypes,
  conditionTemplates,
  conditionSets,
}: SamplesClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UiPlate[]>(plates);
  const [tab, setTab] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [newPlateOpen, setNewPlateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults(plates);
        return;
      }
      const results = await searchPlates(query);
      setSearchResults(
        results.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status.toLowerCase() as "active" | "archived",
          plateType: { name: p.plateType.name, wellCount: p.plateType.wellCount },
          filledWells: p.wells.filter((w) => w.status !== "EMPTY").length,
          totalWells: p.wells.length,
          createdAt: new Date(p.createdAt).toLocaleDateString(),
        }))
      );
    },
    [plates]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, doSearch]);

  useEffect(() => {
    if (!search.trim()) setSearchResults(plates);
  }, [plates, search]);

  const filteredPlates = searchResults.filter((plate) => {
    return (
      tab === "all" ||
      (tab === "active" && plate.status === "active") ||
      (tab === "archived" && plate.status === "archived")
    );
  });

  return (
    <div className="bg-bg-primary min-h-screen">
      <PageHeader
        title={t("samples")}
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
              {t("all")}
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="rounded-none bg-transparent text-text-tertiary data-[state=active]:border-b-2 data-[state=active]:border-border-strong data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              {t("active")}
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              className="rounded-none bg-transparent text-text-tertiary data-[state=active]:border-b-2 data-[state=active]:border-border-strong data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              {t("archived")}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t("searchPlates")}
            />
          </div>
        </Tabs>

        <div className="mt-4 space-y-3">
          {filteredPlates.length > 0 ? (
            filteredPlates.map((plate) => (
              <PlateCard
                key={plate.id}
                plate={plate}
                onClick={() => router.push(`/plates/${plate.id}`)}
              />
            ))
          ) : (
            <p className="py-8 text-center text-[14px] text-text-secondary">
              {t("noPlatesFound")}
            </p>
          )}
        </div>
      </div>

      <FabButton onClick={() => setNewPlateOpen(true)} />
      <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
      <NewPlateSheet
        open={newPlateOpen}
        onOpenChange={setNewPlateOpen}
        plateTypes={plateTypes}
        conditionTemplates={conditionTemplates}
        conditionSets={conditionSets}
      />
    </div>
  );
}
