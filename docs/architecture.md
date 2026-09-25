# PLATE LAB 現状アーキテクチャ

最終更新: 2026-09-25

このドキュメントは、PLATE LAB の設計とインフラの現状を一か所にまとめたもの。読者は開発者本人（および引き継ぎを受ける人）を想定している。Next.js の App Router と Prisma の基本は知っている前提で書いた。

1〜4章はアプリの設計で、初回は通読してほしい。5章以降はインフラと運用で、必要なときに引けばいい。ただし**6章「ローカル開発の始め方」だけは、しばらく触っていない状態から再開するとき必ず読む**こと。放置後の復帰で踏む罠が3つあり、知らないと確実に詰まる。

---

## 1. DNA結晶化プレートを QR コードで物理とデジタルに紐付けるアプリ

研究室で作る結晶化プレートには、どのサンプルをどの条件で仕込んだかという情報が紐付く。プレート自体は物理的に積み上がっていくので、数が増えると「あの条件のプレート」を探せなくなる。PLATE LAB はその情報を Web で管理し、プレートに貼った QR コードから詳細画面（`/plates/[id]`）に飛べるようにする。

共有のプレート種別は5つある。1ウェルに1ドロップの3種類（Hanging Drop の24穴、Sitting Drop の96穴（ロボット作成）、Sitting Drop の手動作成）と、1ウェルに複数のドロップを置く2種類だ。後者は「24 Well - Sitting 4 Drop」（4×6、1ウェルに小さい溝が4つ）と「15 Well - Hanging 3 Drop」（3×5、1ウェルに最大3ドロップ）。記録はドロップ単位で、サンプル名・濃度・メモと、日付つきの観察の履歴を持つ（→3章）。画面はモバイルファーストで、幅402px を基準に設計されている。実験台でスマホから読む使い方を想定しているため。

本番URL: https://plate-manage-app.vercel.app

---

## 2. 全画面が「Server でデータを取り、Client で操作する」2層に分かれている

ルーティングは App Router のルートグループで2つに割れている。`app/(app)/` が認証必須のアプリ本体、`app/(auth)/` がログインと新規登録。グループ名は URL に出ないので、`app/(app)/page.tsx` がそのまま `/` になる。

| URL                       | ファイル                          | 役割                             |
| ------------------------- | --------------------------------- | -------------------------------- |
| `/`                       | `app/(app)/page.tsx`              | ダッシュボード。プレート一覧     |
| `/plates/[id]`            | `app/(app)/plates/[id]/page.tsx`  | プレート詳細。QR コードの表示先  |
| `/samples`                | `app/(app)/samples/page.tsx`      | サンプル一覧と検索               |
| `/mypage`, `/mypage/edit` | `app/(app)/mypage/`               | ユーザー情報と編集               |
| `/trash`                  | `app/(app)/trash/page.tsx`        | ゴミ箱。復元と完全削除           |
| `/settings`               | `app/(app)/settings/page.tsx`     | 言語と外観の設定                 |
| `/settings/plate-types`   | `app/(app)/settings/plate-types/` | プレートタイプの一覧・追加・削除 |
| `/login`, `/register`     | `app/(auth)/`                     | 認証フォーム                     |
| `/auth/callback`          | `app/auth/callback/route.ts`      | OAuth のコード交換               |

各画面は例外なく同じ形をとる。`page.tsx` は Server Component としてデータ取得と整形だけを行い、`*-client.tsx` に渡す。状態とインタラクションはすべて Client 側。この分離のおかげで、DB アクセスがクライアントバンドルに混ざる事故が構造的に起きない。

読み込み中の表示は `app/(app)/loading.tsx` の1つだけで、グレーの箱を点滅させる。`(app)` の直下の画面が入れ替わる遷移で、データがそろうまでこれが出る。ヘッダーは各ページが描いているので、読み込み中は画面全体が置き換わる。`/mypage` → `/mypage/edit` は入れ子の遷移で `(app)` の境界が作り直されないため、`app/(app)/mypage/edit/loading.tsx` で同じスケルトンを再エクスポートしている。

