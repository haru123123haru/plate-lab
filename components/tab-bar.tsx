"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TestTubes, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Samples", href: "/samples", icon: TestTubes },
  { label: "MyPage", href: "/mypage", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="absolute inset-x-0 bottom-0 z-50 flex h-[72px] items-start border-t border-border-default bg-bg-surface pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 pt-2",
              isActive ? "text-text-primary" : "text-text-tertiary"
            )}
          >
            <tab.icon className="size-6" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
