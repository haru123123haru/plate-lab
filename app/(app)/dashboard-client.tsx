"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
import type { PlateType } from "@/types";

interface UiPlate {
  id: string;
  name: string;
  status: "active" | "archived";
  plateType: { name: string; wellCount: number };
  filledWells: number;
  totalWells: number;
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
}

export function DashboardClient({
  plates,
  plateTypes,
  conditionTemplates,
  conditionSets,
}: DashboardClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filteredPlates, setFilteredPlates] = useState<UiPlate[]>(plates);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newPlateOpen, setNewPlateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setFilteredPlates(plates);
        return;
      }
      const results = await searchPlates(query);
      setFilteredPlates(
        results.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status.toLowerCase() as "active" | "archived",
          plateType: { name: p.plateType.name, wellCount: p.plateType.wellCount },
          filledWells: p.wells.filter((w) => w.status !== "EMPTY").length,
          totalWells: p.wells.length,
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

  // plates が変わった時（router.refresh後）に反映
  useEffect(() => {
    if (!search.trim()) setFilteredPlates(plates);
  }, [plates, search]);

  return (
    <div className="bg-bg-primary min-h-screen">
      <PageHeader
        title={t("dashboard")}
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

      <div className="space-y-5 px-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlates")}
        />

        <SectionHeader
          label={t("recentPlates")}
          action={t("viewAll")}
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
