# サンプルのアイコンと色 実装計画

作成: 2026-10-05 / ブランチ: `feature/sample-styles`

## 目的

サンプル画面のプレートカードで、サンプル名をアイコンと色のチップにする。どのプレートに何のサンプルが入っているかを、文字を読まなくても見分けられるようにする。

`docs/plans/2026-09-25-feedback-backlog.md` の C「サンプルのアイコンと色」で、2026-10-05 の壁打ちで方針まで決めたもの。

## 決まっていること

- サンプルは (ユーザー, サンプル名) のテーブル `Sample` で持つ。ドロップは今のまま `Drop.sampleName` の文字列で結ぶ
- アイコンと色は決まった候補から選ぶ。設定していないサンプルは、今と同じフラスコ・グレー
- 設定に管理ページ `/settings/samples` を足し、そこでアイコン・色・名前を変える
- 名前を変えると、そのサンプルのドロップもまとめて書き換える
- 変更先の名前のサンプルがすでにあれば、確認のうえ**まとめる**（2026-10-05 に決定）。ドロップは変更先の名前に寄せ、アイコンと色は変更先のものを残す。打ち間違い（`Lysozym` → `Lysozyme`）を直す使い方を想定している
- ウェルマップの塗りには、今回は使わない（2026-10-05 に決定）。使ってみてから別の PR で足す

やらないこと: ウェルマップ・ウェルのシートでの色、ダッシュボードのカードへのチップ、サンプルの削除、サンプル名での絞り込み、自由な色（カラーピッカー）。

## 設計

### `Sample` は「見た目を変えたサンプル」だけが持つ

```prisma
// サンプルの見た目。ドロップとは名前（Drop.sampleName）で結ぶ。
// 見た目を変えたサンプルだけ行がある。行が無ければフラスコ・グレー
model Sample {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id])
  name   String
  icon   String
  color  String

  @@unique([userId, name])
}
```

ドロップを作るたびに行を作る形にはしない。ドロップの作成・削除の Action すべてで行の増減を合わせる必要が出て、漏れると一覧とずれるからだ。サンプルの一覧はこれまでどおりドロップの名前から組み立て、`Sample` の行は見た目を重ねるためだけに使う。

- 見た目を変えたときに、行を upsert する
- ドロップが無くなっても行は消さない。同じ名前でまた使えば、同じ見た目で出る
- `icon`・`color` は Prisma の enum にせず文字列で持ち、zod で候補に縛る。候補を足すときにマイグレーションが要らない。画面は知らない値をフラスコ・グレーとして出す
- 名前の一致は今の `summarizeSamples` と同じく完全一致（大文字小文字も区別）

新しいテーブルなので、`anon`・`authenticated` の権限は `revoke_data_api_access` の `ALTER DEFAULT PRIVILEGES` で付かない。本番に出したあと、権限が無いことを確かめる（`docs/architecture.md` の4章）。

### 候補

アイコンは lucide の8つ、色は8つにする。先頭が既定値。

- アイコン: `flask`（FlaskConical）・`test-tube`（TestTube）・`dna`（Dna）・`atom`（Atom）・`microscope`（Microscope）・`droplet`（Droplet）・`gem`（Gem）・`leaf`（Leaf）
- 色: `gray`・`red`・`orange`・`yellow`・`green`・`teal`・`blue`・`purple`

色は `app/globals.css` に `--sample-<色>` としてライトとダークの両方で足す。チップは「薄い背景＋濃い文字とアイコン」にするので、1色につき背景用と文字用の2つを持つ。ダークで文字が読めるか（コントラスト 4.5:1 以上）を確かめる。候補の対応表は `lib/samples.ts` に置き、画面とバリデーションの両方がそこを読む。

### サンプルの一覧と、名前の変更は `lib/actions/samples.ts`

- `getSamples()` — 自分のゴミ箱に入っていないプレートのドロップから、名前ごとのドロップ数を `groupBy` で数え、`Sample` の見た目を重ねて名前順で返す
- `getSampleStyles()` — 自分の `Sample` の行を名前→見た目の形で返す。サンプル画面のカードが使う
- `updateSample({ name, newName, icon, color, merge })` — 見た目と名前をまとめて変える。1つのトランザクションで次を行う
  1. `newName` が `name` と違い、`newName` のドロップか `Sample` の行がすでにあって `merge` が無ければ、何も変えず `{ needsMerge: true }` を返す（画面が確認ダイアログを出し、`merge: true` で送り直す）
  2. 自分のプレート（**ゴミ箱も含む**）の `sampleName = name` のドロップを `newName` に書き換える。ゴミ箱は書き込めない決まりだが（`editableDropWhere`）、ここで外すと、復元したプレートだけ古い名前の別のサンプルになるので含める
  3. 見た目は、まとめるときは変更先の行を残して元の行を消す。まとめないときは元の行を `newName` に付け替えて見た目を書き込む（無ければ作る）

名前は `dropFieldsSchema.shape.sampleName`（trim・1〜200文字）と同じ規則で受ける。

### 管理ページ `/settings/samples`

`/settings/plate-types` と同じ作りにする。設定の「データ」に「サンプル」の行を足す。