セッションの扱いは `proxy.ts` が担当する。Next.js 16 で middleware のファイル名が `proxy.ts` に変わったのに追随したもので、中身は `lib/supabase/middleware.ts` の `updateSession()` を呼ぶだけ。ここで Supabase のセッション Cookie をリフレッシュし、未認証なら `/login` に飛ばす。

コンポーネントは `components/` 直下にカスタム17個、`components/ui/` に shadcn 由来が10個。ウェルまわりは次の5つで分担している。

- `well-shape.tsx` — 1ウェルの描き方（置き場所の丸、SITTING の溝、HANGING の外の丸）。置き場所の位置をウェルの正方形に対する % で持ち、グリッドの1マスとシートの大きい図の両方がこれを使う
- `well-grid.tsx` — 詳細画面のグリッド。行数・列数・描き方・最大ドロップ数を受け取り、ドロップのある置き場所を塗る
- `well-sheet.tsx` — ウェルを押すと下から出るシート。条件の表示、置き場所ごとのドロップの追加・編集・削除、観察の履歴
- `well-grid-selector.tsx` — ウェルを複数選ぶためのグリッド
- `bulk-drop-form.tsx` — 選んだウェルと置き場所に、同じサンプルをまとめて入れるフォーム。作成画面と、詳細画面の編集モードで使う

サイズで目立つのは `components/new-plate-sheet.tsx` の653行。ウェル選択とサンプル名の入力は `bulk-drop-form.tsx` に切り出したが、まだプレート作成フォームとテンプレート選択が同居している。2番目は `plate-detail-client.tsx`（503行）。

OAuth のコールバック（`app/auth/callback/route.ts`）だけは少し特殊で、Supabase 側の認証が済んだ直後に Prisma の `User` レコードが無ければ作る。Supabase Auth のユーザーと Prisma の `User` は別テーブルなので、この橋渡しがないと Google ログインしたユーザーがアプリ内で存在しないことになる。

---

## 3. 条件は「リザーバー × スクリーニング」の2軸で持つ

Prisma のスキーマは `prisma/schema.prisma`。中心は `Plate` で、`Well` → `Drop` → `Observation` の順にぶら下がる。

- `User` — 認証ユーザー。`id` は Supabase Auth のユーザーIDをそのまま使う
- `UserSettings` — `User` と1対1。言語・外観・通知の設定
- `PlateType` — プレートの種別。形を `rows`・`cols`・`maxDrops`（1ウェルの最大ドロップ数）・`layout`（`SITTING` か `HANGING`）で持つ。描き方があるのは「1ドロップ」「SITTING の4ドロップ」「HANGING の3ドロップ」の3通りだけで、種別作成ではそれ以外を作らせない。自分で作った種別は `/settings/plate-types` で足し引きする。使っているプレートが1枚でもあれば（ゴミ箱のものも含む）消せない。`Plate.plateTypeId` の外部キーが `ON DELETE RESTRICT` なので、数えたあとにプレートが作られても DB が削除を拒む
- `Plate` — プレート本体。`plateType` が必須、`reservoirTemplate` と `screeningTemplate` がそれぞれ任意。`deletedAt` に日時が入っていればゴミ箱にある。`setupDate` は実験を仕込んだ日（日付だけ）で、作成時に利用者が選び、あとから直せる。アプリを使う前からあるプレートも登録できるよう、記録を作った時刻（`createdAt`）とは別に持つ。画面に出す日付はこちらで、`createdAt` は出さない。観察日と同じく `"YYYY-MM-DD"` の文字列で受け、UTC の0時として保存する。2026-09-25 に足したときは、既存のプレートに `createdAt` を日本時間に直した日付を入れた
- `Well` — ウェルの位置（`position`・`row`・`col`）だけを持つ。`plate` に対して cascade delete、`@@unique([plateId, position])` で位置の重複を防ぐ
- `Drop` — 1ドロップ分の記録。サンプル名と濃度（必須）、メモ（任意）。`slot` は 1〜`maxDrops` の置き場所の番号で、`@@unique([wellId, slot])` で同じ置き場所に2つ入らない
- `Observation` — ドロップの観察の履歴。観察日（日付だけ）とメモ
- `ConditionTemplate` — 条件テンプレート。`TemplateWell` を持つ
- `TemplateWell` — テンプレート内の1ウェル分の組成。詳細画面では、プレートのウェルと同じ位置の行を引いて条件を表示する
- `ConditionSet` — リザーバーとスクリーニングのテンプレートをセットにしたもの

