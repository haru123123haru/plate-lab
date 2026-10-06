"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MenuSheet } from "@/components/menu-sheet";
import { useTranslation } from "@/components/locale-provider";
import { getHelpTopics } from "@/lib/help";

export function HelpClient() {
  const { t, locale } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const topics = getHelpTopics(locale);

  return (
    <div className="bg-bg-primary min-h-dvh">
      <PageHeader
        title={t("help")}
        rightAction={
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)}>
            <Menu className="size-6 text-text-primary" />
          </Button>
        }
      />

      <div className="flex flex-col gap-6 px-6 pb-12">
        {/* 目次 */}
        <nav className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            {t("helpContents")}
          </span>
          <ul className="mt-2 rounded-xl bg-bg-surface px-4 py-2">
            {topics.map((topic) => (
              <li key={topic.id}>
                <a
                  href={`#${topic.id}`}
                  className="block py-2 text-[15px] text-text-primary underline-offset-4 hover:underline"
                >
                  {topic.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {topics.map((topic) => (
          <section
            key={topic.id}
            id={topic.id}
            className="scroll-mt-6 rounded-xl bg-bg-surface p-4"
          >
            <h2 className="text-[17px] font-bold text-text-primary">
              {topic.title}
            </h2>

            {topic.intro && (
              <p className="mt-3 text-[14px] leading-relaxed text-text-primary">
                {topic.intro}
              </p>
            )}

            {topic.steps?.map((group, i) => (
              <div key={group.heading ?? i} className="mt-4">
                {group.heading && (
                  <h3 className="mb-2 text-[13px] font-semibold text-text-secondary">
                    {group.heading}
                  </h3>
                )}
                <ol className="flex flex-col gap-2">
                  {group.items.map((item, j) => (
                    <li key={item} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-text-primary text-[12px] font-bold text-bg-primary">
                        {j + 1}
                      </span>
                      <span className="pt-0.5 text-[14px] leading-relaxed text-text-primary">
                        {item}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}

            {topic.notes && (
              <ul className="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-4">
                {topic.notes.map((note) => (
                  <li
                    key={note}
                    className="text-[13px] leading-relaxed text-text-secondary"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
}