- 1行に、チップ（アイコンと色）・名前・ドロップ数を出す。行を押すと編集のダイアログが開く
- ダイアログには、名前の欄と、アイコン8つ・色8つのボタンを置き、保存で `updateSample` を呼ぶ
- `{ needsMerge: true }` が返ったら、確認ダイアログ（`ConfirmDialog`）で「`Lysozyme` にまとめます。ドロップ◯件の名前が変わります」と出す
- サンプルが1つも無いときは「まだサンプルがありません」と出す

### サンプル画面のカード

`components/plate-card.tsx` の `FlaskConical` と `names.join(", ")` の1行を、サンプルごとのチップの並びにする（折り返す）。ドロップ数はチップの後ろに今の書き方で出す。見た目は `app/(app)/samples/page.tsx` で `getSampleStyles()` を1回引き、カードに渡す。検索し直したときも同じ対応表を使う。

## Phase 1: テーブルと管理ページ

### タスク

- [x] `prisma/schema.prisma` — `Sample` と `User.samples` を足す
- [x] `prisma/migrations/20261005010000_add_sample/migration.sql` — テーブルと一意制約
- [x] `lib/samples.ts` — アイコンと色の候補、既定値、知らない値を既定値にする関数
- [x] `lib/validations.ts` — `updateSampleSchema`
- [x] `lib/actions/samples.ts` — `getSamples`・`getSampleStyles`・`updateSample`
- [x] `app/globals.css` — サンプルの色8つ（背景と文字）をライトとダークで足す
- [x] `components/sample-chip.tsx` — アイコンと色のチップ
- [x] `app/(app)/settings/samples/page.tsx`・`samples-client.tsx` — 管理ページと編集・まとめる確認のダイアログ
- [x] `app/(app)/settings/settings-client.tsx` — 「サンプル」の行
- [x] `lib/i18n.ts` — ページ名・候補の名前・まとめる確認・空の表示（日英）
- [x] `tests/sample-actions.test.ts` — まとめる確認を返すこと、ドロップの書き換えがゴミ箱も含めて自分のプレートだけに効くこと、まとめるときに変更先の見た目が残ること、見た目だけの変更は upsert になること
- [x] `tests/validation-access-control.test.ts` — 候補に無いアイコン・色と空の名前を拒むこと
- [x] `docs/architecture.md` — `Sample` の説明とマイグレーションの本数

### 完了条件

- `npm run check` が通る
- ローカルでマイグレーションを流したあと `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` で差分が無い
- ブラウザ（402px 幅、ライトとダーク）で確かめる
  - 管理ページにドロップのサンプルが並び、アイコンと色を変えられる
  - 名前を変えると、プレート詳細のドロップの名前も変わる
  - 既にある名前に変えると確認が出て、まとめたあとは1行になり、変更先の見た目が残る

### 実測（2026-10-05、ローカルの dev サーバー、Playwright の Chromium、402px 幅）

- `migrate diff --from-config-datasource` の差分は無し
- `tester@example.com` の管理ページに Lysozyme（99）と Thaumatin（72）が並ぶ。Catalase と Insulin はゴミ箱のプレートにしか無いので出ない
- Lysozyme を DNA・青にして保存すると、一覧のチップに反映される。ライトとダークの両方で、8色ともチップの文字が読める（コントラストはライトで 4.62〜6.43、ダークで 7.32〜8.51）
- Thaumatin を Thaumatinn（赤）に変えると、72件のドロップの名前も変わる。続けて Lysozyme に変えると「ドロップ72件の名前が変わる」確認が出て、まとめたあとは Lysozyme（171、DNA・青）の1行だけになり、Thaumatinn の行は消えた。確かめたあと、ドロップの名前は SQL で Thaumatin に戻した

計画とずれた点:

- 色を `style` の `var(--sample-…)` で当てたら、色が出なかった。Tailwind v4 は、どのクラスからも使われていない CSS 変数を出力から落とす。`@theme` に `--color-sample-<色>-bg/-fg` を登録し、`bg-sample-red-bg` のようなクラス名を `components/sample-chip.tsx` に書き切る形にした（目印の色と同じ作り）
- `User` との関係は、ほかのモデルと同じく `onDelete` を付けない形にした
- 動いていた dev サーバーは、Prisma クライアントを作り直す前に起動していたので、`globalThis` に残った古いクライアント（`sample` が無い）でエラーになった。スキーマを変えたら dev サーバーを立て直す

## Phase 2: サンプル画面のカード

### タスク

- [ ] `components/plate-card.tsx` — サンプル名をチップの並びにする
- [ ] `app/(app)/samples/page.tsx`・`samples-client.tsx` — 見た目の対応表を引いてカードに渡す
- [ ] `tests/drop-actions.test.ts` — 必要なら `summarizeSamples` の形の変更に合わせる

### 完了条件

- `npm run check` が通る
- ブラウザ（402px 幅、ライトとダーク）で、サンプル画面のカードにチップが出る。見た目を変えていないサンプルはフラスコ・グレー。サンプルが多いカードは折り返す
- 検索したあとのカードにも同じチップが出る
- 本番に出したあと、`Sample` に `anon`・`authenticated` の権限が無いことを SQL Editor で確かめる

## リスク

- 名前の変更は他のプレートのドロップにも効き、まとめたあとは元に戻せない。確認ダイアログで件数を出して防ぐ
- ゴミ箱のドロップを書き換えるのは、ここだけの例外になる。Action のコメントとテストで残す
- マイグレーションはテーブルを足すだけなので、戻すときはテーブルを消せばよい
