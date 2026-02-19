"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useTranslation } from "@/components/locale-provider";
import { signUp, signInWithGoogle } from "@/lib/actions/auth";

export default function RegisterPage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError("");
    setLoading(true);
    try {
      const result = await signUp({ email, password, name });
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect が throw されるので正常
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    try {
      const result = await signInWithGoogle();
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect が throw されるので正常
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-primary px-8">
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Logo */}
        <FlaskConical className="size-10 text-text-primary" />
        <h1 className="mt-4 text-[32px] font-extrabold tracking-[6px] text-text-primary">
          PLATE LAB
        </h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          {t("samplePlateManagement")}
        </p>

        {/* Error */}
        {error && (
          <div className="mt-4 w-full rounded-xl bg-accent-negative/10 px-4 py-3 text-[13px] text-accent-negative">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="mt-10 flex w-full flex-col gap-5">
          <div>
            <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium mb-2">
              {t("fullName")}
            </Label>
            <Input
              type="text"
              placeholder="Your name"
              className="h-12 rounded-xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium mb-2">
              {t("email")}
            </Label>
            <Input
              type="email"
              placeholder="your@email.com"
              className="h-12 rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium mb-2">
              {t("password")}
            </Label>
            <Input
              type="password"
              placeholder="Min 6 characters"
              className="h-12 rounded-xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="button"
            className="h-12 w-full rounded-xl"
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? "..." : t("createAccount")}
          </Button>
        </div>

        {/* OR Divider */}
        <div className="my-6 flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-border-default" />
          <span className="text-[13px] text-text-tertiary">OR</span>
          <div className="h-px flex-1 bg-border-default" />
        </div>

        {/* Google */}
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl"
          onClick={handleGoogleSignIn}
        >
          {t("continueWithGoogle")}
        </Button>

        {/* Sign In Link */}
        <p className="mt-8 text-[14px] text-text-secondary">
          {t("alreadyHaveAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-text-primary underline"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
