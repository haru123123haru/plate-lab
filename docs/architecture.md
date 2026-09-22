# PLATE LAB 現状アーキテクチャ

最終更新: 2026-09-22

このドキュメントは、PLATE LAB の設計とインフラの現状を一か所にまとめたもの。読者は開発者本人（および引き継ぎを受ける人）を想定している。Next.js の App Router と Prisma の基本は知っている前提で書いた。

1〜4章はアプリの設計で、初回は通読してほしい。5章以降はインフラと運用で、必要なときに引けばいい。ただし**6章「ローカル開発の始め方」だけは、しばらく触っていない状態から再開するとき必ず読む**こと。放置後の復帰で踏む罠が3つあり、知らないと確実に詰まる。

---

## 1. DNA結晶化プレートを QR コードで物理とデジタルに紐付けるアプリ

研究室で作る結晶化プレートには、どのサンプルをどの条件で仕込んだかという情報が紐付く。プレート自体は物理的に積み上がっていくので、数が増えると「あの条件のプレート」を探せなくなる。PLATE LAB はその情報を Web で管理し、プレートに貼った QR コードから詳細画面（`/plates/[id]`）に飛べるようにする。

扱うプレートは3種類——Hanging Drop の24穴、Sitting Drop の96穴（ロボット作成）、Sitting Drop の手動作成。画面はモバイルファーストで、幅402px を基準に設計されている。実験台でスマホから読む使い方を想定しているため。

本番URL: https://plate-manage-app.vercel.app

---

## 2. 全画面が「Server でデータを取り、Client で操作する」2層に分かれている

ルーティングは App Router のルートグループで2つに割れている。`app/(app)/` が認証必須のアプリ本体、`app/(auth)/` がログインと新規登録。グループ名は URL に出ないので、`app/(app)/page.tsx` がそのまま `/` になる。

| URL | ファイル | 役割 |
| --- | --- | --- |
| `/` | `app/(app)/page.tsx` | ダッシュボード。プレート一覧 |
| `/plates/[id]` | `app/(app)/plates/[id]/page.tsx` | プレート詳細。QR コードの表示先 |
| `/samples` | `app/(app)/samples/page.tsx` | サンプル一覧と検索 |
| `/mypage`, `/mypage/edit` | `app/(app)/mypage/` | ユーザー情報と編集 |
| `/settings` | `app/(app)/settings/page.tsx` | 言語と外観の設定 |
| `/login`, `/register` | `app/(auth)/` | 認証フォーム |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth のコード交換 |

各画面は例外なく同じ形をとる。`page.tsx` は Server Component としてデータ取得と整形だけを行い、`*-client.tsx` に渡す。状態とインタラクションはすべて Client 側。この分離のおかげで、DB アクセスがクライアントバンドルに混ざる事故が構造的に起きない。

セッションの扱いは `proxy.ts` が担当する。Next.js 16 で middleware のファイル名が `proxy.ts` に変わったのに追随したもので、中身は `lib/supabase/middleware.ts` の `updateSession()` を呼ぶだけ。ここで Supabase のセッション Cookie をリフレッシュし、未認証なら `/login` に飛ばす。

コンポーネントは `components/` 直下にカスタム15個、`components/ui/` に shadcn 由来が10個。ウェルのグリッドだけは3実装に分かれていて、96穴の `well-grid.tsx`、24穴の `well-grid-24.tsx`、新規作成時の選択用 `well-grid-selector.tsx` がある。

サイズで目立つのは `components/new-plate-sheet.tsx` の716行。2番目に大きい `plate-detail-client.tsx`（477行）の1.5倍あり、プレート作成フォームとウェル選択とテンプレート選択が一つのファイルに同居している。手を入れるときは分割から考えたほうがいい。

OAuth のコールバック（`app/auth/callback/route.ts`）だけは少し特殊で、Supabase 側の認証が済んだ直後に Prisma の `User` レコードが無ければ作る。Supabase Auth のユーザーと Prisma の `User` は別テーブルなので、この橋渡しがないと Google ログインしたユーザーがアプリ内で存在しないことになる。

---

## 3. 条件は「リザーバー × スクリーニング」の2軸で持つ

Prisma のスキーマは `prisma/schema.prisma`。中心は `Plate` で、そこから `Well` がぶら下がる。

