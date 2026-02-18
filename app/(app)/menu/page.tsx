"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Samples", href: "/samples" },
  { label: "My Page", href: "/mypage" },
  { label: "Settings", href: "/settings" },
];

export default function MenuPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-dvh flex-col bg-bg-primary px-6">
      {/* Back button */}
      <div className="pt-14 pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="size-6 text-text-primary" />
        </button>
      </div>

      {/* Navigation + Bottom section */}
      <div className="flex flex-1 flex-col justify-between pb-10">
        {/* Nav items */}
        <nav className="flex flex-col">
          {navItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className="block py-4 text-[18px] font-medium text-text-primary"
              >
                {item.label}
              </Link>
              <Separator />
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-4">
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl border-accent-negative text-accent-negative"
          >
            Sign Out
          </Button>
          <span className="text-[12px] text-text-tertiary">
            PLATE LAB v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
}
