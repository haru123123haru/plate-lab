"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { countUsedWells } from "@/lib/wells";
import { useRouter } from "next/navigation";
import { Menu, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";
import { FabButton } from "@/components/fab-button";
import { MenuSheet } from "@/components/menu-sheet";
import { NewPlateSheet } from "@/components/new-plate-sheet";
import { useTranslation } from "@/components/locale-provider";
import { searchPlates } from "@/lib/actions/plates";
import { PlateSortChips, usePlateSort } from "@/components/plate-sort-chips";
import { sortPlates } from "@/lib/plate-sort";
import type { PlateType } from "@/types";
import type { SampleStyle } from "@/lib/samples";

interface UiPlate {
  id: string;
  name: string;
  plateType: { name: string };
  filledWells: number;
  totalWells: number;
  setupDate: string;
  updatedAt: string;
  similar?: boolean;
}

export type UiConditionSet = {
  id: number;
  name: string;
  isDefault: boolean;
  reservoirTemplateId: number;
  screeningTemplateId: number;
  reservoirTemplateName: string;
  screeningTemplateName: string;
};

interface DashboardClientProps {
  plates: UiPlate[];
  plateTypes: PlateType[];
  conditionTemplates: {
    id: number;
    name: string;
    description?: string | null;
  }[];
  conditionSets: UiConditionSet[];
  samples: { name: string; style: SampleStyle }[];
}

export function DashboardClient({
  plates,
  plateTypes,
  conditionTemplates,
  conditionSets,
  samples,
}: DashboardClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sort, setSort] = usePlateSort();
  const [filteredPlates, setFilteredPlates] = useState<UiPlate[]>(plates);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newPlateOpen, setNewPlateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 最後に始めた検索の番号。遅れて返った古い検索の結果で上書きしないため
  const latestSearchRef = useRef(0);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    const searchId = ++latestSearchRef.current;
    const results = await searchPlates(query);
    if (searchId !== latestSearchRef.current) return;
    setFilteredPlates(
      results.map((p) => ({
        id: p.id,
        name: p.name,
        plateType: { name: p.plateType.name },
        filledWells: countUsedWells(p.wells),
        totalWells: p.wells.length,
        setupDate: p.setupDate.toISOString().slice(0, 10),
        updatedAt: p.updatedAt.toISOString(),
        similar: p.similar,
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
  const searching = search.trim() !== "";
  const visiblePlates = useMemo(
    () => sortPlates(searching ? filteredPlates : plates, sort),
    [searching, filteredPlates, plates, sort]
  );

  return (
    <div className="bg-bg-primary min-h-screen">
      <PageHeader
        title={t("dashboard")}
        rightAction={
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)}>
            <Menu className="size-6 text-text-primary" />
          </Button>
        }
      />

      <div className="space-y-5 px-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlates")}
        />

        <PlateSortChips value={sort} onChange={setSort} />

        <SectionHeader
          // 更新順でないときは「最近の」と言えない
          label={t(sort === "updated" ? "recentPlates" : "plates")}
          action={t("viewAll")}
          onAction={() => router.push("/samples")}
        />

        <div>
          {visiblePlates.map((plate) => (
            <ListRow
              key={plate.id}
              icon={FlaskConical}
              title={plate.name}
              description={`${plate.plateType.name} · ${plate.filledWells}/${plate.totalWells}`}
              onClick={() => router.push(`/plates/${plate.id}`)}
            />
          ))}
          {visiblePlates.length === 0 && (
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
        samples={samples}
      />
    </div>
  );
}
