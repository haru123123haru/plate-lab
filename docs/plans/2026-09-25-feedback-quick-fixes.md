# 使ってみて気になった点（A）実装計画

作成: 2026-09-25 / ブランチ: `feature/feedback-quick-fixes`

## 目的

`docs/plans/2026-09-25-feedback-backlog.md` の「A. やることがはっきりしていて小さいもの」の3つを片付ける。

1. 新規ユーザーが 96 Well の種別を選べない
2. 画面を移るとき、前の画面のまま一瞬止まって見える
3. アプリを使う前からあるプレートを登録すると、登録した日が作成日になってしまう

## 決まっていること

- 読み込み中の表示は `app/(app)/loading.tsx` の1つだけにし、グレーの箱を並べたスケルトンにする。画面ごとに作り分けるのは、使ってみて気になったとき
- ボタンの処理中表示は、まず付けない。loading.tsx を置いても止まって見える所が残ったら、そこだけ足す
- 「実験を仕込んだ日」（以下、仕込み日）を `Plate` の新しい列にする。作成時に選べて（初期値は今日）、詳細画面の編集モードからも直せる
- 一覧の並び順は今のまま（最終更新が新しい順）
- `createdAt` は記録を作った時刻として残し、画面には出さない

やらないこと: 画面ごとのスケルトン、仕込み日での並べ替え、ボタンごとの処理中表示。

## 設計

### 96 Well はマイグレーションで共有種別として入れる

`20260925010000_add_multi_drop_plate_types` と同じ書き方にする。値は `prisma/seed.ts` の `96 Well - Sitting`（8×12・SITTING・1ドロップ、説明 `Standard 96-well sitting drop plate`）に合わせる。同じ名前の共有種別（`isDefault` が true）がすでにあれば入れない。ローカルは seed で入っているので、ローカルでは何も起きないのが正しい動きになる。

新しい種別を足すだけなので、アプリのコードは変えない。ただし 96 Well は本番で初めて使われる形なので、402px 幅で表示が崩れないかは確かめる（完了条件）。

（実装時に確認）計画時は「条件テンプレートは24ウェル分しか無いはず」と書いていたが、外れていた。本番の PEG・MPD は `conditions/*.md` から96ウェル分入っているので、96 Well では全ウェルに条件が出る。

### 読み込み中の表示は `(app)` に1つ置く

`loading.tsx` は、同じ階層の layout の中身を Suspense で包む。`app/(app)/loading.tsx` が包むのは `(app)` の直下のセグメント（ホーム・`plates`・`samples`・`mypage`・`trash`・`settings`）なので、直下が入れ替わる遷移ならデータがそろうまでこの表示が出る。

入れ子の遷移では出ない。`/mypage` → `/mypage/edit` は `mypage` のセグメントが共通なので、`(app)` の境界は作り直されず、前の画面のまま止まる。ここも気になるなら `app/(app)/mypage/edit/loading.tsx` を足す。

見た目は、ヘッダーの高さの箱と、一覧の行に似た箱を数本、`animate-pulse` で点滅させる。色は `bg-border-default` などのデザイントークンを使う。

ハマりどころが2つある。

- ヘッダーは各ページが自分で描いている（`app/(app)/layout.tsx` は `<main>` だけ）。そのため読み込み中は、ヘッダーも含めて画面全体がスケルトンに置き換わる。これを嫌うならヘッダーを layout に移すことになるが、今回はやらない
- 画面の移動には2種類ある。メニュー（`components/menu-sheet.tsx`）は `<Link>` で、本番では loading 境界までが先読みされるので、押せばすぐスケルトンが出る。一覧の行やボタン（`dashboard-client.tsx`・`samples-client.tsx`・`mypage-client.tsx`・`trash-client.tsx`）は `router.push` で先読みが無く、押してからスケルトンが出るまでにサーバーとの往復が1回ある。データがそろうのを待つよりは早いはずだが、止まって見えるなら `router.prefetch` を足す。どちらになったかは実測して計画書に書き残す
- dev サーバーでは先読みが効かず、ページもその場でコンパイルされるので、見え方が本番と違う。読み込み中の表示は `npm run build && npm run start` か本番で確かめる

### 仕込み日は日付だけの列にする

