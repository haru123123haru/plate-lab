import { AuthCallback } from "./auth-callback";

// Google から戻ってきたときのページ。Route Handler だと、コードをセッションに替えて
// ホームへ移るまで何も出せないので、ページにして処理中の表示を先に出す
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pick = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : null;
  };

  return (
    <AuthCallback
      code={pick("code")}
      errorDescription={pick("error_description") ?? pick("error")}
    />
  );
}
