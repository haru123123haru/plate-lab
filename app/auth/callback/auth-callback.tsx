"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthPendingOverlay } from "@/components/auth-pending-overlay";
import { useTranslation } from "@/components/locale-provider";
import { completeOAuthSignIn } from "@/lib/actions/auth";

interface AuthCallbackProps {
  code: string | null;
  // Google の画面で断ったときなどに、Supabase がクエリに付けてくる理由
  errorDescription: string | null;
}

// 先に「ログインしています」を出してから、Server Action でコードをセッションに替える
export function AuthCallback({ code, errorDescription }: AuthCallbackProps) {
  const { t } = useTranslation();
  // null の間は処理中。失敗したら理由（分からなければ空文字）を入れる
  const [error, setError] = useState<string | null>(
    code ? null : (errorDescription ?? "")
  );
  // コードは1回しか使えないので、開発時の StrictMode で effect が2回走っても1回だけ呼ぶ
  const started = useRef(false);

  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;

    completeOAuthSignIn(code)
      .then((result) => {
        if (result?.error) setError(result.error);
      })
      .catch((e: unknown) => {
        // Action の中で redirect すると、Promise は redirect のエラーで失敗する。
        // これはホームへ移る途中なので、処理中の表示のままにする
        if (isRedirectError(e)) return;
        setError("");
      });
  }, [code]);

  if (error === null) {
    return <AuthPendingOverlay message={t("signingIn")} />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg-primary px-8 text-center">
      <p className="text-[16px] font-semibold text-text-primary">
        {t("signInFailed")}
      </p>
      {error && <p className="text-[13px] text-text-secondary">{error}</p>}
      <Link
        href="/login"
        className="mt-2 text-[14px] font-semibold text-text-primary underline"
      >
        {t("backToLogin")}
      </Link>
    </div>
  );
}

// next/navigation の redirect() が投げるエラーは digest が NEXT_REDIRECT で始まる
function isRedirectError(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof e.digest === "string" &&
    e.digest.startsWith("NEXT_REDIRECT")
  );
}
