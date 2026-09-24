# ドロップ単位の記録と新しいプレート種別 実装計画

作成: 2026-09-24 / ブランチ: `feature/plate-drops`

## 目的

研究室で使うプレートを2種類追加したい。どちらも1ウェルに複数のドロップを置き、ドロップごとに別のサンプルを入れる。

- **24穴シッティング（4×6）** — 各ウェルに細長い溝（リザーバー。PEG や MPD などの高濃度溶液を入れる）と、その上に小さい溝が4つある。小さい溝1つに1ドロップで、最大4ドロップ
- **15穴ハンギング（3×5）** — ウェルが大きく、1ウェルに最大3ドロップを置く

今のアプリには「ドロップ」という単位が無い。記録はウェルかプレートに1つしか持てず、しかもウェルの記録を入力する画面も無い（`updateWell` はどこからも呼ばれていない）。そこで、ドロップを記録の単位として新しく作り、観察の履歴も持てるようにする。

## 決まっていること

- ドロップごとに記録するのは、サンプル名と濃度（必須）、メモ（任意）
- 観察は履歴で残す。1件は「観察日＋メモ」で、メモは必須。結晶・沈殿のような結果の選択肢は作らない（観察結果はそこまではっきり分かれるものではないため）
- 写真は扱わない
- 記録の流れは「仕込むときにサンプルを入れ、あとから観察を書き足す」
- 既存のプレート種別3つはすべて残す。どれも1ウェル1ドロップとして扱う
- `Plate.sampleName` と、`Well` の記録欄（status・protein・concentration・buffer・ph・precipitant・notes）は、ドロップに役割が移るので削除する。削除はコードを切り替え、本番で動作を確かめてから行う
- 新しい2種類の名前は「24 Well - Sitting 4 Drop」と「15 Well - Hanging 3 Drop」とする

やらないこと: 写真、観察結果の分類、ウェル単位の URL、作成時に複数のサンプルを一度に登録すること（作成時は1種類。別のサンプルはあとから足す）。

## 設計

### プレートの形は PlateType に持たせる

今は、穴数（`wellCount`）から形を推測している。24なら4×6、96なら8×12という決め打ちで、判定が `lib/actions/plates.ts:106`、`components/new-plate-sheet.tsx:147`、`app/(app)/plates/[id]/plate-detail-client.tsx:254` の3か所に散らばっている。種別作成の入力チェックも24と96しか通さない（`lib/validations.ts:41`、ダイアログ側は `components/new-plate-type-dialog.tsx:44-47, 97-109`）。3×5 の15穴はどこにも当てはまらず、作成が失敗する。

そこで `PlateType` に次の欄を足し、形の判定はすべてこれを読むようにする。

| 欄         | 型                           | 意味                                                                              |
| ---------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `rows`     | Int                          | 行数（1〜8。行ラベル A〜H に合わせる）                                            |
| `cols`     | Int                          | 列数（1〜12）                                                                     |
| `maxDrops` | Int（初期値 1）              | 1ウェルの最大ドロップ数                                                           |
| `layout`   | `PlateLayout`（新しい enum） | 描き方。`SITTING`（溝＋ドロップの置き場所）か `HANGING`（大きい丸の中にドロップ） |

描き方が決まっているのは、次の3通りの組み合わせだけだ。種別作成ではこれ以外を作らせない（zod の `refine` で縛る）。

- 1ドロップ（SITTING・HANGING のどちらでもよい）
- SITTING・4ドロップ
- HANGING・3ドロップ

`wellCount` は `rows × cols` と同じ値になるので、Phase 4 で削除する。それまでは両方を書く。

| 種別                             | rows×cols | maxDrops | layout  |
| -------------------------------- | --------- | -------- | ------- |
| 96 Well - Sitting（既存）        | 8×12      | 1        | SITTING |
| 24 Well - Hanging（既存）        | 4×6       | 1        | HANGING |
| Sitting Manual（既存）           | 8×12      | 1        | SITTING |
| 24 Well - Sitting 4 Drop（新規） | 4×6       | 4        | SITTING |
| 15 Well - Hanging 3 Drop（新規） | 3×5       | 3        | HANGING |

