# プレート追加画面の3点（B）実装計画

作成: 2026-09-25 / ブランチ: `feature/plate-sheet-redesign`

## 目的

`docs/plans/2026-09-25-feedback-backlog.md` の「B. プレート追加画面の3点」を片付ける。

1. プレートタイプのボタンの大きさがそろわず、選びにくい
2. プレートタイプを間違えて作っても、消す場所が無い
3. 作成画面の「新しいセット」から条件のセットを作る流れが使いにくい

## 決まっていること

壁打ちで決めた。3点の答えは「作成画面は選ぶだけにして、足す・消すは設定の中の管理ページでやる」でそろっている。

- プレートタイプは、条件セットと同じラジオ付きの**縦のリスト**で選ぶ。1行に名前と「24 wells · Sitting · 4 drops」を出す
- プレートタイプの追加と削除は、設定の中の管理ページ（`/settings/plate-types`）でやる。作成画面からは「＋追加」を外し、リストの下に管理ページへのリンクを置く
- 使っているプレートがあるタイプは消せない。「N 枚のプレートで使っています」と出して止める。ゴミ箱のプレートも数に入れる。共有種別（`isDefault`）は今までどおり消せない
- 条件のテンプレートとセットの追加・削除も、管理ページ（`/settings/conditions`）に移す
- 作成画面の条件の欄は「セット／個別に選ぶ」の切り替えにする。「個別に選ぶ」はリザーバーとスクリーニングを1つずつ選ぶだけで、保存はしない
- 削除する前には、どれも `components/confirm-dialog.tsx` で確認を挟む

やらないこと: プレートタイプの編集（名前の変更など）、使わなくなったタイプを隠す機能（スキーマの変更になる）、条件を「なし」に戻す選択肢。どれも、使ってみて要ると分かったら足す。

## 設計

### 今の作りで何が起きているか

実装の前に、読んで分かったことを残しておく。

- タイプのボタンは `shrink-0` と `p-4` で横に並べているだけなので、幅が名前の長さで変わる。「＋追加」は余白と枠線が別の指定になっていて、これも大きさがそろわない
- タイプの削除は、サーバーアクションごと存在しない（`lib/actions/plate-types.ts` には `getPlateTypes` と `createPlateType` しかない）
- 「新しいセット」のパネルは、2つの役目を1枚に詰め込んでいる。1つは、その場で1回だけ使う組み合わせを選ぶこと。もう1つは、セットとして保存すること。登録ボタンを押さずに作成すると、選んだ2つがそのプレートにだけ使われる
- テンプレートとセットの ✕ は、確認なしですぐ消える。テンプレートを消すと、それを使っている自分のセットも消え、自分のプレートの条件は空になる（`deleteConditionTemplate`）
- 作成画面は、テンプレートを消せるかどうかを `!ct.description` で見分けている。共有テンプレートには説明が入っているので今は結果が合っているが、見たいのは説明の有無ではなく共有かどうかだ。管理ページでは `isDefault` で判断する

プレートに保存しているのはリザーバーとスクリーニングの ID だけで、どのセットを使ったかは持っていない。つまりセットは「よく使う組み合わせに名前を付けたもの」にすぎない。作成画面から保存を外しても、プレートのデータには何も影響しない。

### 管理ページは設定の下に2枚置く

設定画面（`app/(app)/settings/settings-client.tsx`）に「データ」の欄を足し、`ListRow` を2行並べる。

- プレートタイプ → `/settings/plate-types`
- 条件 → `/settings/conditions`

どちらもサーバーコンポーネントでデータを取り、クライアントコンポーネントに渡す。今のページと同じ作りだ。追加や削除のあとは `router.refresh()` で読み直す。今のコードは `revalidatePath` を使っていないので、それに合わせる。

