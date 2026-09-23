# プレートのゴミ箱機能 実装計画

作成: 2026-09-23 / ブランチ: `feature/plate-trash`

## 目的

プレートを登録できても消す手段が UI に無い。削除は取り消せない操作なので、いきなり消さずに一度ゴミ箱へ移し、そこから復元か完全削除を選べるようにする。

サーバー側には `deletePlate`（`lib/actions/plates.ts`）が既にあるが、物理削除で、どの画面からも呼ばれていない。これをソフトデリートに置き換える形で進める。

## 決まっていること

- 削除はソフトデリート。`Plate.deletedAt` に日時を入れた状態を「ゴミ箱」とする
- 完全削除は手動のみ。自動で消える仕組みは作らない
- ゴミ箱へ移すボタンは詳細画面の編集モード最下部に置き、確認ダイアログを挟む
- ゴミ箱の一覧は `/trash`。マイページから遷移する
- ゴミ箱のプレートを詳細画面で開いた場合（QR 経由を想定）は、帯と復元ボタンを出して閲覧のみ許す
- アーカイブ（`status = ARCHIVED`）はそのまま残す。アーカイブは終わった実験の保管、ゴミ箱は要らないもの、と役割が違う

やらないこと: 自動削除、一覧画面からの一括削除、アーカイブとの統合。

## 設計上の要点

一番の事故は、クエリに「ゴミ箱を除く」条件を足し忘れて、消したはずのプレートが一覧や検索に出ることだ。これを防ぐため、条件は `lib/access-control.ts` のヘルパー2つに集約し、各クエリはそれを混ぜるだけにする。直書きしないので、`grep activePlateWhere` で適用箇所を数えられる。

`purgePlate` は `deletedAt` が入っているプレートしか消せないようにする。通常のプレートを誤って直接消す経路を作らないためのガード。

条件テンプレートを削除したときの挙動（`lib/actions/condition-templates.ts` の `deleteConditionTemplate`）は変えない。今の実装は、他人のプレートが参照していれば削除を拒否し（96行目）、自分のプレートからは参照を外す（114〜121行目）。自分のゴミ箱プレートも「自分のプレート」として参照が外れるので、そのあと復元すると、テンプレート未設定のプレートとして戻る。詳細画面は未設定を扱えるため壊れはしない。自分のゴミ箱プレートを理由に削除を拒否する案もあったが、テンプレートを消すたびにゴミ箱を空にさせるのは使いにくいので採らない。

`updateWell` は UI からは呼ばれていないが、サーバー側の穴として塞いでおく。

ゴミ箱への移動と復元でも `updatedAt` は更新される（`@updatedAt` の仕様）。一覧は `updatedAt` の降順なので、復元したプレートは先頭に来る。「最後に触った日」として自然なので、そのままにする。

認可の条件が効いているかは、画面からは確かめられない。通常プレートを `purgePlate` に渡す、他人のプレート ID で呼ぶ、といった操作は UI に出てこないためだ。そこで Phase 1 では、prisma をモックして **Action が実際に渡す `where` を検査するテスト** を書く。ヘルパーが返す形を見るだけのテストでは、ヘルパーを呼び忘れた Action を検出できない。

---

## Phase 1: データとサーバー側

### ゴール

ゴミ箱の状態を DB で表現でき、すべての Action がそれを正しく扱う。UI は触らない。

### 事前準備

マイグレーションの適用にローカル DB が要る。Docker Desktop を起動し、`npx supabase start` しておく（手順は `docs/architecture.md` 6章）。

`prisma migrate dev` は使わない。ローカル DB は Supabase 側の SQL からも作られており、Prisma が差分（drift）を検出して DB のリセットを求めてくる恐れがある。承諾するとローカルのデータが消える。追加する SQL は短いので手で書き、`migrate deploy` で適用する。

### タスク

- [ ] `prisma/schema.prisma` の `Plate` に `deletedAt DateTime?` と `@@index([userId, deletedAt])` を追加
- [ ] `prisma/migrations/20260923000000_add_plate_soft_delete/migration.sql` を手で作成する。中身は `ALTER TABLE "Plate" ADD COLUMN "deletedAt" TIMESTAMP(3);` と `CREATE INDEX "Plate_userId_deletedAt_idx" ON "Plate"("userId", "deletedAt");` の2文だけ
- [ ] `npx prisma migrate deploy` でローカルに適用し、`npx prisma generate` でクライアントを更新
- [ ] `lib/access-control.ts` に追加
  - `activePlateWhere(userId)` → `{ userId, deletedAt: null }`
  - `trashedPlateWhere(userId)` → `{ userId, deletedAt: { not: null } }`
- [ ] `lib/actions/plates.ts` の既存 Action を修正
  - `getPlates`、`searchPlates`（空クエリ時と検索時の2か所）の `where` に `activePlateWhere` を使う
  - `getPlateById` はゴミ箱も返す（条件は変えない）。`deletedAt` は `include` しなくても結果に含まれる
  - `updatePlate` の存在確認を `activePlateWhere(userId)` に変え、見つからなければ `{ error: "Not found" }` を返す（今は `throw`）。テンプレートにアクセスできない場合の `throw`（213行目）も `{ error: "Not found" }` に揃える。最後の `update` の `where` にも `deletedAt: null` を足し、確認と更新の間にゴミ箱へ移された場合は更新しない
  - `deletePlate` を `updateMany({ where: { id, ...activePlateWhere(userId) }, data: { deletedAt: new Date() } })` に置き換える。更新0件なら `{ error: "Not found" }`、成功なら `{ success: true }`