既存の行は、マイグレーションで `wellCount` から埋める（24 → 4×6、96 → 8×12）。`layout` は名前に "hanging" を含むもの（`ILIKE '%hanging%'`）を `HANGING`、それ以外を `SITTING` とする。

本番の条件テンプレートとセットは手作業で作られていた（architecture.md 7章）。PlateType も同じく手作業で作られ、名前や `wellCount` が seed と違う可能性がある（推測）。`wellCount` が24と96以外の行があると、値が埋まらずに NOT NULL の付与で失敗する。そこで、**本番に出す前に** SQL Editor で `select id, name, "wellCount", "isDefault" from "PlateType"` を実行し、値を確かめる。

### Drop と Observation を新設する

```prisma
model Drop {
  id            String        @id @default(uuid())
  wellId        String
  well          Well          @relation(fields: [wellId], references: [id], onDelete: Cascade)
  slot          Int           // 1〜PlateType.maxDrops。作成後は変えない
  sampleName    String
  concentration String
  notes         String?       @db.Text
  observations  Observation[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@unique([wellId, slot])
}

model Observation {
  id         String   @id @default(uuid())
  dropId     String
  drop       Drop     @relation(fields: [dropId], references: [id], onDelete: Cascade)
  observedAt DateTime @db.Date
  notes      String   @db.Text
  createdAt  DateTime @default(now())

  @@index([dropId, observedAt])
}
```

`@@unique([wellId, slot])` があるので、同じ置き場所に2つのドロップは入らない。`slot` が `maxDrops` を超えないことは DB では表現できないので、Action 側で確かめる。置き場所の変更は受け付けない（`updateDrop` は `slot` を持たない）。変えたいときは消して作り直す。

`sampleName` に索引は張らない。検索は部分一致（`ILIKE '%q%'`）なので、通常の索引は効かない。

`observedAt` は日付だけを持つ。クライアントからは `"YYYY-MM-DD"` の文字列で受け取り、サーバーで ``new Date(`${s}T00:00:00Z`)`` に変換する。`Date` をそのまま送ると、日本時間の0〜9時は UTC で前日になり、1日ずれるためだ。表示するときも UTC の日付として扱う。

ウェルに残るのは位置（`position`・`row`・`col`）だけになる。そのウェルのリザーバー条件とスクリーニング条件は、今までどおりプレートのテンプレートから位置で引く。「使用中のウェル」は「ドロップが1つ以上あるウェル」と定義する。今は `status !== "EMPTY"` で数えていて、その計算が4か所に散らばっている（`app/(app)/page.tsx:26`、`dashboard-client.tsx:72`、`samples/page.tsx:25`、`samples-client.tsx:64`）。これを `lib/` 配下の純粋関数1つにまとめる。dashboard と samples の client 側でも使うので、`"use server"` のファイルには置かない。

### 認可

ドロップと観察は、ウェル → プレートとたどって、プレートの持ち主だけが読み書きできる。ゴミ箱にあるプレートのドロップと観察は、読めるが編集できない（ゴミ箱の計画で決めた「閲覧のみ」に合わせる）。

条件は `lib/access-control.ts` にヘルパーとして置き、クエリに直書きしない。ゴミ箱の条件を集約したのと同じ理由で、書き忘れを防ぐためだ。

```ts
// 編集できるウェル（ドロップを作る前の確認に使う）
editableWellWhere(userId) → { plate: activePlateWhere(userId) }
// 編集できるドロップ
editableDropWhere(userId) → { well: editableWellWhere(userId) }
```

各 Action の形は次のとおり。