- `User` — 認証ユーザー。`id` は Supabase Auth のユーザーIDをそのまま使う
- `UserSettings` — `User` と1対1。言語・外観・通知の設定
- `PlateType` — プレートの種別。穴数を持つ
- `Plate` — プレート本体。`plateType` が必須、`reservoirTemplate` と `screeningTemplate` がそれぞれ任意
- `Well` — 1ウェル分の記録。`plate` に対して cascade delete、`@@unique([plateId, position])` で位置の重複を防ぐ
- `ConditionTemplate` — 条件テンプレート。`TemplateWell` を持つ
- `TemplateWell` — テンプレート内の1ウェル分の組成。検索の対象になる実データ
- `ConditionSet` — リザーバーとスクリーニングのテンプレートをセットにしたもの

当初の設計では `Plate` が持つテンプレートは1本だけで、足りない分はメモのテキストで補う想定だった。実装はそこから離れていて、リザーバー条件とスクリーニング条件を別々の `ConditionTemplate` として持つ形になっている。分岐点はマイグレーション `20260218064000_split_reservoir_screening` で、ここで `templateId` が2つに割れた。

条件データそのものは Markdown で管理されている。`conditions/mpd.md` と `conditions/peg.md` が96ウェル分の条件表（Salt × Precipitant × Polyamine × Buffer の組み合わせ）を持ち、`prisma/seed.ts` の `parseConditionMd()` がこれをパースして `TemplateWell` に流し込む。条件をコードやSQLではなくドキュメントで持つ設計で、条件を足すときは Markdown の表に行を足す。

マイグレーションは5本。`init` で全体を作り、`split_reservoir_screening` で条件を2軸化、`add_condition_set` でセットを追加、`remove_completed_status` で `PlateStatus` から `COMPLETED` を削除、`add_condition_ownership` で所有権のカラムを足した。

---

## 4. 認可は3層あるが、実際に効いているのはアプリ層だけ

ここがこのアプリで一番込み入っていて、一番誤解しやすい部分。

所有権のモデルそのものは `lib/access-control.ts` に集約されている。考え方は単純で、共有カタログ（`isDefault = true`）は全員が読め、自分が作ったもの（`createdById = userId`）は自分が読める。この2条件の OR を Prisma の `where` 句として返す関数が、`PlateType`・`ConditionTemplate`・`ConditionSet` の3種それぞれに用意されている。`Plate` と `Well` はもっと単純で、所有者しか触れない。管理者ロールは存在しないので、共有カタログを編集できる人は誰もいない。

それを実際に適用しているのが `lib/actions/` の各 Server Action。全ファイルが先頭で `getCurrentUserId()`（`lib/auth.ts`。未認証なら `/login` へ redirect）を呼び、取得した userId を `where` 句に必ず混ぜる。丁寧に作られている箇所が2つあって、`getPlateById()` は `where` で絞ったうえで取得後に `plate.userId !== userId` をもう一度確認する。`deleteConditionTemplate()` は「他ユーザーの ConditionSet や Plate から参照されていないか」をトランザクション内で確認してから削除する。

3層目の RLS は `supabase/migrations/20260219_enable_rls.sql` にある。ただしこれは2つの理由で当てにできない。

一つ目は内容が古いこと。このSQLでは `ConditionTemplate`・`ConditionSet`・`TemplateWell` のポリシーが「認証済みなら誰でも読み書き削除できる」（`auth.uid() IS NOT NULL`）になっている。所有権モデルを導入した `add_condition_ownership` マイグレーション以降のアプリ層の挙動と食い違っており、RLS のほうが緩い。

二つ目は、そもそも Prisma 経由のアクセスに RLS が効かないこと。Prisma は `DATABASE_URL` の Postgres 接続を直接使っており、この接続のロールは RLS をバイパスする。つまりアプリの全アクセスは RLS を素通りする。

RLS SQL の末尾には「Prisma は service_role キーで接続するため」というコメントがあるが、これは事実と違う。`SUPABASE_SERVICE_ROLE_KEY` はコードのどこからも参照されていない。結論は同じ——RLS は効かない——だが、理由の記述は誤っている。

**したがって、防御線はアプリ層の Server Action 1枚だけ。** ここを迂回する経路（Supabase の REST API を anon key で直接叩くなど）が作られた場合、RLS は現状の緩いポリシーしか返さない。RLS を実効的な二重防御として使うなら、SQL を所有権モデルに合わせて書き直したうえで、Prisma の接続ロールを RLS の効くものに変える必要がある。どちらも未着手。

テストは `tests/validation-access-control.test.ts` の1本のみ。Zod スキーマの検証と、`access-control.ts` が返す `where` 句の形を確認する純粋関数テストで、DB には繋がない。したがって「他人のデータが実際に取得できないこと」は自動検証されていない。

