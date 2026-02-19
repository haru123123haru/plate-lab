"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUser } from "@/lib/actions/user";
import { useTranslation } from "@/components/locale-provider";

interface EditProfileClientProps {
  user: {
    name: string;
    role: string;
    email: string;
    organization: string;
    bio: string;
  };
}

export function EditProfileClient({ user }: EditProfileClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email);
  const [organization, setOrganization] = useState(user.organization);
  const [bio, setBio] = useState(user.bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const result = await updateUser({ name, role, email, organization, bio });
    setSaving(false);
    if (result && "error" in result) {
      setError(result.error);
      return;
    }
    router.back();
    router.refresh();
  };

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
          {t("editProfile")}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="flex flex-col gap-7">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            {t("fullName")}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            {t("rolePosition")}
          </label>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            {t("email")}
          </label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            {t("organization")}
          </label>
          <Input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
            {t("bio")}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
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
          {t("cancel")}
        </Button>
        <Button
          className="h-12 flex-1 rounded-xl"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t("saving") : t("saveChanges")}
        </Button>
      </div>
    </div>
  );
}