記録の単位は、2026-09-25 にウェルからドロップへ移した。それまでは記録欄が `Well` に、サンプル名が `Plate.sampleName` にあったが、1ウェルに複数のドロップを置くプレートでは表せない。「使用中のウェル」は「ドロップが1つ以上あるウェル」で、数え方は `lib/wells.ts` の `countUsedWells` に1つにまとめてある。サンプル検索もドロップのサンプル名を見る。観察日はクライアントから `"YYYY-MM-DD"` の文字列で受け、UTC の0時として保存する。`Date` のまま送ると、日本時間の0〜9時は UTC で前日になるためだ。経緯は計画書 `docs/plans/2026-09-24-plate-drops.md`。

当初の設計では `Plate` が持つテンプレートは1本だけで、足りない分はメモのテキストで補う想定だった。実装はそこから離れていて、リザーバー条件とスクリーニング条件を別々の `ConditionTemplate` として持つ形になっている。分岐点はマイグレーション `20260218064000_split_reservoir_screening` で、ここで `templateId` が2つに割れた。

条件データそのものは Markdown で管理されている。`conditions/mpd.md` と `conditions/peg.md` が96ウェル分の条件表（Salt × Precipitant × Polyamine × Buffer の組み合わせ）を持ち、`prisma/seed.ts` の `parseConditionMd()` がこれをパースして `TemplateWell` に流し込む。条件をコードやSQLではなくドキュメントで持つ設計で、条件を足すときは Markdown の表に行を足す。

プレートを消すと、まずゴミ箱に入る（ソフトデリート）。物理削除はゴミ箱から「完全に削除」したときだけで、ウェル・ドロップ・観察は cascade で一緒に消える。一覧・検索から除く条件は `lib/access-control.ts` の `activePlateWhere` / `trashedPlateWhere` に集約してあり、クエリに直書きしない。直書きすると除外漏れが起きるためで、`tests/plate-trash-actions.test.ts` がゴミ箱まわりの Action の渡す条件を検査している（一覧と検索の `getPlates` / `searchPlates` はテストしていない）。詳細は計画書 `docs/plans/2026-09-23-plate-trash.md`。

以前あった「アーカイブ」（`Plate.status = ARCHIVED`）は、ゴミ箱と役割が重なるので 2026-09-23 に廃止した。アーカイブ済みだったプレートはゴミ箱へ移し、そのあと `status` カラムと `PlateStatus` enum も削除した。先にコードを切り離して本番で動くのを確かめ、そのあとでカラムを消す、という2段階で進めている（理由は計画書の Phase 3）。

マイグレーションは14本。`init` で全体を作り、`split_reservoir_screening` で条件を2軸化、`add_condition_set` でセットを追加、`remove_completed_status` で `PlateStatus` から `COMPLETED` を削除、`add_condition_ownership` で所有権のカラムを足した。`add_plate_soft_delete` で `deletedAt` を足し、`archive_to_trash` でアーカイブ済みをゴミ箱へ移し、`drop_plate_status` で `status` と `PlateStatus` を削除した。最後の2本はスキーマを変えていない。`revoke_data_api_access` は権限を外し（→4章）、`fill_default_template_wells` は本番の共有テンプレートに条件を入れた（→7章）。残りの4本はドロップの導入で、`add_drops_and_plate_shape` で形の欄と `Drop`・`Observation` を足し、`add_multi_drop_plate_types` で新しい2種類を入れ、`move_wells_to_drops` で使用中のウェルを1番の置き場所のドロップへ移し、`drop_well_record_columns` で役割の終わった `Plate.sampleName`・`Well` の記録欄・`WellStatus`・`PlateType.wellCount` を消した。移すときに `Well` の残りの記録欄と観察結果の status は、ドロップのメモへ詰めてある。