- **`createDrop(wellId, slot, …)`** — `prisma.well.update({ where: { id: wellId, ...editableWellWhere(userId) }, data: { drops: { create } } })` の形で作る。確認と作成を1回のクエリで行うので、あいだにプレートがゴミ箱へ移される競合が起きない（`updatePlate` が `deletedAt: null` を update の条件に入れているのと同じ考え方。`lib/actions/plates.ts:215-217`）。先に同じ条件で `maxDrops` を引いて `slot` の上限を確かめる。一意制約の違反（P2002）は「その置き場所は使用中」として返す
- **`updateDrop` / `deleteDrop`** — `where` に `editableDropWhere(userId)` を入れる
- **`bulkCreateDrops(plateId, positions, slots, sampleName, concentration)`** — ウェル ID の配列ではなく、プレート ID と位置で受ける。プレートの持ち主の確認が1回で済み、他人のウェル ID が混ざる余地が無くなる。作成は `createMany({ skipDuplicates: true })` で行い、スキップした件数は「要求した件数 − `count`」で出す
- **`addObservation(dropId, …)` / `deleteObservation(id)`** — `addObservation` はドロップを `editableDropWhere` で確かめ、`deleteObservation` は `where: { id, drop: editableDropWhere(userId) }` で消す

### 画面

**グリッド**: `components/well-grid.tsx` と `components/well-grid-24.tsx` はほぼ同じコードの複製なので、`rows`・`cols`・`layout`・`maxDrops` を受け取る1つの部品にまとめる。描き方は次のとおり。

- SITTING・4ドロップ: 上に2つ、下に2つを少しずらして丸を描き、その下に細長い溝を描く
- HANGING・3ドロップ: 大きい丸の中央に小さい丸を3つ並べる
- 1ドロップ: 今と同じ見た目
- ドロップが入っている置き場所の丸は塗りつぶす

**ウェルのシート**: 詳細画面でウェルを押すと、下からシートが出る。今の `components/well-detail-modal.tsx` はすでに下から出るシート（`Sheet side="bottom"`）で作られているので、これを広げる（ファイル名は `well-sheet.tsx` に変える）。

- 上部: リザーバー条件とスクリーニング条件
- 中央: 置き場所の図を大きく描く。押した置き場所のドロップを編集する。空なら追加、入っていれば編集か削除
- 下部: 選んだドロップの観察履歴（新しい順）と「観察を追加」

URL は付けない。QR コードの飛び先はプレート単位なので、ウェル単位の URL は要らない。

**まとめて入れる**: 同じサンプルを多くのウェルに入れる操作を、1ドロップずつの入力にしない。ウェルを複数選び、置き場所の番号を選び、サンプル名と濃度を入れて適用する。ウェルの複数選択には、すでに `rows`・`cols` を受け取れる `components/well-grid-selector.tsx` を使う。作成画面の「使うウェルを選ぶ」ステップをこれに置き換え、詳細画面の編集モードにも同じ部品で「まとめて追加」を置く。すでにドロップがある置き場所は上書きせず、スキップした件数を表示する。

**サンプル検索**: 検索対象を `Plate.sampleName` からドロップのサンプル名に切り替える。結果はプレート単位の一覧のままで、含まれるサンプル名とドロップ数を添える。

**種別作成ダイアログ**（`components/new-plate-type-dialog.tsx`）: 穴数の選択を、行数・列数・描き方（上の3通り）の入力に置き換える。

### 既存データの移し替え

使用中（`status != 'EMPTY'`）のウェルすべてについて、1番の置き場所にドロップを作る。サンプル名が無いウェルも対象にする。対象を「サンプル名のあるプレート」に絞ると、サンプル名が空のまま使用中になっているウェルは、使用中という状態そのものが消えてしまうためだ。

