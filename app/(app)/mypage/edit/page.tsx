"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EditProfilePage() {
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
          Edit Profile
        </h1>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-7">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            FULL NAME
          </label>
          <Input
            defaultValue="Tanaka Yuki"
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            ROLE / POSITION
          </label>
          <Input
            defaultValue="Research Associate"
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            EMAIL
          </label>
          <Input
            defaultValue="y.tanaka@lab.ac.jp"
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            ORGANIZATION
          </label>
          <Input
            defaultValue="Tokyo Institute of Technology"
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            BIO
          </label>
          <textarea
            rows={5}
            defaultValue="Specializing in protein crystallography and structural biology."
            className="w-full rounded-xl border border-border-default bg-bg-surface p-4 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-10 flex gap-3">
        <Button
          variant="outline"
          className="h-12 flex-1 rounded-xl"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button className="h-12 flex-1 rounded-xl">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