---

## 4. 認可はアプリ層で行い、DB への別の入口は閉じてある

ここがこのアプリで一番込み入っていて、一番誤解しやすい部分。

所有権のモデルそのものは `lib/access-control.ts` に集約されている。考え方は単純で、共有カタログ（`isDefault = true`）は全員が読め、自分が作ったもの（`createdById = userId`）は自分が読める。この2条件の OR を Prisma の `where` 句として返す関数が、`PlateType`・`ConditionTemplate`・`ConditionSet` の3種それぞれに用意されている。`Plate` から下（`Well`・`Drop`・`Observation`）はもっと単純で、プレートの持ち主しか触れない。ゴミ箱にあるプレートのドロップと観察は、読めるが編集できない。ドロップと観察の書き込みは、`editableWellWhere` / `editableDropWhere`（ウェル → プレートとたどって、持ち主でゴミ箱に無いこと）を `where` か `connect` の条件に入れて行う。管理者ロールは存在しないので、共有カタログを編集できる人は誰もいない。

それを実際に適用しているのが `lib/actions/` の各 Server Action。全ファイルが先頭で `getCurrentUserId()`（`lib/auth.ts`。未認証なら `/login` へ redirect）を呼び、取得した userId を `where` 句に必ず混ぜる。丁寧に作られている箇所が2つあって、`getPlateById()` は `where` で絞ったうえで取得後に `plate.userId !== userId` をもう一度確認する。`deleteConditionTemplate()` は「他ユーザーの ConditionSet や Plate から参照されていないか」をトランザクション内で確認してから削除する。

アプリ層を通らずに DB に届く入口が、Supabase には一つある。テーブルを自動で公開する REST API（`/rest/v1/<テーブル名>`）で、URL と anon key だけで叩ける。どちらもブラウザ向けの JavaScript に入っているので、秘密ではない。この入口では、`anon` / `authenticated` ロールのテーブル権限と RLS のポリシーの2段で、何ができるかが決まる。

2026-09-24 まで、この入口は開いていた。テーブル権限は Supabase の初期設定のまま全部許可で、実質的に守っていたのは RLS（`supabase/migrations/20260219_enable_rls.sql`）だけだった。RLS は本番では有効だが、ローカルでは無効になっている。本番のポリシーは `User`・`Plate`・`Well` を本人の行に絞っていた。ただ、`ConditionTemplate`・`ConditionSet`・`TemplateWell` は「ログインしていれば誰でも読み書き削除できる」（`auth.uid() IS NOT NULL`）で、アプリ層の所有権モデルより緩かった。サインアップが開いているので、誰でもアカウントを作って共有テンプレートを消せる状態だった。調べた範囲では、悪用された形跡は無い（知らないアカウントは無く、テンプレートの変化も無い）。

これを、マイグレーション `20260924000000_revoke_data_api_access` で塞いだ。`anon` と `authenticated` から、`public` スキーマの全テーブル・シーケンス・関数の権限を外し、今後作るテーブルにも付かないようにしてある。**アプリは Prisma でしか DB に触らない**ので、この変更の影響は受けない。Prisma の接続ロール（`postgres`）は RLS もテーブル権限の制限も受けないためだ。supabase-js は認証にだけ使っていて、データの取得には使っていない。このマイグレーションは、`anon` ロールの無い素の Postgres ではスキップされる。

したがって、**認可を判断しているのはアプリ層の Server Action だけ**で、それ以外の入口は権限の段階で閉じている。RLS の SQL は古いまま残っているが、今は届く経路が無い。REST API を使う機能を今後足すなら、権限を戻す前に RLS を所有権モデルに合わせて書き直す必要がある。