ヘッダーはマイページの編集画面（`app/(app)/mypage/edit/edit-client.tsx`）と同じく、左の矢印で `router.back()` する。作成画面のリンクから来たときに、ホームに戻れるからだ。ただし URL を直接開いた場合は、戻り先がアプリの外になる。気になったら `/settings` への `Link` に替える。

作成画面からのリンクは `<Link>` で開く。シートはホームの画面が持っている状態なので、ページが替われば閉じる。そのとき**入力途中の内容は消える**。タイプを足す頻度は低く、96 Well も今は共有種別で最初から入っているので、これで困る場面は少ないと見ている。

### プレートタイプの削除は、使われていれば止める

`deletePlateType(id)` を `lib/actions/plate-types.ts` に足す。

1. ID を検証する。プレートタイプの ID は uuid の文字列なので、`deletePlate` と同じ `resourceIdSchema` を使う
2. `plateType.findFirst({ where: { id, createdById: userId, isDefault: false } })` で、自分の非共有タイプかを確かめる。無ければ `{ error: "Not found" }` を返す
3. `prisma.plate.count({ where: { plateTypeId: id } })` で使われている枚数を数える。ゴミ箱のプレートも含めたいので、`deletedAt` では絞らない。0 でなければ `{ error: "In use", count }` を返す
4. `delete` で消す

2を3より先にするのは、数える前に持ち主を確かめないと、他人のタイプの ID を送ったときに使用枚数が返ってしまうからだ（コードレビューで指摘された）。`deleteConditionTemplate` も同じ順で持ち主を先に見ている。枚数は自分のプレートに絞らない。`createPlate` は `accessiblePlateTypeWhere` を通したタイプしか受け付けないので、非共有タイプを使えるのは持ち主のプレートだけだからだ。

ハマりどころが1つある。3と4のあいだに、別のタブでそのタイプのプレートが作られるかもしれない。ただ `Plate.plateTypeId` は必須の外部キーで、最初のマイグレーションで `ON DELETE RESTRICT` になっているので、そのときは DB が削除を拒む。この例外（`P2003`）も捕まえて「使っています」として返せば、トランザクションを張らなくて済む。

- この経路では枚数が分からないので、`count` は省略できる型にし、画面には枚数なしの文面も用意する
- エラーコードの取り出しは `lib/actions/drops.ts` の `prismaErrorCode` を共通の場所に移して使い回す
- モックのテストで確かめられるのは catch の分岐だけだ。`@prisma/adapter-pg` 経由で本当に `P2003` になるかは、ローカル DB で一度確かめる（完了条件）

画面で使う「24 wells · Sitting · 4 drops」の1行は、作成画面と管理ページの両方に出す。追加ダイアログの `SHAPE_OPTIONS` の `label`（「Sitting · 4 drops」）も中身が重なる。そこで `lib/wells.ts` に、形式とドロップ数からこの文字列を作る関数を1つ置き、3か所から呼ぶ。`Sitting`・`Hanging`・`drop(s)` は `lib/i18n.ts` を通す。

`components/new-plate-type-dialog.tsx` は、管理ページからそのまま使う。見出し・ラベル・エラー文が英語のまま埋め込まれているので、この機会に `lib/i18n.ts` を通す。管理ページで出すエラー文（サーバーアクションが返す「使っています」など）も、同じく i18n を通す。

`types/index.ts` の `PlateType` には `isDefault` が無い。管理ページでは `PlateType & { isDefault: boolean }` のように足して使う。

管理ページで足したタイプが、戻ったホームの作成画面に出るかは、ハマりやすい所だ。Next 16 の「戻る」は Router Cache を使い回す。管理ページ側で `router.refresh()` を呼べばキャッシュごと捨てられるので出るはずだが、出なければサーバーアクションに `revalidatePath("/")` と `revalidatePath("/samples")` を足す。

### 条件の管理ページは、テンプレートとセットの2つの欄にする

`/settings/conditions` には欄を2つ置く。

