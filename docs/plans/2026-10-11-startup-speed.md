# 開いたときとログインしたときの遅さを減らす（2026-10-11）

作成: 2026-10-11 / Issue #17

## 目的

本人が本番を使って「開いてからの起動が遅い」「ログインしたときも少しカクつく」と感じている。どこで待っているのかを測り、待ちが大きいところから減らす。

## 今の作りで、待ちになりそうなところ

コードを読んで見つけた候補。まだ測っていないので、どれが効いているかは分からない。

### 1つの画面を出すまでに、Supabase Auth へ何度も問い合わせる

- `proxy.ts` → `lib/supabase/middleware.ts` の `updateSession` は、リクエストのたびに `supabase.auth.getUser()` を呼ぶ。`getUser()` は Cookie の JWT を手元で確かめるだけでなく、Supabase Auth のサーバーに毎回問い合わせる
- 画面側でも、データを取る Action がそれぞれ `lib/auth.ts` の `getCurrentUserId()` を呼び、そこでも `getUser()` が走る。ホーム（`app/(app)/page.tsx`）は5つの Action を並べて呼ぶので、`proxy.ts` の1回とあわせて、1画面で6回問い合わせる。並べて呼んではいるが、その分 DB の問い合わせが始まるのが遅れる
- 画像以外の、Next.js が裏で先読みするリクエスト（RSC の prefetch）でも `proxy.ts` が走る

### ホームで、全プレートのウェルを全部読む

`getPlates` は、ウェルの埋まり具合を数えるために、プレートごとに全ウェル（96 Well なら96行）とドロップの数を読む。プレートが増えるほど重くなる。

### サーバーの冷えた起動

Vercel の関数は、しばらく使われないと止まる。久しぶりに開いたときは、関数の起動と、Prisma が DB に繋ぎ直す時間が乗る。Vercel は `hnd1`、Supabase は `ap-northeast-1` で、場所は近い。

### 読み込み中の画面が、`(app)` 全体で1つだけ

`loading.tsx` は `app/(app)/loading.tsx` と `mypage/edit` にしかない。プレートの詳細や設定のページに移るときも、同じ読み込み中の画面になる。

## 進め方

### 1. 測る

直す前に、どこでどれだけ待っているかを数字にする。

- 本番で、ホーム・プレート詳細・ログイン直後のホームを、Playwright で開いて時間を取る（冷えた状態と温まった状態の両方）
- サーバー側は、`getUser()` の1回の時間と、各 Action の DB の時間を、一時的にログに出して Vercel のログで見る。測り終わったら消す
- 冷えた起動は、Vercel のログの `Init Duration` を見る

### 2. 測った結果を見て直す（候補）

効き目が大きいと見込む順。

1. **`getUser()` を、1リクエストに1回にする。** `getCurrentUserId()` を React の `cache()` で包み、同じ描画のあいだは結果を使い回す。安全さは変わらない
2. **`proxy.ts` では `getClaims()` を使う。** JWT の署名を手元で確かめるので、Auth のサーバーに問い合わせない。ただし、プロジェクトの JWT の署名が非対称鍵（JWT Signing Keys）になっている必要がある。今の設定を確かめてから決める。Action 側の `getCurrentUserId()` は `getUser()` のまま残し、守りは緩めない
3. **ホームでは、ウェルの数をまとめて数える。** 全ウェルを読まず、DB で「使っているウェルの数」と「全ウェルの数」を数えて返す
4. **画面ごとに `loading.tsx` を置く。** プレート詳細と設定のページに、それぞれの形をしたスケルトンを出す。待ち時間は変わらないが、押してすぐ反応が見える

冷えた起動は、無料の範囲ではあまり減らせない。測って大きければ、別に考える。

## 決めないこと

- PWA のオフライン表示（Service Worker で画面をキャッシュする）。通知の計画（`docs/plans/2026-10-11-notifications.md`）で Service Worker を入れるので、そのあとに考える

## タスク

- [ ] 本番の時間を測り、この文書の「結果」に書く
- [ ] `lib/auth.ts` — `getCurrentUserId()` を `cache()` で包む
- [ ] Supabase の JWT 署名の設定を確かめ、`lib/supabase/middleware.ts` を `getClaims()` にするか決める
- [ ] `lib/actions/plates.ts` の `getPlates` — ウェルの数を DB で数える
- [ ] `app/(app)/plates/[id]/loading.tsx`・`app/(app)/settings/loading.tsx`
- [ ] 直したあとに同じ方法で測り直し、変わったかを書く

## 確認

`npm run check` が通る。直す前と後で、同じ画面を同じ方法で測り、数字で比べる。

## 結果

（まだ）