```prisma
// 実験を仕込んだ日。登録した日とは限らないので利用者が選ぶ
setupDate DateTime @db.Date
```

観察日（`Observation.observedAt`）と同じ扱いにする。

- サーバーへは `"YYYY-MM-DD"` の文字列で送り、`z.iso.date()` で受ける。`Date` で送ると日本時間の0〜9時が UTC で前日になるため
- DB へは `new Date(\`${setupDate}T00:00:00Z\`)` で入れ、読むときは `toISOString().slice(0, 10)` で UTC の日付として取り出す
- `updatePlate` は `parsed.data` をそのまま `prisma.plate.update` に渡している（`lib/actions/plates.ts`）。文字列のままだと Prisma が `DateTime` 列で受け付けないので、`setupDate` だけ取り出して `Date` に直してから渡す
- フォームの初期値は、`components/well-sheet.tsx` にある `today()`（端末の今日を `sv-SE` 形式で返す）を使う。作成フォームでも使うので `lib/utils.ts` に移す

既存のプレートには、`createdAt` を**日本時間に直した日付**を入れる。`createdAt` は UTC で入っているので、そのまま `::date` にすると日本時間の0〜9時に作ったプレートが前日になる。マイグレーションは次の3段にする。

```sql
ALTER TABLE "Plate" ADD COLUMN "setupDate" DATE;
UPDATE "Plate" SET "setupDate" = ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')::date;
ALTER TABLE "Plate" ALTER COLUMN "setupDate" SET NOT NULL;
```

DB の既定値は付けない。作成時は必ずサーバーが値を渡すので、既定値があると渡し忘れに気づけなくなる。

画面に出すのは次の2か所で、どちらも今は `createdAt` を出している所を置き換える。

- 詳細画面の「作成日」の行 → 「仕込み日」。ラベルは `lib/i18n.ts` の `created` を `setupDate`（ja: 仕込み日 / en: Set up）に替える
- サンプル画面のカード（`components/plate-card.tsx`）。一覧と検索結果の両方

今の日付の表示には、ずれが3つある。

- 詳細画面とサンプル画面の一覧は `createdAt.toISOString()` の日付を出しているので、日本時間の0〜9時に作ったプレートは前日に見えていた。仕込み日に置き換えれば直る
- 検索結果だけは `toLocaleDateString()` で組み立てていて、一覧と形が違う。ブラウザの言語によっては、カード側で読み直したときに `Invalid Date` になる（de なら `25.9.2026`）
- `PlateCard` は受け取った文字列を `new Date()` で読み直している。`new Date("2026-09-25")` は UTC の0時になるので、UTC より西の端末では前日に見える

そこで、サーバーからは一覧も検索結果も `"YYYY-MM-DD"` で渡し、`PlateCard` では `Date` を作らずに `replaceAll("-", "/")` で今の見た目（`2026/09/25`）に合わせて出す。

## Phase 1: 96 Well と読み込み中の表示

### タスク

- [x] `prisma/migrations/20260926000000_add_96_well_plate_type/migration.sql` — 96 Well - Sitting を共有種別として入れる（同名の共有種別があれば入れない）
- [x] `app/(app)/loading.tsx` — グレーの箱のスケルトンを作る
- [x] `app/(app)/mypage/edit/loading.tsx` — 同じスケルトンを再エクスポートする（実測を見て足した）
- [x] `docs/architecture.md` — 本番の共有種別が3つになったことと、loading.tsx の置き場所を書く

### 完了条件

- `npm run check` が通る
- ローカルで `npx prisma migrate dev` を流しても、96 Well が2つにならない（seed の分があるので何も入らない）
- ブラウザ（402px 幅）で確かめる
  - 96 Well のプレートを作れて、作成画面のウェル選択と詳細のグリッドが横にはみ出さない
  - `npm run build && npm run start` で、ホーム → 詳細、ホーム → サンプル、マイページ → ゴミ箱、メニューからの移動で、押したあとにスケルトンが出る。DevTools の通信制限（Slow 4G）をかけて見る。`/mypage` → `/mypage/edit` で止まって見えるかも見ておく
- 本番に出したあと、新しく作ったユーザーの作成画面に 96 Well が出る

### 実測（2026-09-25、ローカルの本番ビルド、Slow 4G 相当）