- **テンプレート**: 名前の一覧と、名前を入れて足す入力欄。自分で作ったものだけ消せる。確認の文面には「このテンプレートを使うセットも消えます。使っているプレートの条件は空になります」と出す。セットの件数は手元の一覧から数えられるので、文面に入れる
- **セット**: 一覧と「新しいセット」ボタン。ボタンを押すとダイアログが開き、名前・リザーバー・スクリーニングを選んで保存する。自分で作ったものだけ消せる

サーバーアクションは `lib/actions/condition-templates.ts` にあるものをそのまま使い、手を入れない。消せるかどうかは `isDefault` で決める。`getConditionTemplates` は `isDefault` も返しているので、クライアントに渡す型に足すだけでよい。

### 作成画面は選ぶだけにする

`components/new-plate-sheet.tsx` から外すものは次のとおり。

- 「＋追加」ボタン、`NewPlateTypeDialog`、`handleAddPlateType`
- `handleAddTemplate`・`handleDeleteTemplate`・`handleDeleteSet`・`handleRegisterSet` と、それぞれが使っていた状態（`newTemplateName`・`customSetName`・`savingSet` など）
- `allPlateTypes`・`allTemplates`・`allSets` の状態。作成画面の中で増えたり減ったりしなくなるので、props をそのまま使えばよい。開き直すたびに props から戻していた `useEffect` の後半も要らなくなる

条件の欄は「セット／個別に選ぶ」の切り替えにする。「個別に選ぶ」側はリザーバーとスクリーニングのチップだけにする（✕ は付けない）。`i18n` の `newSet` は `pickIndividually`（ja: 個別に選ぶ / en: Pick individually）に替え、使わなくなる `setName`・`registerSet`・`addTemplate` は、管理ページで使い回すものを除いて消す。セットが無いときの `noConditionSets` は「『新規セット』で作成してください」と案内しているので、管理ページで作るよう書き換える。

作成画面が受け取る `ConditionTemplateItem.description` と `UiConditionSet.isDefault` は、使わなくなっても残す。消すと `app/(app)/page.tsx`・`app/(app)/samples/page.tsx`・`dashboard-client.tsx`・`samples-client.tsx` の4か所をそろえて直すことになり、得るものが無い。`NewPlateSheet` の props の形は変わらないので、呼んでいる2か所は壊れない。

タイプを選び直したときにウェルの選択を戻す処理（`selectPlateType`）は、そのまま残す。

## Phase 1: プレートタイプ

### タスク

- [x] `lib/actions/plate-types.ts` — `deletePlateType` を足す（持ち主を先に確かめ、使っていれば止める。`P2003` も「使っています」に直す）
- [x] `lib/actions/drops.ts` — `prismaErrorCode` を共通の場所に移し、`plate-types.ts` からも使う
- [x] `tests/plate-type-actions.test.ts` — 他人のタイプと共有種別は数える前に `Not found` を返すこと、使っている枚数が 1 以上なら消さずに枚数を返すこと、`P2003` を枚数なしの「使っています」として返すことを確かめる
- [x] `lib/wells.ts` — 形式とドロップ数から「Sitting · 4 drops」を作る関数を置き、作成画面・管理ページ・追加ダイアログから使う
- [x] `components/new-plate-type-dialog.tsx` — 見出し・ラベル・エラー文を `lib/i18n.ts` に移し、`SHAPE_OPTIONS` の `label` を上の関数に替える
- [x] `app/(app)/settings/plate-types/page.tsx`・`plate-types-client.tsx` — 一覧・追加・削除（確認あり）。共有種別には削除ボタンを出さない。エラー文は i18n を通す
- [x] `app/(app)/settings/settings-client.tsx` — 「データ」の欄を足し、プレートタイプの行を置く
- [x] `components/new-plate-sheet.tsx` — タイプを縦のリストにし、「＋追加」を外して管理ページへのリンクを置く。`NewPlateTypeDialog`・`handleAddPlateType`・`allPlateTypes`（と `useEffect` の `setAllPlateTypes`）も外し、`plateTypes` の props をそのまま使う
- [x] `lib/i18n.ts` — 増えた文言を ja / en の両方に足す
- [x] `docs/architecture.md` — 画面一覧に管理ページを足す

