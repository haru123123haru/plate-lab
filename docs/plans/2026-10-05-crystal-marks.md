# 結晶化の目印 実装計画

作成: 2026-10-05 / ブランチ: `feature/crystal-marks`

## 目的

観察のときに「このドロップは結晶化している」という目印を付け、詳細画面のウェルマップで、どのウェル（条件）が結晶化しやすいかを一目で分かるようにする。

`docs/plans/2026-09-25-feedback-backlog.md` の C「サンプルのアイコンと色」を壁打ちしているときに出た要望で、そちらより先に作ることにした。既存の観察に列を1つ足すだけで小さく、実験の役にすぐ立つため。

## 決まっていること

- 目印は観察（`Observation`）に付ける。種類は「怪しい」「結晶あり」「結晶取り済み」の3つで、付けなくてもよい
- ウェルマップには、そのドロップの観察の中で**いちばん良い結果**を出す。良い順は 取り済み > 結晶あり > 怪しい。一度でも結晶が出たら、あとの観察で印が無くても残る
- メモに残っている `Status: CRYSTAL`（ウェルからドロップへ移したときにメモへ詰めたもの）は、「結晶あり」の観察として移す。`PRECIPITATE`・`CLEAR` は3つのどれにも当たらないので移さない。メモの文字は消さない

やらないこと: 一覧のカードやサンプル画面に目印を出すこと、目印での絞り込み、観察の目印をあとから変えること（消して付け直す）。

## 設計

### 観察に目印の列を足す

```prisma
// 観察のときに付ける結晶化の目印。良い順は HARVESTED > CRYSTAL > POSSIBLE
enum CrystalMark {
  POSSIBLE   // 怪しい
  CRYSTAL    // 結晶あり
  HARVESTED  // 結晶取り済み
}

model Observation {
  ...
  mark CrystalMark?
}
```

目印だけ付けてメモを書かない観察もあり得るので、メモは「目印かメモのどちらかがあればよい」にする。列は今の NOT NULL の文字列のまま、目印だけのときは空文字を入れる。`addObservationSchema` は `notes` を `min(1)` から空を許す形にして、`refine` で「目印もメモも無い」を拒む。

### いちばん良い結果は `lib/wells.ts` で決める

`bestMark(observations)` を `lib/wells.ts` に足し、良い順の表（`HARVESTED: 3, CRYSTAL: 2, POSSIBLE: 1`）で一番上を返す。印の無い観察しか無ければ `null`。詳細画面の `page.tsx` で各ドロップに `bestMark` を付けて渡し、グリッドはそれを読むだけにする（観察の並び順に頼らない）。

### 見た目は「塗り」ではなく「輪」で出す

ドロップのある置き場所は今、黒（`bg-text-primary`）で塗っている。あとで作るサンプルの色はこの塗りに使うので、目印は置き場所の**外側の輪**（`ring-2`）で出す。96 Well の1ウェルは直径約22px、4ドロップの置き場所は約10px なので、記号や文字は入らない。

- 怪しい: 黄（`--mark-possible`）
- 結晶あり: 緑（今の `--accent-positive` と同じ色を `--mark-crystal` として持つ）
- 取り済み: 青（`--mark-harvested`）

色は `app/globals.css` にライトとダークの両方で足す。グリッドの下に、目印が1つでもあるときだけ凡例を出す。ボタンの `aria-label` にも目印の名前を足す（例: `Well A1, 結晶あり`）。

ウェルのシートでは、観察の追加欄に3つのチップ（もう一度押すと外れる）を置く。観察の履歴には日付の横に目印のバッジを出す。シートの大きい図の置き場所にも、グリッドと同じ輪を出す。

### 既存のメモを移すマイグレーション

ドロップのメモの行に `Status: CRYSTAL` があれば、そのドロップに「結晶あり」の観察を1件足す。

- 観察日はプレートの仕込み日にする。元の status をいつ付けたかは残っていないので、分かっている日付のうち一番近いものを使う
- メモは `Migrated from notes (Status: CRYSTAL)` にする。画面は日英の両方があるので英語に寄せる
- 同じ内容の観察がすでにあれば入れない（`NOT EXISTS`）。流し直しても増えない
- `id` は `gen_random_uuid()::text` で渡す（`@default(uuid())` は DB の既定値にならない）
- 本番に何件あるかは手元から数えられない（`docs/architecture.md` の7章）。出したあと SQL Editor で数えて、ここに書き残す

