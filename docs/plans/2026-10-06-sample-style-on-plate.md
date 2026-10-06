# サンプルの見た目を、プレートの作成画面と詳細画面で決める（2026-10-06）

作成: 2026-10-06

## 目的

サンプルのアイコンと色は、今は設定の管理ページ（`/settings/samples`）でしか変えられない。メニューの奥にあるので、見た目を付けないまま使われている。サンプルを入れるとき（プレートの作成画面）に選べるようにし、あとで直すときはプレートの詳細画面から変えられるようにする。

管理ページは、手元のサンプルを一覧する場所、名前の変更と名前の揺れをまとめる場所として残す。

## やること

- **作成画面**: サンプル名の欄に、既にあるサンプル名を候補として出す（`datalist`）。同じサンプルを `lysozyme` と `Lysozyme` のように別の名前で入れてしまうのを防ぐ。ウェルを選んだら、アイコンと色の選択を出す
  - 既にある名前なら、その見た目を最初から選んでおく。新しい名前なら既定の見た目（グレーのフラスコ）
  - 選んだ見た目は、そのときの名前に結びつける。選んだあとに名前を変えたら、その名前の見た目に戻す
  - 既にある名前の見た目を変えるときは、他のプレートの見た目も変わると書いておく
- **作成の処理**: `createPlate` の `drops` に `style`（アイコンと色）を足す。あれば、プレートを作るのと同じトランザクションで `Sample` を upsert する
- **詳細画面**: ウェルマップとメモのあいだに「サンプル」の欄を足す。このプレートのサンプルを、チップとドロップ数で並べる。行を押すと、管理ページと同じ編集ダイアログ（`SampleEditDialog`）を、名前を変えられない形で開く。ゴミ箱のプレートでは押せない。サンプルが無いプレートでは欄を出さない
- **部品**: アイコンと色の選択を `SampleEditDialog` から `SampleStylePicker` に切り出し、作成画面と共有する

やらないこと: ウェルマップの塗りをサンプルの色にすること、ホームの一覧へのチップ、サンプルの削除。

## タスク

- [x] `components/sample-style-picker.tsx` — アイコンと色の選択。`SampleEditDialog` もこれを使う
- [x] `components/sample-edit-dialog.tsx` — 名前を変えられない形（`renameable={false}`）
- [x] `lib/validations.ts`・`lib/actions/plates.ts` — `createPlate` の `drops.style` と `Sample` の upsert
- [x] `components/bulk-drop-form.tsx` — サンプル名の候補
- [x] `components/new-plate-sheet.tsx` — 見た目の選択。`app/(app)/page.tsx`・`app/(app)/samples/page.tsx` で `getSamples()` を引いて渡す
- [x] `components/plate-samples.tsx`・`app/(app)/plates/[id]/` — 詳細画面の「サンプル」の欄
- [x] `lib/i18n.ts` — 新しい文言（日英）
- [x] `tests/drop-actions.test.ts` — 見た目つきで作ると `Sample` を upsert すること、見た目が無ければ触らないこと、候補に無い見た目を拒むこと

## 確認

`npm run check` が通る。ブラウザ（Playwright、402px）で次を確かめる。

- 作成画面で、既にある名前を入れるとその見た目が選ばれ、選んだ見た目でプレートが作られる
- 詳細画面の「サンプル」から見た目を変えると、チップとサンプル画面のカードに反映される