RLS SQL の末尾には「Prisma は service_role キーで接続するため」というコメントがあるが、これは事実と違う。`SUPABASE_SERVICE_ROLE_KEY` はコードのどこからも参照されていない。Prisma が RLS を受けないのは、`postgres` ロールで直接つないでいるからだ。

テストは3本ある。`tests/validation-access-control.test.ts` は Zod スキーマの検証と、`access-control.ts` が返す `where` 句の形を確かめる純粋関数テスト。`tests/plate-trash-actions.test.ts` と `tests/drop-actions.test.ts` は prisma をモックに差し替え、ゴミ箱まわりとドロップ・観察の Action が実際に渡す `where` / `connect` に、持ち主とゴミ箱の条件が入っているかを検査する。この2本があるので、ヘルパーの呼び忘れは検出できる。ただしどちらも DB には繋がないので、「他人のデータが実際に取得できないこと」は自動検証されていない。

---

## 5. インフラは Vercel + Supabase + Google OAuth の3点構成

| 層           | サービス                                                      | 備考                                                       |
| ------------ | ------------------------------------------------------------- | ---------------------------------------------------------- |
| ホスティング | Vercel（プロジェクト名 `plate-manage-app`）                   | Node.js 24.x、`main` ブランチに連動、関数は `hnd1`（東京） |
| DB           | Supabase PostgreSQL（`nbavmqhtkdiacpwvblij`, ap-northeast-1） | Prisma から Pooler 経由で接続                              |
| 認証         | Supabase Auth                                                 | メール + パスワード、Google OAuth                          |
| ソース       | GitHub `haru123123haru/plate-lab`                             |                                                            |

アプリが実際に読む環境変数は4つだけ。

- `DATABASE_URL` — Transaction pooler（6543番ポート、`?pgbouncer=true`）。`lib/prisma.ts` と `prisma/seed.ts` が読む
- `DIRECT_URL` — Session pooler（5432番ポート）。`prisma.config.ts` がマイグレーション用に読む
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `lib/supabase/` の3ファイルが読む

ローカルの `.env` には他に `SUPABASE_SERVICE_ROLE_KEY`・`GOOGLE_CLIENT_ID`・`GOOGLE_CLIENT_SECRET` も書かれているが、コードからは一切参照されていない。Google の認証情報は Supabase 側（`supabase/config.toml` の `[auth.external.google]` と、本番はダッシュボード）に登録するものなので、アプリに持つ必要がない。実質的に死んだ変数。

関数のリージョンは `vercel.json` で `hnd1` に固定している。以前は既定の `iad1`（ワシントン）で動いていて、DB と認証（東京）とのやり取りが1リクエストに何度も太平洋を往復していた。2026-09-24 に変えてから、体感でも速くなった。

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

2026-09-23 時点のローカルDBには Plate 5件（うち2件はゴミ箱）、Well 336件などのデータが残っている。

---

## 7. 本番の状態

ドロップの導入は2回に分けて出した。2026-09-25 に PR #2（`d3ab3d1`）で Phase 1〜3 のマイグレーション3本を出し、本番で次を確かめた。新しいテーブル `Drop`・`Observation` に `anon`・`authenticated` の権限が無いこと、既存の種別に形が埋まったこと、使用中のウェル1152件がすべて1番の置き場所のドロップになったこと。そのあと、元に戻せない列の削除（`drop_well_record_columns`）を別の PR で出した。これで、マイグレーション14本がすべて本番DBに適用されている。

本番の共有プレート種別は3つある。ドロップの導入で入れた2つ（`24 Well - Sitting 4 Drop` と `15 Well - Hanging 3 Drop`）と、2026-09-25 にマイグレーション `add_96_well_plate_type` で入れた `96 Well - Sitting`（8×12、1ドロップ）だ。seed にあるほかの共有種別（`24 Well - Hanging` など）は、本番には最初から無い。ほかに、ユーザーが自分で作った `96well-sitting`（8×12）がある。