- [ ] `lib/actions/plates.ts` に新規 Action を追加（すべて `getCurrentUserId()` と `resourceIdSchema` を通す）
  - `getTrashedPlates()` — `where` は `{ ...trashedPlateWhere(userId), plateType: accessiblePlateTypeWhere(userId) }`。`getPlates` と条件を揃え、一覧に出るのに詳細が開けないプレートを作らない。`deletedAt` の降順、`plateType` を include
  - `restorePlate(id)` — `updateMany({ where: { id, ...trashedPlateWhere(userId) }, data: { deletedAt: null } })`。更新0件なら `{ error: "Not found" }`
  - `purgePlate(id)` — `deleteMany({ where: { id, ...trashedPlateWhere(userId) } })`。削除0件なら `{ error: "Not found" }`。ウェルは `onDelete: Cascade` で DB 側が消す
- [ ] `lib/actions/wells.ts` の `updateWell` で、親プレートの `deletedAt` が入っていれば `{ error: "Not found" }` を返す。今の `throw` も `{ error }` に揃える
- [ ] `tests/validation-access-control.test.ts` にヘルパーのテストを追加
  - `activePlateWhere` が `userId` と `deletedAt: null` を返す
  - `trashedPlateWhere` が `userId` と `deletedAt: { not: null }` を返す
- [ ] `tests/plate-trash-actions.test.ts` を新設し、Action が渡す条件を検査する。`@/lib/prisma` を `vi.fn()` のモックに、`@/lib/auth` の `getCurrentUserId` を固定値を返すモックに差し替える
  - `purgePlate` の `deleteMany` の `where` に、`id`・`userId`・`deletedAt: { not: null }` が入っている
  - `restorePlate` の `updateMany` の `where` に、`id`・`userId`・`deletedAt: { not: null }` が入っている
  - `deletePlate` の `updateMany` の `where` に、`id`・`userId`・`deletedAt: null` が入っている
  - 各 Action で、モックが `count: 0` を返したら `{ error: "Not found" }` になる
  - `updatePlate` の存在確認と `update` の `where` に `deletedAt: null` が入っている
  - `updateWell` で、親プレートの `deletedAt` が入っていれば `update` が呼ばれず `{ error }` が返る

### 完了条件

```bash
npm run typecheck
npm run test
npm run build
grep -n "activePlateWhere\|trashedPlateWhere" lib/actions/*.ts
```

grep の結果が、import 行を除いて `getPlates`・`searchPlates`×2・`updatePlate`・`deletePlate`・`getTrashedPlates`・`restorePlate`・`purgePlate` の8か所であること。

---

## Phase 2: 画面

### ゴール

ユーザーがゴミ箱へ移す・一覧で確認する・復元する・完全に消す、を画面から一通りできる。

### タスク

- [ ] `lib/i18n.ts` に en/ja のキーを追加（`moveToTrash`、`trash`、`restore`、`deletePermanently`、`trashConfirmTitle`、`trashConfirmBody`、`purgeConfirmTitle`、`purgeConfirmBody`、`inTrashBanner`、`trashEmpty` など）
- [ ] `app/(app)/plates/[id]/page.tsx` で `uiPlate` に `deletedAt`（ISO 文字列か `null`）を渡す
- [ ] `app/(app)/plates/[id]/plate-detail-client.tsx`
  - 編集モードの保存・キャンセルボタンの下に、赤い「ゴミ箱に移動」ボタンを追加
  - `components/ui/dialog.tsx` で確認ダイアログを出し、確定で `deletePlate` を呼ぶ。成功したら `router.push("/")`、失敗したら既存の `error` 表示に出す
  - `plate.deletedAt` があるときは、上部に「このプレートはゴミ箱にあります」の帯と「復元」ボタンを出し、編集ボタン（鉛筆）を隠す。復元成功で `router.refresh()`
- [ ] `app/(app)/trash/page.tsx`（Server）と `app/(app)/trash/trash-client.tsx`（Client）を新設
  - 行ごとにプレート名・種別・ゴミ箱へ移した日付、「復元」「完全に削除」ボタン
  - 行の本体をタップすると詳細画面（帯つきの閲覧モード）へ遷移する
  - 完全削除は確認ダイアログで「元に戻せません」と明示
  - 空のときは `trashEmpty` を表示
  - 戻るボタンでマイページへ
- [ ] `app/(app)/mypage/mypage-client.tsx` に「ゴミ箱」の `ListRow` を追加し、`/trash` へ遷移

### 完了条件

```bash
npm run typecheck
npm run test
npm run build
```

加えて、ローカル（`http://127.0.0.1:3000`）で次を一周して確認する。

1. プレート詳細 → 編集 → ゴミ箱に移動 → 確認ダイアログで確定 → ダッシュボードに戻る
2. ダッシュボード、サンプル一覧、検索のどこにもそのプレートが出ない。マイページの統計からも外れる
3. そのプレートの詳細 URL を直接開くと、帯と復元ボタンが出て、鉛筆ボタンが無い
4. 詳細画面で復元 → 一覧に戻ってくる
5. もう一度ゴミ箱へ → マイページ → ゴミ箱 → 一覧に出ている
6. 完全に削除 → 確認ダイアログで確定 → 一覧から消え、詳細 URL は "Plate not found" になる
7. DB でそのプレートのウェルも消えていることを確認（`docker exec supabase_db_plate-manage-app psql -U postgres -c 'SELECT count(*) FROM "Well" WHERE "plateId" = ...'`）
8. 自作のテンプレートを設定したプレートをゴミ箱へ移す → そのテンプレートを削除 → プレートを復元 → 詳細画面が壊れず、リザーバー/スクリーニングが「-」表示になる

---

## 本番への反映

`main` にマージして push すれば、ビルド時の `prisma migrate deploy` で本番 DB にもカラムが追加される。追加のみのマイグレーションなので既存データへの影響はない。
