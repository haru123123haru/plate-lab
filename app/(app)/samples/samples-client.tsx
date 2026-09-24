"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { countUsedWells, summarizeSamples } from "@/lib/wells";
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
import type { PlateType } from "@/types";

interface UiPlate {
  id: string;
  name: string;
  plateType: { name: string };
  filledWells: number;
  totalWells: number;
  createdAt: string;
  samples: { names: string[]; dropCount: number };
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [newPlateOpen, setNewPlateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    const results = await searchPlates(query);
    setSearchResults(
      results.map((p) => ({
        id: p.id,
        name: p.name,
        plateType: { name: p.plateType.name },
        filledWells: countUsedWells(p.wells),
        samples: summarizeSamples(p.wells),
        totalWells: p.wells.length,
        createdAt: new Date(p.createdAt).toLocaleDateString(),
      }))
    );
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, doSearch]);

  // 検索中でなければ最新の plates（router.refresh 後も含む）をそのまま出す
  const visiblePlates = search.trim() ? searchResults : plates;

  return (
    <div className="bg-bg-primary min-h-screen">
      <PageHeader
        title={t("samples")}
        rightAction={
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)}>
            <Menu className="size-6 text-text-primary" />
          </Button>
        }
      />

      <div className="px-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlates")}
        />

        <div className="mt-4 space-y-3">
          {visiblePlates.length > 0 ? (
            visiblePlates.map((plate) => (
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
