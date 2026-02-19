"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslation } from "@/components/locale-provider";
import { signOut } from "@/lib/actions/auth";

interface MenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MenuSheet({ open, onOpenChange }: MenuSheetProps) {
  const { t } = useTranslation();

  const navItems = [
    { label: t("home"), href: "/" },
    { label: t("samples"), href: "/samples" },
    { label: t("myPage"), href: "/mypage" },
    { label: t("settings"), href: "/settings" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col bg-bg-primary px-6 pt-14 pb-10"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>

        {/* Close button */}
        <SheetClose asChild>
          <button type="button" className="mb-4 self-end cursor-pointer">
            <X className="size-6 text-text-primary" />
          </button>
        </SheetClose>

        {/* Nav items */}
        <nav className="flex flex-col">
          {navItems.map((item) => (
            <div key={item.href}>
              <SheetClose asChild>
                <Link
                  href={item.href}
                  className="block py-4 text-[18px] font-medium text-text-primary"
                >
                  {item.label}
                </Link>
              </SheetClose>
              <Separator />
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="mt-auto flex flex-col items-center gap-4">
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl border-accent-negative text-accent-negative"
            onClick={async () => {
              onOpenChange(false);
              await signOut();
            }}
          >
            {t("signOut")}
          </Button>
          <span className="text-[12px] text-text-tertiary">
            PLATE LAB v1.0.0
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