- サンプル名: `COALESCE(p."sampleName", w."protein", '-')`
- 濃度: `COALESCE(w."concentration", '-')`（seed のウェルには濃度が入っている。`prisma/seed.ts:69`）
- `id` は `gen_random_uuid()::text`、`"updatedAt"` は `now()` を明示する。Prisma の `@default(uuid())` と `@updatedAt` は DB の列に DEFAULT を付けないので、SQL で入れるときは自分で渡す必要がある
- `ON CONFLICT ("wellId", "slot") DO NOTHING` を付ける。Phase 2 のシートでドロップをすでに足していると、一意制約とぶつかって `migrate deploy` ごと止まり、Vercel のビルドが失敗するためだ

### マイグレーションの書き方

`prisma migrate dev` が生成する SQL は、NOT NULL の列を1回で追加しようとし、既存の行があると失敗する。形の欄は手で次の順に書き換える。

1. NULL を許して列を追加する
2. `UPDATE` で既存の行を埋める
3. `SET NOT NULL` を付ける

新しい2種類の投入も、`id` に `gen_random_uuid()::text` を渡す。同じ名前の共有種別が無いときだけ入れる。

### 出し方

Phase は作業の区切りで、本番に出す単位は別に決める。

| 本番に出す単位 | 中身         | 理由                                                                                                                                                                                                           |
| -------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1回目          | Phase 1      | 画面は変わらない。単独で出せる                                                                                                                                                                                 |
| 2回目          | Phase 2 と 3 | グリッドを「ドロップで塗る」形に変えるのは Phase 2、作成時にドロップを作るのは Phase 3。片方だけ出すと、その間に作ったプレートが「詳細では空、一覧では使用中」と食い違う。そのため、Phase 2 の後は push しない |
| 3回目          | Phase 4      | 列の削除。戻せない変更なので最後に単独で出す                                                                                                                                                                   |

---

## Phase 1: データとサーバー側（単独で出す）

### ゴール

新しい欄とテーブルが DB にでき、ドロップと観察を読み書きする Action が認可つきで動く。形の判定はすべて `rows`・`cols` を読む。画面の見た目は変えない（新しい2種類もまだ入れない）。

### タスク

- [ ] `prisma/schema.prisma` — `PlateType` に `rows`・`cols`・`maxDrops`・`layout`、enum `PlateLayout`、`Drop`、`Observation` を追加する
- [ ] マイグレーション（足すだけ）— 上の「マイグレーションの書き方」の順で書く。新しい2種類はまだ入れない
- [ ] `prisma/seed.ts` — 既存3種類に新しい欄を入れる
- [ ] `types/index.ts` の `PlateType` と、`app/(app)/page.tsx:30-35`・`samples/page.tsx:30-35` の変換に新しい欄を足す
- [ ] 形の判定3か所を `rows`・`cols` に置き換える（`lib/actions/plates.ts:106`、`components/new-plate-sheet.tsx:147-156`、`plate-detail-client.tsx:254`）。詳細画面は、グリッドがまとまる Phase 2 までは「4×6 なら 24 用、それ以外は 96 用」で分ける
- [ ] `lib/validations.ts` と `lib/actions/plate-types.ts` — 種別作成を `rows`・`cols`・`maxDrops`・`layout` で受け取る。この Phase では既存の組み合わせ（4×6 と 8×12、1ドロップ）だけを通す
- [ ] `components/new-plate-type-dialog.tsx` — 送る値を新しい欄に合わせる。選択肢は今と同じ（24穴と96穴）。スキーマが変わると typecheck が通らなくなるので、この Phase で直す
- [ ] `tests/validation-access-control.test.ts:23-31` — 種別作成のテストを新しい欄に合わせる
- [ ] `lib/access-control.ts` — `editableWellWhere`・`editableDropWhere` を追加する
- [ ] `lib/validations.ts` — ドロップ・観察・まとめて追加のスキーマ。観察日は `"YYYY-MM-DD"` の文字列で受ける
- [ ] `lib/actions/drops.ts`（新規）— `createDrop`・`updateDrop`・`deleteDrop`・`bulkCreateDrops`・`addObservation`・`deleteObservation`（形は「認可」の節のとおり）
- [ ] `lib/actions/plates.ts` の `getPlateById` — ドロップと観察を含めて返す
- [ ] `tests/drop-actions.test.ts`（新規）— prisma をモックし、次を確かめる
  - 6つの Action すべてが、持ち主とゴミ箱の条件を `where` に入れている（`deleteObservation` を含む）
  - `slot` が `maxDrops` を超えると拒否される
  - `bulkCreateDrops` がプレートの持ち主を確かめ、スキップ件数を正しく返す
  - 観察日の文字列が UTC の0時として保存される

