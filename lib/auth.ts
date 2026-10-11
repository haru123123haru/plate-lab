import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// ログインしている人の ID。未ログインなら null。
// getUser() は毎回 Supabase Auth に問い合わせるので、1回の描画のあいだは結果を使い回す
// （レイアウトと各 Action が呼ぶ。Server Action から呼んだときは使い回さない）
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  // 一時的な計測（#17）。測り終えたら消す
  const started = performance.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log(
    `[timing] auth.getUser ${Math.round(performance.now() - started)}ms`
  );
  return user?.id ?? null;
});

export async function getCurrentUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}
