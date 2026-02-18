"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NewPlateTypePage() {
  const router = useRouter();

  return (
    <div className="bg-bg-primary min-h-dvh px-7 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer"
        >
          <ArrowLeft className="size-6 text-text-primary" />
        </button>
        <h1 className="text-[20px] font-bold text-text-primary">
          Add Plate Type
        </h1>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-7">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            TYPE NAME
          </label>
          <Input
            placeholder="e.g. 96 Well - Sitting Drop"
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            WELL COUNT
          </label>
          <Input
            type="number"
            placeholder="e.g. 96"
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            DESCRIPTION
          </label>
          <textarea
            rows={4}
            placeholder="Describe this plate type..."
            className="w-full rounded-xl border border-border-default bg-bg-surface p-4 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="mt-10">
        <Button className="h-12 w-full rounded-xl">
          Add Plate Type
        </Button>
        <p className="mt-3 text-center text-[13px] text-text-secondary">
          This type will be available when creating new plates.
        </p>
      </div>
    </div>
  );
}