---

## 5. インフラは Vercel + Supabase + Google OAuth の3点構成

| 層 | サービス | 備考 |
| --- | --- | --- |
| ホスティング | Vercel（プロジェクト名 `plate-manage-app`） | Node.js 24.x、`main` ブランチに連動 |
| DB | Supabase PostgreSQL（`nbavmqhtkdiacpwvblij`, ap-northeast-1） | Prisma から Pooler 経由で接続 |
| 認証 | Supabase Auth | メール + パスワード、Google OAuth |
| ソース | GitHub `haru123123haru/plate-lab` | |

アプリが実際に読む環境変数は4つだけ。

- `DATABASE_URL` — Transaction pooler（6543番ポート、`?pgbouncer=true`）。`lib/prisma.ts` と `prisma/seed.ts` が読む
- `DIRECT_URL` — Session pooler（5432番ポート）。`prisma.config.ts` がマイグレーション用に読む
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `lib/supabase/` の3ファイルが読む

ローカルの `.env` には他に `SUPABASE_SERVICE_ROLE_KEY`・`GOOGLE_CLIENT_ID`・`GOOGLE_CLIENT_SECRET` も書かれているが、コードからは一切参照されていない。Google の認証情報は Supabase 側（`supabase/config.toml` の `[auth.external.google]` と、本番はダッシュボード）に登録するものなので、アプリに持つ必要がない。実質的に死んだ変数。

セキュリティヘッダは `next.config.ts` で設定済み。`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`、`Permissions-Policy` でカメラ・マイク・位置情報を無効化、`poweredByHeader` も落としてある。

---

## 6. ローカル開発の始め方

`.env` はローカルの Supabase（Docker）を指している。本番DBには繋がらないので、まずローカル環境を立てる。

```bash
# 1. Docker Desktop を起動しておく

# 2. ローカル Supabase 一式を起動（Postgres 54322、API 54321、Studio 54323）
npx supabase start

# 3. マイグレーション適用と Prisma クライアント生成
npx prisma migrate deploy
npx prisma generate

# 4. データが無ければ投入
npx prisma db seed

# 5. 起動
npm run dev
```

**ブラウザでは `http://127.0.0.1:3000` を開く。** `localhost:3000` ではない。

### 放置後の復帰で踏む罠3つ

#### `supabase start` が "already running" で拒否される

Docker Desktop を終了すると各コンテナは Exit 137（SIGKILL）で落ちるが、CLI 側の状態ファイルは「起動中」のまま残る。`npx supabase stop` を先に実行してから `start` し直せば戻る。データは Docker volume に残っているので失われない。

#### dev サーバーが 3001 に逃げると Google ログインが失敗する

3000 が別プロセスに掴まれていると Next.js は 3001 を使うが、`supabase/config.toml` の `additional_redirect_urls` には `http://127.0.0.1:3000/auth/callback` しか登録されていない。必ず 3000 を空けてから起動する。前回の `next dev` が残っている場合は `netstat -ano | grep :3000` で PID を調べて終了させる。

#### `localhost` と `127.0.0.1` は別物として扱われる

Supabase のリダイレクト検証は文字列マッチなので、ブラウザのアドレスバーが `localhost:3000` だと `signInWithGoogle()` が組み立てる `${origin}/auth/callback` が許可リストと一致せず弾かれる。同じサーバーに繋がっていても通らない。

### ログインできるアカウント

`auth.users` と Prisma の `User` が両方に存在するアカウントだけがログインできる。seed が作るダミーユーザーは Prisma 側にしか無いのでログイン不可。Google プロバイダで作られたアカウントはパスワードを持たないため、パスワードログインもできない（Google ログインのみ）。

現状のローカルDBには Plate 6件、Well 432件などのデータが残っている。

---

## 7. 本番の状態

2026-09-22 時点で、本番は最新のコードで稼働している。

デプロイは `main` ブランチへの push で自動的に走る。ビルドコマンドは `prisma migrate deploy && prisma generate && next build` で、デプロイのたびに本番DBへマイグレーションが適用される。マイグレーションが失敗するとビルドも失敗するので、壊れた組み合わせが本番に出ることはない。

この構成には副作用が2つある。ひとつは、Supabase が一時停止しているとビルドも失敗すること。もうひとつは、preview 用の環境変数を追加するときに本番と同じ `DIRECT_URL` を入れると、ブランチを push するたびに本番DBへマイグレーションが走ってしまうこと。preview の環境変数は必ず別のDBを指すようにする。