### 完了条件

```bash
npx prisma migrate deploy   # ローカルに適用できる
npm run check               # 全部通る
```

- ローカルの Studio で、既存の3種類に形の値が入っていること
- 既存の24穴・96穴のプレートの作成と表示が、今までどおり動くこと
- 本番に出す前に、本番の PlateType の値を SQL Editor で確かめること（「プレートの形は PlateType に持たせる」の節）
- 本番に出したあと、`Drop` と `Observation` に `anon`・`authenticated` の権限が付いていないことを確かめること。Data API の権限を外したマイグレーションの `ALTER DEFAULT PRIVILEGES` は、実行したロール（`postgres`）が作るテーブルにしか効かないため

## Phase 2: グリッドとウェルのシート（Phase 3 と一緒に出す）

### ゴール

詳細画面で、ドロップの閲覧・追加・編集・削除と、観察の追加ができる。新しい2種類が作れる。

### タスク

- [ ] `components/well-grid.tsx` — `rows`・`cols`・`layout`・`maxDrops` を受け取る形にまとめ、4ドロップと3ドロップの描き方を足す。塗りつぶしはドロップの有無で決める
- [ ] `components/well-grid-24.tsx` — 削除する
- [ ] `components/well-detail-modal.tsx` を `components/well-sheet.tsx` に改名して広げる。置き場所の図、ドロップの編集フォーム、観察履歴を持たせる
- [ ] `app/(app)/plates/[id]/page.tsx` と `plate-detail-client.tsx` — 新しいグリッドとシートを使う
- [ ] マイグレーション — 新しい2種類を入れる（同じ名前の共有種別が無いときだけ）。`prisma/seed.ts` にも足す
- [ ] 種別作成のスキーマとダイアログ — 上の3通りの組み合わせを通す
- [ ] `lib/i18n.ts` — 追加する文言（日本語と英語）

### 完了条件

`npm run check` が通る。ブラウザ（`http://127.0.0.1:3000`）で次を確かめる。

- 新しい2種類のプレートで、置き場所の図が設計どおりに描かれる（402px 幅で崩れない）
- ドロップの追加・編集・削除、観察の追加ができ、再読み込みしても残る
- ゴミ箱のプレートでは編集の操作が出ない
- 既存の96穴・24穴のプレートの見た目が変わっていない

この時点では、作成画面はまだドロップを作らない。そのため、ローカルで新しく作ったプレートは詳細画面で空に見える。Phase 3 で解消するので、ここでは push しない。

## Phase 3: まとめて入れる（Phase 2 と一緒に出す）

### ゴール

作成時からドロップ単位で記録され、あとから別のサンプルをまとめて足せる。サンプル名はドロップにしか無い状態になる。

### タスク