本番の共有テンプレートは PEG（ID 3）と MPD（ID 4）、共有セットも同名の2つ（ID 3 と 2）がある。セットの名前が seed（`PEG Set` など）と違うので、手作業で作ったらしい。作り方の記録は残っていない。2026-09-24 までは名前だけの行で、条件（`TemplateWell`）が1件も入っていなかった。`TemplateWell` のシーケンスが一度も使われていなかったので、最初から空だったことになる。消された跡は無い。同日、マイグレーション `fill_default_template_wells` で `conditions/*.md` から96ウェルずつ入れた。

**`prisma db seed` は本番では絶対に実行しない。** 全テーブルを `deleteMany` してから作り直すので、本番のデータが消える。本番のデータを直すときは、今回のように「条件に合う行が無いときだけ入れる」マイグレーションにする。

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

ひとつは、個人テンプレートに中身を登録できないこと。`createConditionTemplate` は名前と説明しか受け取らず、`TemplateWell` を作る経路がどこにも無い。つまり、共有の PEG・MPD 以外の条件は、実質的に登録できない。

もうひとつは、DB を伴う結合テストが無いこと。今あるのは純粋関数のテストと prisma をモックしたテストだけで、「他人のデータが実際に取得できないこと」は検証されていない。Action が正しい `where` 句を渡すことまでは確認できるが、それが実際のクエリで期待どおり効くかは誰も確かめていない。認可の正しさを本気で担保するなら、ここが最初に埋めるべき穴になる。計画書は `docs/plans/2026-09-24-db-integration-tests.md`（未着手）。

サインアップがまだ開いていることも残っている。REST API の入口は閉じたので、アカウントを作られても他人のデータには届かない。それでも、決まったメンバーだけで使うなら閉じたほうがいい。

残りは軽い。`components/new-plate-sheet.tsx` が653行あり、分割の候補になっている。ドロップと観察を足しても `Plate.updatedAt` が変わらないので、一覧の更新順と詳細の「更新日」に反映されない。`npm run check` は format から build まで通る状態にある（検索まわりに残っていた lint エラー2件は 2026-09-24 に解消した）。

運用面では、Supabase Free が7日間アクセスの無いプロジェクトを一時停止する点に注意がいる。復帰は自動ではなく、ダッシュボードから手動で Resume する。ビルドが本番DBに接続するようになったため、停止中はデプロイもできない。

もうひとつ運用の罠として、Supabase CLI のログインがマシン全体で共有される。トークンは Windows の資格情報マネージャーに1エントリだけ保存されるので、他プロジェクトでログインし直すとこちらも切り替わる。`npx supabase projects list` に `nbavmqhtkdiacpwvblij` が出るかで確認できる。

---

## 用語集

- **ドロップ / 置き場所（slot）** — ドロップはウェルの中に置く1滴のサンプルで、記録の単位。置き場所はウェルの中でドロップを置ける位置の番号（1〜`maxDrops`）
- **リザーバー条件 / スクリーニング条件** — 結晶化で使う2種類の溶液条件。このアプリでは別々の `ConditionTemplate` として管理し、`Plate` がそれぞれを参照する
- **ConditionSet** — リザーバーとスクリーニングのテンプレートを1組にまとめたもの。プレート作成時に2つを個別に選ぶ手間を省く
- **isDefault** — 共有カタログであることを示すフラグ。`true` なら全ユーザーが読める。ユーザーは `isDefault = true` のデータを作れない
- **RLS（Row Level Security）** — PostgreSQL の行単位アクセス制御。このアプリでは設定されているが Prisma 経由では効いていない（→4章）
- **Deployment Protection** — Vercel のデプロイ保護機能。有効だと Vercel アカウントでのログインなしにデプロイ URL を開けない。現在は解除済み（→7章）
- **Pooler** — Supabase の接続プーラー。Vercel は IPv4 で接続するため、IPv6 のみの直接接続ではなく Pooler の利用が必須。Transaction pooler が6543番、Session pooler が5432番
- **baseline** — 既存のDBに対して Prisma のマイグレーション履歴を後付けで記録すること。`prisma migrate resolve --applied <name>` か、`_prisma_migrations` への直接 INSERT で行う
