# DB を伴う結合テストを足す（2026-10-10）

作成: 2026-10-10

## 目的

今あるテストは、純粋関数のテストと、prisma をモックしたテストだけだった。Action が持ち主とゴミ箱の条件を `where` に入れて渡すことは確かめられるが、その条件が実際のクエリで効くか、つまり「他人のデータが本当に取れないか、変えられないか」は誰も確かめていなかった（`docs/architecture.md` の「既知の課題」で、いちばん重いもの）。

本物の Postgres に向けて Action を呼び、2人のユーザーのあいだでデータが漏れないことを確かめる。

## 決めたこと

### ローカルの Supabase の Postgres に、テスト専用の DB を作る

- 開発で動かしている `supabase start` の Postgres（`127.0.0.1:54322`）に、`plate_lab_test` という DB を作って使う。`TEST_DATABASE_URL` で変えられる
- 作り方は本番と同じ `prisma migrate deploy`。テストを流すたびに、無ければ DB を作り、マイグレーションを当てる（`tests/integration/global-setup.ts`）
- テストのたびに全テーブルを空にする。そのため、手元のマシンの外にある DB や、名前が `_test` で終わらない DB では動かないようにした（`vitest.integration.config.mts`）。`.env` の `DATABASE_URL` より先に効く
- ファイルを並べて流さない（1つの DB を共有するため）

### ログインはモックにし、ほかは本物を通す

- `getCurrentUserId` だけを差し替え、テストの中で `signInAs(alice)` で切り替える（`tests/integration/setup.ts`）。Supabase Auth は通さない
- prisma・Action・検証・アクセス制御は本物を通す。検索の `pg_trgm` も本物で効く

### 何を確かめるか

土台は `createTwoUsers()`。alice と bob がそれぞれプレートを持ち、どちらのプレートにも同じ名前のサンプルのドロップと観察がある。alice としてログインし、bob のものに触れないことを確かめる。

- プレート（`tests/integration/plates.test.ts`）: 一覧・詳細・検索（部分一致と、似ているもの）に bob のプレートが出ない。bob のプレートを直せない、ゴミ箱に移せない、戻せない、完全に消せない。bob のタイプやテンプレートでプレートを作れない、取り込めない、付けられない。DB に直接入っていても、bob のテンプレートを指すプレートは開けない
- ドロップと観察（`drops.test.ts`）: bob のウェルにドロップを足せない。bob のドロップを直せない、消せない。観察を足せない、消せない。自分のプレートでも、ゴミ箱に入っていれば変えられない
- サンプル（`samples.test.ts`）: 一覧と見た目に bob のものが出ない。名前の変更とまとめるときに、bob の同じ名前のドロップは変わらない。bob にしか無い名前に変えても、まとめる確認は出ない
- 条件とプレートタイプ（`conditions.test.ts`）: 一覧は共有と自分のものだけ。共有や bob のテンプレート・セット・タイプは消せない。bob のテンプレートでセットを作れない。自分のテンプレートでも、bob のプレートやセットが使っていれば消せない。テンプレートの中身は、共有と自分のものだけ読め、自分のものだけ置き換えられる

テストが穴を見つけられることも確かめた。`lib/access-control.ts` の持ち主の条件をわざと外すと、31件のうち14件が落ちる。

### 流し方

- `npm run test:integration` で流す。`npm run test` には入れない（DB が要るため）
- `npm run check` には入れる。`build` がもともと `prisma migrate deploy` で DB に繋ぐので、`check` を流すには今でもローカルの Supabase が要る

## タスク

- [x] `vitest.integration.config.mts`・`tests/integration/global-setup.ts`・`setup.ts`・`fixtures.ts`
- [x] `tests/integration/plates.test.ts`・`drops.test.ts`・`samples.test.ts`・`conditions.test.ts`
- [x] `package.json`・`vitest.config.mts`・`README.md`・`docs/architecture.md`

## 確認

`npm run check` が通る。

## 結果