- ローカル DB に流すと 96 Well は1つのまま（seed の分があり、マイグレーションは何も入れない）
- 96 Well は作成画面のウェル選択も詳細のグリッドも 402px に収まる。1ウェルは直径約22px で、押しやすさは実機で見る
- 押してからスケルトンが出るまで: メニューの `<Link>` で約0.1〜0.4秒、`router.push`（ホーム → 詳細、マイページ → ゴミ箱）で約0.9秒。`router.prefetch` は足さない
- `/mypage` → `/mypage/edit` は、予想どおりスケルトンが出ず約3秒止まった。1行の `mypage/edit/loading.tsx` を足して出るようにした

計画とずれた点:

- `components/tab-bar.tsx` はどこからも使われていなかった。画面の行き来は各ページのヘッダーから開くメニューで行う
- `npx prisma migrate deploy` は、接続先がローカルでもコマンド名から本番へのデプロイと判定され、Claude からは流せなかった。ユーザーが `!` で流した。`npm run build` も中で同じコマンドを呼ぶので、確認は `npx next build` で行った
- `npx prisma migrate dev` は、ローカル Postgres の `template1` で照合順序のバージョン不一致（`collation version mismatch`）が出てシャドウ DB を作れない。Phase 2 の「`migrate dev --create-only` でずれを確かめる」は、これを直さないと使えない

## Phase 2: 仕込み日

### タスク

- [ ] `prisma/schema.prisma` — `Plate.setupDate` を足す
- [ ] `prisma/migrations/20260926010000_add_plate_setup_date/migration.sql` — 列を足し、既存のプレートに日本時間の作成日を入れてから NOT NULL にする
- [ ] `lib/validations.ts` — `createPlateSchema` に `setupDate: z.iso.date()`（必須）、`updatePlateSchema` に任意で足す
- [ ] `lib/actions/plates.ts` — `createPlate` と `updatePlate` で `setupDate` を受け、`Date` に直して保存する
- [ ] `lib/utils.ts` — `today()` を `components/well-sheet.tsx` から移す
- [ ] `components/new-plate-sheet.tsx` — プレート名の下に `<input type="date">` の仕込み日を足す（初期値は今日）
- [ ] `app/(app)/plates/[id]/page.tsx`・`plate-detail-client.tsx` — 表示を仕込み日に替え、編集モードに日付の欄を足す
- [ ] `app/(app)/samples/page.tsx`・`samples-client.tsx` — 一覧も検索結果も仕込み日を `"YYYY-MM-DD"` で渡す
- [ ] `components/plate-card.tsx` — `new Date()` で読み直すのをやめ、受け取った文字列を `/` 区切りで出す
- [ ] `lib/i18n.ts` — `created` を `setupDate` に替える
- [ ] `types/index.ts` — `Plate.createdAt` を `setupDate` に替える（どこからも import されていないが、実態に合わせておく）
- [ ] `prisma/seed.ts` — プレートを作る所に、`createdAt` と同じ値で `setupDate` を足す
- [ ] `tests/drop-actions.test.ts` — `createPlate` の呼び出し全部に `setupDate` を足す。`plate.create` に `2026-09-25T00:00:00.000Z` の `Date` が渡ることを確かめるテストを1本足す（観察日のテストと同じ形）
- [ ] `tests/validation-access-control.test.ts` — 既存の fixture に `setupDate` を足す。`createPlateSchema` が仕込み日の無い入力と、日付でない文字列を拒むことを確かめる
- [ ] `docs/architecture.md` — `Plate` の列の説明に仕込み日を足す

### 完了条件

- `npm run check` が通る
- 手で書いたマイグレーションとスキーマがずれていない。ローカルでマイグレーションを流したあと `npx prisma migrate dev --create-only` を実行し、新しいマイグレーションが作られないことで確かめる（`migrate diff --from-migrations` は `prisma.config.ts` に無いシャドウ DB の指定が要るので使わない）
- ローカルで、日本時間の0〜9時に作ったプレートを1つ用意してからマイグレーションを流し、仕込み日が前日になっていない
- ブラウザ（402px 幅）で確かめる
  - 作成フォームの仕込み日の初期値が今日で、過去の日付を選んで作れる
  - 詳細画面に仕込み日が出て、編集モードで直せる
  - サンプル画面の一覧と検索結果で、カードの日付が同じ形で出る
