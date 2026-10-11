import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッション Cookie の更新と、ログインしているかの判定だけをする。
  // getClaims() は JWT の署名を手元の公開鍵（JWKS）で確かめるので、getUser() と違って
  // リクエストのたびに Supabase Auth へ問い合わせない（本番は ES256 の非対称鍵）。
  // 期限切れならここでリフレッシュする。データを守るのは各 Action の getCurrentUserId()
  // 一時的な計測（#17）。測り終えたら消す
  const started = performance.now();
  const { data } = await supabase.auth.getClaims();
  console.log(
    `[timing] proxy getClaims ${Math.round(performance.now() - started)}ms`
  );
  const user = data?.claims.sub ? data.claims : null;

  // 未認証ユーザーを /login にリダイレクト（認証ページ自体は除外）
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/auth/callback");

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
