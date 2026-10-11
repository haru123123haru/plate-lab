"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthPendingOverlay } from "@/components/auth-pending-overlay";
import { useTranslation } from "@/components/locale-provider";
import { createClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onError: (message: string) => void;
}

export function GoogleSignInButton({
  disabled,
  onError,
}: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);

  // Google の画面から「戻る」で bfcache から復元されたとき、処理中の表示を消す
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setPending(false);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleClick() {
    onError("");
    setPending(true);
    // Server Action を経ずにブラウザから呼び、行き来を1回減らす。
    // 成功するとブラウザが Google へ移動する
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      onError(error.message);
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl"
        onClick={handleClick}
        disabled={disabled || pending}
      >
        {pending && <Loader2 className="animate-spin" />}
        {t("continueWithGoogle")}
      </Button>
      {pending && <AuthPendingOverlay message={t("redirectingToGoogle")} />}
    </>
  );
}