## Phase 1: 目印の列と表示

### タスク

- [x] `prisma/schema.prisma` — `CrystalMark` と `Observation.mark` を足す
- [x] `prisma/migrations/20261005000000_add_observation_mark/migration.sql` — enum と列を足し、`Status: CRYSTAL` を観察として移す
- [x] `lib/validations.ts` — `addObservationSchema` に `mark` を足し、目印かメモのどちらかを必須にする
- [x] `lib/actions/drops.ts` — `addObservation` で `mark` を受けて保存する
- [x] `lib/wells.ts` — `bestMark` を足す
- [x] `types/index.ts` — `ObservationData.mark`・`DropData.bestMark` を足す
- [x] `app/(app)/plates/[id]/page.tsx` — 観察の目印と、ドロップごとの `bestMark` を渡す
- [x] `components/well-shape.tsx` — 置き場所ごとの目印を受け取り、輪を描く
- [x] `components/well-grid.tsx` — 目印を `WellShape` に渡し、凡例と `aria-label` を足す
- [x] `components/well-sheet.tsx` — 観察の追加欄に目印のチップ、履歴にバッジ、大きい図に輪
- [x] `app/globals.css` — 目印の色3つをライトとダークで足す
- [x] `lib/i18n.ts` — 目印の名前（ja: 怪しい／結晶あり／結晶取り済み、en: Possible / Crystal / Harvested）
- [x] `tests/drop-actions.test.ts` — `addObservation` が `mark` を渡すこと、目印だけの観察を作れること、`bestMark` の順位
- [x] `tests/validation-access-control.test.ts` — 目印もメモも無い観察と、知らない目印を拒むこと
- [x] `docs/architecture.md` — `Observation` の説明に目印を足し、マイグレーションの本数を直す

### 完了条件

- `npm run check` が通る
- ローカルでマイグレーションを流したあと `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` で差分が無い
- メモに `Status: CRYSTAL` があるドロップを1つ用意してからマイグレーションを流すと、「結晶あり」の観察が1件でき、流し直しても増えない
- ブラウザ（402px 幅、ライトとダーク）で確かめる
  - 観察に目印を付けて追加でき、目印だけ（メモ空）でも追加できる
  - 24 Well・4ドロップ・3ドロップ・96 Well のグリッドで、輪が見分けられる
  - 「結晶あり」のあとに印の無い観察を足しても、グリッドの輪は残る
- 本番に出したあと、移した観察の件数を SQL Editor で数えて記録する

### 実測（2026-10-05、ローカルの dev サーバー、Playwright の Chromium、402px 幅）

- このクローンは新しく立てたローカル環境で、`supabase start` が `supabase/migrations` の統合SQLで古いスキーマを作る。本番と同じく最初の4本を `prisma migrate resolve --applied` で baseline してから `migrate deploy` を流した
- `migrate diff --from-config-datasource` の差分は無し
- メモに `Status: CRYSTAL\nBuffer: Tris`・`Status: PRECIPITATE`・`see Status: CRYSTAL later` を持つドロップで移す部分を流すと、1つ目だけに仕込み日の「結晶あり」の観察ができた。2回目は0件。PGlite で行頭・行末の両方の位置も確かめた
- 24 Well の4ドロップ・15 Well の3ドロップ・96 Well のグリッドで、3色の輪が見分けられる。凡例はプレートに出ている目印だけが出る
- 「結晶あり」のあとに印の無い観察を足したドロップ（4ドロップの A2 の1番）も、輪が残る
- シートで「結晶取り済み」を押すと、追加ボタンがメモ空のまま押せるようになり、追加後はグリッドと読み上げ（`Well A3, 結晶取り済み`）に反映され、チップは外れる。メモの無い観察は日付と目印だけが出る
- シートの大きい図では、選択中の輪（外側）と目印の輪（内側）が重なっても両方見える

計画とずれた点:

- ダークでは置き場所の塗りが白に近い（`--text-primary: #F0F0F0`）ので、明るい黄・緑・青の輪が塗りに溶けた。ダークの目印の色はライトより濃くした（`#D97706`・`#16A34A`・`#2563EB`）
- 新しく作ったユーザーは `UserSettings` が無く、外観がライト固定になる。ダークの確認は、テスト用ユーザーの外観を DB で `system` にして行った