- [ ] `components/bulk-drop-form.tsx`（新規）— `well-grid-selector.tsx` でウェルを複数選び、置き場所を選び、サンプル名と濃度を入れる
- [ ] `components/new-plate-sheet.tsx` — 「使うウェルを選ぶ」ステップとサンプル名欄を、上の部品に置き換える。712行あるので、置き換える部分を別ファイルに切り出す形で進める
- [ ] `lib/actions/plates.ts` の `createPlate` — `filledPositions` の代わりに、まとめて入れる内容を受け取ってドロップを作る
- [ ] `plate-detail-client.tsx` — 編集モードに「まとめて追加」を置く
- [ ] サンプル名の入力と表示を消す。詳細画面の編集欄（`plate-detail-client.tsx:66, 124, 139, 281-292`）と表示（同 `:417`）、`updatePlate` と `updatePlateSchema` の `sampleName`（`lib/actions/plates.ts:176`、`lib/validations.ts:60`）、`createPlateSchema` の `sampleName`（`lib/validations.ts:17`）。列そのものは Phase 4 で消す
- [ ] マイグレーション — 使用中のウェルを1番のドロップへ移す（「既存データの移し替え」の節）
- [ ] 使用中ウェル数の計算を `lib/` の純粋関数にまとめ、4か所をそれに置き換える。`getPlates` と `searchPlates` の `include`（`lib/actions/plates.ts:29, 237, 257`）にドロップの件数を足す
- [ ] `lib/i18n.ts` — まとめて入れるフォームの文言

### 完了条件

`npm run check` が通る。ブラウザで次を確かめる。

- 作成時に選んだウェルと置き場所にドロップができる
- 「まとめて追加」で既存のドロップが上書きされず、スキップ件数が出る
- 一覧の使用中ウェル数と、詳細画面の塗りつぶしが一致する

ここまで確かめたら、Phase 2 と 3 をまとめて本番に出す。出したあと、本番の既存プレートが詳細画面で正しく表示されることを確かめる。

## Phase 4: 検索と後片付け（単独で出す）

### ゴール

サンプル検索がドロップ対象になり、役割の終わった欄が消えている。

### タスク

- [ ] `lib/actions/plates.ts` の `searchPlates` — ドロップのサンプル名で検索する。結果にサンプル名とドロップ数を添える
- [ ] `app/(app)/samples/` — 検索結果の表示を更新する
- [ ] マイグレーション — `Plate.sampleName`、`Well` の記録欄、enum `WellStatus`、`PlateType.wellCount` を削除する
- [ ] `wellCount` の参照を消す: `types/index.ts:4`、`app/(app)/page.tsx:24, 33`、`samples/page.tsx:23, 33`、`dashboard-client.tsx:21, 70`、`samples-client.tsx:20, 62`、`plates/[id]/page.tsx:77`、`plate-detail-client.tsx:44`、`new-plate-sheet.tsx:386`（「◯ wells」の表示は `rows × cols` で出す）
- [ ] `WellStatus` の参照を消す: `types/index.ts:8-23`、`plates/[id]/page.tsx:36-42`、`prisma/seed.ts:1, 49, 66-73`、`tests/validation-access-control.test.ts:17, 64-68`
- [ ] `lib/actions/wells.ts` の `updateWell` と、その入力チェック・テストを削除する（役割がドロップに移るため）
- [ ] `docs/architecture.md` — 2章（コンポーネント）、3章（データモデル）、8章を更新する

### 完了条件

```bash
npm run check    # 全部通る
```

本番で、既存のプレートと新しい2種類のプレートを開いて、表示と編集ができること。

列を消すマイグレーションは Vercel のビルド中に走る。そのため、新しいデプロイに切り替わるまでの短いあいだ、古いコードが消えた列を読みに行ってエラーになる。本番はまだ使われていないので許容するが、使われ始めたあとに同じことをするなら、列を読むコードを先に出してから消す2段階にする。

---

## 別で扱うこと

- 結合テストの計画（`feature/db-integration-tests` ブランチの `docs/plans/2026-09-24-db-integration-tests.md`）に、ドロップと観察の検証項目を追記する。1コミット1論点を守るため、この計画のコミットには混ぜず、そのブランチで行う

## 実測との差分

（実装しながら、計画と違ったことをここに書き足す）

- 計画のレビュー（2026-09-24）で、初版の Phase の切り方では途中で画面が壊れるか、表示が食い違うことが分かった。新しい2種類の投入を Phase 2 に遅らせ、Phase 2 と 3 はまとめて出す形に直した。既存データの移し替えは、対象を使用中のウェルすべてに広げ、一意制約との衝突を避ける形にした