公開設定については、Vercel の Deployment Protection を解除済みで、誰でも本番URLを開ける。ただしアプリ自体は認証必須なので、未ログインの訪問者に見えるのは `/login` だけ。なお Supabase 側でサインアップが有効なため、URLを知った人はアカウントを作れる状態にある。

### 手元から本番DBには繋げない

Vercel 上の `DATABASE_URL` と `DIRECT_URL` は sensitive 型で登録されており、`vercel env pull` でも値を読み出せない（空文字列が返る）。Supabase のDBパスワードもプロジェクト作成時の一度きりしか表示されないため、控えが無ければ復元できない。

つまり手元から本番DBへ接続する手段は現状ない。必要になったら Supabase でDBパスワードをリセットし、Vercel の環境変数を作り直す作業になる。単発のSQLを流したいだけなら、ダッシュボードの SQL Editor を使うほうが早い。

### 本番DBは Prisma の管理外で作られていた

本番DBはもともと Supabase 側で統合SQL（`supabase/migrations/20260218000000_prisma_schema.sql`）を流して作られており、Prisma のマイグレーション履歴を持っていなかった。そのため最初の `prisma migrate deploy` は P3005（"The database schema is not empty"）で停止した。

2026-09-22 に `_prisma_migrations` テーブルを作成し、既存4本を適用済みとして記録（baseline）して解決している。以降は通常のマイグレーションフローが使える。

---

## 8. 既知の課題

重いものが2つある。

ひとつは、RLS がアプリ層の所有権モデルと食い違っていること。4章に書いたとおり、現在の防御線はアプリ層1枚しかない。RLS を二重防御として機能させるなら、SQL を所有権モデルに合わせて書き直したうえで、Prisma の接続ロールを RLS の効くものに変える必要がある。どちらも手つかず。

もうひとつは、DB を伴う結合テストが無いこと。テストは純粋関数だけで、「他人のデータが実際に取得できないこと」は検証されていない。認可ロジックの `where` 句が正しい形を返すことは確認できるが、それが実際のクエリで期待どおり効くかは誰も確かめていない。認可の正しさを本気で担保するなら、ここが最初に埋めるべき穴になる。

残りは軽い。`app/(app)/samples/samples-client.tsx` の91行目付近に lint エラーが2件（`react-hooks/set-state-in-effect`。`useEffect` の中で同期的に `setState` を呼んでいる）残っていて、`npm run check` はここで止まる。`components/new-plate-sheet.tsx` は716行あり、分割の候補。

運用面では、Supabase Free が7日間アクセスの無いプロジェクトを一時停止する点に注意がいる。復帰は自動ではなく、ダッシュボードから手動で Resume する。ビルドが本番DBに接続するようになったため、停止中はデプロイもできない。

もうひとつ運用の罠として、Supabase CLI のログインがマシン全体で共有される。トークンは Windows の資格情報マネージャーに1エントリだけ保存されるので、他プロジェクトでログインし直すとこちらも切り替わる。`npx supabase projects list` に `nbavmqhtkdiacpwvblij` が出るかで確認できる。

---

## 用語集

- **リザーバー条件 / スクリーニング条件** — 結晶化で使う2種類の溶液条件。このアプリでは別々の `ConditionTemplate` として管理し、`Plate` がそれぞれを参照する
- **ConditionSet** — リザーバーとスクリーニングのテンプレートを1組にまとめたもの。プレート作成時に2つを個別に選ぶ手間を省く
- **isDefault** — 共有カタログであることを示すフラグ。`true` なら全ユーザーが読める。ユーザーは `isDefault = true` のデータを作れない
- **RLS（Row Level Security）** — PostgreSQL の行単位アクセス制御。このアプリでは設定されているが Prisma 経由では効いていない（→4章）
- **Deployment Protection** — Vercel のデプロイ保護機能。有効だと Vercel アカウントでのログインなしにデプロイ URL を開けない。現在は解除済み（→7章）
- **Pooler** — Supabase の接続プーラー。Vercel は IPv4 で接続するため、IPv6 のみの直接接続ではなく Pooler の利用が必須。Transaction pooler が6543番、Session pooler が5432番
- **baseline** — 既存のDBに対して Prisma のマイグレーション履歴を後付けで記録すること。`prisma migrate resolve --applied <name>` か、`_prisma_migrations` への直接 INSERT で行う