### 完了条件

- `npm run check` が通る
- ブラウザ（402px 幅）で確かめる
  - 作成画面のタイプの行が同じ幅で並び、長い名前でも崩れない
  - 作成画面のリンクから管理ページへ行き、タイプを足して戻ると、作成画面のリストに出ている
  - まだ使っていないタイプは、確認のあとで消える
  - 使っているタイプ（ゴミ箱のプレートだけで使っている場合も）は消えず、枚数が出る
  - 共有種別には削除ボタンが出ない
  - 言語を英語に切り替えても、管理ページと追加ダイアログに日本語が残らない
- ローカル DB で、プレートが使っているタイプを `prisma.plateType.delete` で直接消そうとすると `P2003` になる（catch の分岐が実際に通ることの確認）

### 実装してみて分かったこと（2026-09-25）

- `prismaErrorCode` の移し先は `lib/prisma-error.ts` にした。`lib/prisma.ts` に置くと、テストで `@/lib/prisma` をモックしたときに一緒に消える。`drops.ts` は `"use server"` なので、そこから export もできない（サーバーアクションのファイルは async 関数しか export できない）
- `NewPlateTypeDialog` の `onAdd(type)` は `onAdded()` に変えた。管理ページは `router.refresh()` で読み直すだけで、足したタイプの中身を受け取る必要が無い。呼んでいるのは管理ページだけになった
- 入力欄の例（`e.g. 8` など）は英語のまま残した。作成画面の `e.g. Plate A-001` と同じ扱いにそろえている
- `P2003` の確認は、ローカル DB でプレートが使っている「96 Well - Sitting」を `$transaction` の中で `delete` して行った（成功したら巻き戻す作り）。`@prisma/adapter-pg` 経由でも `code` が `P2003` で返る
- ブラウザ確認用に、ローカルのテストユーザーへタイプ「P1 TrashOnly」と、それを使うゴミ箱のプレート「P1 Trashed」を残してある。削除を止める表示は「Used by 1 plate(s)…」と出た
- `router.refresh()` だけで、戻ったホームの作成画面に足したタイプが出た。`revalidatePath` は足していない

## Phase 2: 条件

### タスク

- [ ] `app/(app)/settings/conditions/page.tsx`・`conditions-client.tsx` — テンプレートとセットの一覧・追加・削除（確認あり）。消せるかどうかは `isDefault` で決める。`deleteConditionTemplate` が返す「ほかのセット・プレートが使っている」エラーも i18n を通して出す
- [ ] `app/(app)/settings/settings-client.tsx` — 「データ」の欄に条件の行を足す
- [ ] `components/new-plate-sheet.tsx` — 条件の欄を「セット／個別に選ぶ」にし、保存・追加・削除とそのための状態を外す。管理ページへのリンクを置く
- [ ] `lib/i18n.ts` — `newSet` を `pickIndividually` に替え、`noConditionSets` を管理ページへの案内に書き換え、使わなくなった文言を消し、増えた文言を足す
- [ ] `docs/architecture.md` — 条件を管理する場所が変わったことを書く

### 完了条件

- `npm run check` が通る
- ブラウザ（402px 幅）で確かめる
  - 管理ページでテンプレートを足し、それを使ってセットを作ると、作成画面のセットの一覧に出る
  - テンプレートを消すと、確認の文面に消えるセットの数が出て、そのセットも一覧から消える
  - 作成画面で「個別に選ぶ」を使って作ったプレートの詳細に、選んだリザーバーとスクリーニングが出る
  - セットを選んで作ったプレートも、今までどおり条件が入る
  - 作成画面に、条件を保存・追加・削除する操作が残っていない
