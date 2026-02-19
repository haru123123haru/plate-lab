"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Moon, Info, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { ListRow } from "@/components/list-row";
import { MenuSheet } from "@/components/menu-sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { updateUserSettings } from "@/lib/actions/settings";
import { useTranslation } from "@/components/locale-provider";

type SettingsDialog = "language" | "appearance" | "version" | null;

const languages = [
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

interface SettingsClientProps {
  initialSettings: {
    language: string;
    appearance: string;
  };
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<SettingsDialog>(null);
  const [language, setLanguage] = useState(initialSettings.language);
  const [appearance, setAppearance] = useState(initialSettings.appearance);

  const currentLanguageLabel =
    languages.find((l) => l.value === language)?.label ?? language;

  const appearances = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
    { value: "system", label: t("system") },
  ];

  const currentAppearanceLabel =
    appearances.find((a) => a.value === appearance)?.label ?? appearance;

  const saveLanguage = async (value: string) => {
    setLanguage(value);
    await updateUserSettings({ language: value });
    router.refresh();
  };

  const saveAppearance = async (value: string) => {
    setAppearance(value);
    await updateUserSettings({ appearance: value });
    router.refresh();
  };

  return (
    <div className="bg-bg-primary min-h-dvh">
      <PageHeader
        title={t("settings")}
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

      <div className="flex flex-col gap-8 px-6 pb-8">
        <div className="flex flex-col gap-1">
          <SectionHeader label={t("general")} />
          <div>
            <ListRow
              icon={Globe}
              title={t("language")}
              description={currentLanguageLabel}
              onClick={() => setActiveDialog("language")}
            />
            <ListRow
              icon={Moon}
              title={t("appearance")}
              description={currentAppearanceLabel}
              onClick={() => setActiveDialog("appearance")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <SectionHeader label={t("about")} />
          <div>
            <ListRow
              icon={Info}
              title={t("version")}
              description="v1.0.0"
              onClick={() => setActiveDialog("version")}
            />
          </div>
        </div>
      </div>

      <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} />

      {/* Language Dialog */}
      <Dialog
        open={activeDialog === "language"}
        onOpenChange={(v) => !v && setActiveDialog(null)}
      >
        <DialogContent className="bg-bg-primary">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-text-primary">
              {t("language")}
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              {t("selectLanguage")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {languages.map((l) => (
              <button
                type="button"
                key={l.value}
                onClick={() => saveLanguage(l.value)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-surface p-4 text-left"
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    language === l.value
                      ? "bg-text-primary"
                      : "border-2 border-border-default"
                  )}
                >
                  {language === l.value && (
                    <div className="size-2 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-[15px] font-medium text-text-primary">
                  {l.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Appearance Dialog */}
      <Dialog
        open={activeDialog === "appearance"}
        onOpenChange={(v) => !v && setActiveDialog(null)}
      >
        <DialogContent className="bg-bg-primary">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-text-primary">
              {t("appearance")}
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              {t("chooseTheme")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {appearances.map((a) => (
              <button
                type="button"
                key={a.value}
                onClick={() => saveAppearance(a.value)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-bg-surface p-4 text-left"
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    appearance === a.value
                      ? "bg-text-primary"
                      : "border-2 border-border-default"
                  )}
                >
                  {appearance === a.value && (
                    <div className="size-2 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-[15px] font-medium text-text-primary">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Dialog */}
      <Dialog
        open={activeDialog === "version"}
        onOpenChange={(v) => !v && setActiveDialog(null)}
      >
        <DialogContent className="bg-bg-primary">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-text-primary">
              {t("version")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Version info
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-xl bg-bg-surface p-4">
            <div>
              <div className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                {t("appVersion")}
              </div>
              <div className="mt-1 text-[15px] text-text-primary">1.0.0</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                {t("framework")}
              </div>
              <div className="mt-1 text-[15px] text-text-primary">
                Next.js 16.1.6
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
                {t("build")}
              </div>
              <div className="mt-1 text-[15px] text-text-primary">
                2026-02-18 (Turbopack)
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
