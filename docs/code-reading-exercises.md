# PLATE LAB コードリーディング演習

## この教材について

PLATE LAB のコードを読みながら、Next.js フルスタック開発のパターンを学ぶ演習問題集。
各章は「読む → 理解を確認 → 手を動かす」の3ステップで構成されている。

**前提知識**: HTML/CSS、JavaScript の基本、React の基礎（JSX、useState）
**学習時間目安**: 全8章で約6〜8時間

---

## 目次

| 章 | テーマ | 難易度 |
|----|--------|--------|
| 1 | [ルーティングとページ構成](#chapter-1) | ★☆☆ |
| 2 | [Server Component と Client Component](#chapter-2) | ★★☆ |
| 3 | [レイアウトとデザインシステム](#chapter-3) | ★☆☆ |
| 4 | [認証の仕組み](#chapter-4) | ★★★ |
| 5 | [Server Actions と DB 操作](#chapter-5) | ★★★ |
| 6 | [フォームとバリデーション](#chapter-6) | ★★☆ |
| 7 | [セキュリティ](#chapter-7) | ★★★ |
| 8 | [実践課題：新機能を追加してみよう](#chapter-8) | ★★★ |

---

<a id="chapter-1"></a>
## Chapter 1: ルーティングとページ構成

### 学ぶこと

Next.js App Router では、フォルダ構造がそのまま URL になる。

### 読むファイル

`app/` ディレクトリの構成を確認しよう：

```
app/
├── (app)/                  ← ルートグループ（URLに影響しない）
│   ├── page.tsx            ← /
│   ├── plates/[id]/
│   │   └── page.tsx        ← /plates/123
│   ├── samples/
│   │   └── page.tsx        ← /samples
│   ├── mypage/
│   │   ├── page.tsx        ← /mypage
│   │   └── edit/
│   │       └── page.tsx    ← /mypage/edit
│   └── settings/
│       └── page.tsx        ← /settings
├── (auth)/
│   ├── login/
│   │   └── page.tsx        ← /login
│   └── register/
│       └── page.tsx        ← /register
└── auth/callback/
    └── route.ts            ← /auth/callback（API Route）
```

### 理解チェック問題

**Q1-1**: `(app)` と `(auth)` のフォルダ名に括弧が付いている理由は？
<details>
<summary>答え</summary>

**ルートグループ**と呼ばれる仕組み。括弧で囲んだフォルダ名は URL に反映されない。
`(app)/page.tsx` は `/app` ではなく `/` になる。
用途は「レイアウトやミドルウェアの適用範囲を分ける」こと。
認証済みページ群 `(app)` と未認証ページ群 `(auth)` で異なるレイアウトを使える。
</details>

**Q1-2**: `/plates/42` にアクセスした時、どのファイルが表示されるか？`[id]` は何を意味するか？
<details>
<summary>答え</summary>

`app/(app)/plates/[id]/page.tsx` が表示される。
`[id]` は**動的ルートセグメント**で、URL の一部をパラメータとして受け取る。
`/plates/42` なら `params.id = "42"` として取得できる。
</details>

**Q1-3**: `page.tsx` と `route.ts` の違いは？
<details>
<summary>答え</summary>

- `page.tsx` — **ページ**。React コンポーネントを返し、HTMLとして表示される
- `route.ts` — **API Route**。HTTP レスポンスを返す（GET, POST 等のハンドラ）
  `auth/callback/route.ts` は OAuth コールバックを処理する API エンドポイント
</details>

### 演習

**E1-1**: `app/(app)/samples/page.tsx` を開いて、このページが `/samples` として表示される理由をフォルダ構造から説明してみよう。

**E1-2**: 新しいページ `/about` を作りたい場合、どのパスにファイルを作成すればよいか？認証なしでアクセスできるようにするにはどうするか？

<details>
<summary>ヒント</summary>

認証不要なら `(auth)` グループに入れるか、`app/about/page.tsx` として独立させる。
ミドルウェア（`proxy.ts`）で `/about` を認証チェックから除外する必要もある。
</details>

---

<a id="chapter-2"></a>
## Chapter 2: Server Component と Client Component

### 学ぶこと

Next.js App Router の最重要概念。コンポーネントは2種類ある：
- **Server Component**: サーバーで実行。DB アクセスができる。`"use client"` なし
- **Client Component**: ブラウザで実行。イベントハンドラが使える。`"use client"` あり

### 読むファイル

**ファイル①**: `app/(app)/page.tsx`（Server Component）

```tsx
// "use client" がない → Server Component
import { getPlates } from "@/lib/actions/plates";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  // サーバーで直接 DB にアクセスできる
  const [plates, plateTypes, ...] = await Promise.all([
    getPlates(),
    getPlateTypes(),
    // ...
  ]);

  // データを整形して Client Component に渡す
  const uiPlates = plates.map((p) => ({
    id: p.id,
    name: p.name,
    // ...
  }));

  return <DashboardClient plates={uiPlates} plateTypes={uiPlateTypes} />;
}
```

**ファイル②**: `app/(app)/dashboard-client.tsx`（Client Component）

```tsx
"use client"; // ← この1行で Client Component になる

import { useState, useCallback, useRef } from "react";

export function DashboardClient({ plates, plateTypes }) {
  // useState はクライアントでしか使えない
  const [search, setSearch] = useState("");
  const [isNewPlateOpen, setIsNewPlateOpen] = useState(false);

  // onClick もクライアントでしか動かない
  return (
    <div>
      <SearchBar value={search} onChange={handleSearch} />
      <FabButton onClick={() => setIsNewPlateOpen(true)} />
    </div>
  );
}
```

### 理解チェック問題

**Q2-1**: `page.tsx` に `"use client"` が書かれていないのはなぜ？
<details>
<summary>答え</summary>

`page.tsx` は Server Component。`async function` で DB に直接アクセスしている。
もし `"use client"` を付けると `await getPlates()` が動かなくなる
（Server Actions はサーバー側で実行されるため）。
</details>

**Q2-2**: `page.tsx` で取得したデータをなぜわざわざ `uiPlates` に変換してから渡しているのか？
<details>
<summary>答え</summary>

Server → Client の境界ではデータが**シリアライズ（JSON変換）**される。
Prisma のモデルオブジェクトにはメソッドや循環参照が含まれる可能性があるので、
プレーンなオブジェクト（POJOs）に変換してから渡す必要がある。
また、Client Component に必要なデータだけに絞ることでパフォーマンスも良くなる。
</details>

**Q2-3**: 以下のコードはエラーになる。なぜか？

```tsx
// components/page-header.tsx（"use client" なし = Server Component）
export function PageHeader({ title, onBack }) {
  return (
    <div>
      <button onClick={onBack}>戻る</button>  // ← ここでエラー
      <h1>{title}</h1>
    </div>
  );
}
```

<details>
<summary>答え</summary>

`onClick` はブラウザのイベントハンドラなので、Server Component では使えない。
解決策は2つ：
1. `"use client"` を付けて Client Component にする
2. `onBack` を使わない設計にする（例: `<Link href="/back">` でページ遷移）
</details>

### 演習

**E2-1**: `components/` フォルダの全コンポーネントを確認して、`"use client"` が付いているものと付いていないものを分類してみよう。なぜその違いがあるのか、各ファイルの中身を見て理由を考えてみよう。

**E2-2**: `components/fab-button.tsx` を開いて、このコンポーネントが `"use client"` である理由を確認しよう。もし `"use client"` を削除したらどうなるか予想してみよう。

---

<a id="chapter-3"></a>
## Chapter 3: レイアウトとデザインシステム

### 学ぶこと

- `layout.tsx` によるネストレイアウト
- CSS変数によるデザイントークンの仕組み

### 読むファイル

**ファイル①**: `app/layout.tsx`（ルートレイアウト）

```tsx
export default async function RootLayout({ children }) {
  const settings = await getUserSettings();
  const lang = settings?.language || "en";
  const appearance = settings?.appearance || "light";

  return (
    <html lang={lang} className={appearance === "dark" ? "dark" : ""}>
      <body className="bg-bg-primary">
        <LocaleProvider locale={lang}>
          {/* ここが全ページ共通のラッパー */}
          <div className="mx-auto max-w-[402px] min-h-dvh bg-bg-primary relative">
            {children}  {/* ← ここに各ページが入る */}
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
```

**ファイル②**: `app/(app)/layout.tsx`（認証済みページのレイアウト）

```tsx
export default function AppLayout({ children }) {
  return (
    <div className="pb-16">
      {children}
      <TabBar />  {/* ← 認証済みページにだけタブバーが表示される */}
    </div>
  );
}
```

**ファイル③**: `app/globals.css`（デザイントークン）

```css
@theme {
  --color-bg-primary: #F5F5F5;
  --color-text-primary: #000000;
  --color-accent-positive: #34A853;
  /* ... */
}
```

### 理解チェック問題

**Q3-1**: `/settings` ページを表示する時、レイアウトはどの順番で適用されるか？

<details>
<summary>答え</summary>

```
app/layout.tsx（ルート: html, body, max-w-[402px] ラッパー）
  └─ app/(app)/layout.tsx（タブバー付きレイアウト）
      └─ app/(app)/settings/page.tsx（設定ページの中身）
```

レイアウトはネスト（入れ子）される。外側から順に適用される。
</details>

**Q3-2**: `/login` ページにタブバーが表示されないのはなぜ？

<details>
<summary>答え</summary>

`/login` は `(auth)` グループに属している。
`TabBar` は `(app)/layout.tsx` にのみ含まれるので、
`(auth)` グループのページには表示されない。
これがルートグループの実用的な使い方。
</details>

**Q3-3**: `bg-bg-primary` という Tailwind クラスは標準では存在しない。なぜ使えるのか？

<details>
<summary>答え</summary>

`app/globals.css` の `@theme` ブロックで `--color-bg-primary` を定義しているため。
Tailwind v4 は CSS 変数を自動的にユーティリティクラスに変換する。
`--color-bg-primary: #F5F5F5` → `bg-bg-primary` が使えるようになる。
</details>

### 演習

**E3-1**: `app/globals.css` を開いて定義されているデザイントークンを全て書き出してみよう。各トークンがアプリのどこで使われているか、2つ以上のファイルで使用例を探してみよう。

**E3-2**: `max-w-[402px]` を `max-w-[768px]` に変更したら見た目はどう変わるか？このアプリが 402px に設定されている理由を考えてみよう。

---

<a id="chapter-4"></a>
## Chapter 4: 認証の仕組み

### 学ぶこと

認証は複数のファイルが連携して動く。全体の流れを理解する。

### 読むファイル

**ファイル①**: `lib/supabase/middleware.ts`（認証ガード）

```tsx
export async function updateSession(request: NextRequest) {
  // 1. Supabase クライアントを作成（Cookie ベース）
  const supabase = createServerClient(URL, KEY, {
    cookies: { /* Cookie の読み書き */ },
  });

  // 2. セッションをリフレッシュ（JWT の有効期限を延長）
  const { data: { user } } = await supabase.auth.getUser();

  // 3. 未認証ユーザーを /login にリダイレクト
  //    ただし /login, /register, /auth/callback は除外
  if (!user &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/register") &&
      !request.nextUrl.pathname.startsWith("/auth/callback")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
```

**ファイル②**: `lib/actions/auth.ts`（認証アクション）

```tsx
"use server";

export async function signUp(formData: FormData) {
  // 1. フォームデータを取得
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  // 2. Zod でバリデーション
  const parsed = signUpSchema.safeParse({ name, email, password });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // 3. Supabase Auth でユーザー作成
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  // 4. Prisma に User レコード作成（Auth の User ID を共有）
  await prisma.user.create({
    data: { id: data.user!.id, email, name },
  });

  redirect("/");
}
```

**ファイル③**: `app/auth/callback/route.ts`（OAuth コールバック）

```tsx
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createClient();

  // 1. Google から受け取ったコードをセッションに交換
  const { data, error } = await supabase.auth.exchangeCodeForSession(code!);

  // 2. Prisma に User が存在しなければ作成
  if (data?.user) {
    const existingUser = await prisma.user.findUnique({
      where: { id: data.user.id },
    });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata.full_name || "User",
        },
      });
    }
  }

  return NextResponse.redirect(new URL("/", request.url));
}
```

### 理解チェック問題

**Q4-1**: ユーザーが「Googleでログイン」ボタンを押してからダッシュボードが表示されるまで、何が起きるかを時系列で説明してみよう。

<details>
<summary>答え</summary>

```
1. ブラウザ: signInWithGoogle() を呼び出す
2. Supabase Auth: Google OAuth ページの URL を返す
3. ブラウザ: Google のログインページにリダイレクト
4. Google: ユーザーが認可 → Supabase にコールバック
5. Supabase: セッション作成 → アプリの /auth/callback にリダイレクト
6. route.ts: コードをセッションに交換
7. route.ts: Prisma で User レコードを確認/作成
8. route.ts: / にリダイレクト
9. middleware: Cookie のセッションを確認 → 有効なのでページ表示
10. page.tsx: getPlates() 等でデータ取得
11. ブラウザ: ダッシュボード表示
```
</details>

**Q4-2**: `signUp` 関数で `data.user!.id` を Prisma の User ID に使っている。なぜ独自の ID を生成せず Supabase の ID を共有するのか？

<details>
<summary>答え</summary>

Supabase Auth と Prisma DB で同じ ID を使うことで、
「認証ユーザー」と「DBユーザー」が常に紐づく。
もし別々の ID を使うと、マッピングテーブルが必要になり複雑化する。
また、RLS ポリシーで `auth.uid()` と DB の `userId` を比較できるので、
セキュリティ的にもシンプルになる。
</details>

**Q4-3**: ミドルウェアが `/login` へのリクエストをリダイレクトしないのはなぜ？もしリダイレクトしたらどうなるか？

<details>
<summary>答え</summary>

`/login` をリダイレクト対象にすると、未認証ユーザーが `/login` → `/login` → `/login`...
と**無限リダイレクトループ**に陥る。
ログインページ自体は認証なしでアクセスできなければならない。
</details>

### 演習

**E4-1**: `lib/supabase/middleware.ts` を開いて、リダイレクト除外されているパス一覧を確認しよう。新しく `/about`（公開ページ）を作る場合、ここに何を追加すべきか？

**E4-2**: `lib/actions/auth.ts` の `signUp` 関数を読んで、以下の順序が変わったらどうなるか考えてみよう：
- もし Prisma User 作成を先に、Supabase Auth を後にしたら？
- もし Supabase Auth 成功後に Prisma User 作成が失敗したら？

---

<a id="chapter-5"></a>
## Chapter 5: Server Actions と DB 操作

### 学ぶこと

Server Actions は「サーバー上で実行される関数」。
クライアントから直接呼び出せるが、実行はサーバーで行われる。

### 読むファイル

**ファイル①**: `lib/actions/plates.ts` の `createPlate`

```tsx
"use server";

export async function createPlate(input: {
  name: string;
  plateTypeId: string;
  sampleName?: string;
  // ...
}) {
  // 1. 認証チェック（未認証なら /login にリダイレクト）
  const userId = await getCurrentUserId();

  // 2. Zod でバリデーション
  const parsed = createPlateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // 3. プレート種別の情報を取得（ウェル数を決定するため）
  const plateType = await prisma.plateType.findUnique({
    where: { id: parseInt(parsed.data.plateTypeId) },
  });
  const wellCount = plateType?.wellCount ?? 96;
  const rows = wellCount === 24 ? 4 : 8;
  const cols = wellCount === 24 ? 6 : 12;

  // 4. ウェルを自動生成しながらプレートを作成
  const filledSet = new Set(parsed.data.filledPositions ?? []);
  const rowLabels = "ABCDEFGH";
  const wellsData = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pos = `${rowLabels[r]}${c + 1}`;
      wellsData.push({
        position: pos,
        row: r,
        col: c,
        status: filledSet.has(pos) ? "FILLED" : "EMPTY",
      });
    }
  }

  // 5. Prisma でトランザクション的に作成
  const plate = await prisma.plate.create({
    data: {
      name: parsed.data.name,
      userId,
      plateTypeId: parseInt(parsed.data.plateTypeId),
      sampleName: parsed.data.sampleName || null,
      wells: { create: wellsData },  // ← ネストした create（リレーション）
    },
    include: { wells: true, plateType: true },
  });

  return { plate };
}
```

**ファイル②**: `lib/actions/plates.ts` の `searchPlates`

```tsx
export async function searchPlates(query: string) {
  const userId = await getCurrentUserId();

  return prisma.plate.findMany({
    where: {
      userId,  // ← 自分のプレートのみ
      OR: [    // ← 複数フィールドを横断検索
        { name:       { contains: query, mode: "insensitive" } },
        { sampleName: { contains: query, mode: "insensitive" } },
        { notes:      { contains: query, mode: "insensitive" } },
        { plateType:  { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    include: { plateType: true, wells: true },
    orderBy: { createdAt: "desc" },
  });
}
```

### 理解チェック問題

**Q5-1**: `"use server"` をファイル先頭に書く意味は？これがないとどうなる？

<details>
<summary>答え</summary>

`"use server"` は、このファイルの全関数が**Server Action**であることを示す。
Client Component から `import { createPlate } from "@/lib/actions/plates"` として
インポートすると、関数呼び出しは自動的に HTTP リクエストに変換され、
サーバー上で実行される。

`"use server"` がないと、クライアントでの import 時にサーバー側のコード
（`prisma` 等）がバンドルに含まれようとしてビルドエラーになる。
</details>

**Q5-2**: `createPlate` で `wells: { create: wellsData }` と書いている。これは Prisma のどういう機能か？

<details>
<summary>答え</summary>

**ネストした create（Nested Write）**。1回の Prisma 呼び出しで、
Plate レコードと関連する全 Well レコードを同時に作成する。
96ウェルのプレートなら、1回のクエリで Plate 1件 + Well 96件 が作られる。
個別に INSERT するより効率的で、失敗時は全てロールバックされる。
</details>

**Q5-3**: `searchPlates` の `mode: "insensitive"` は何をしている？

<details>
<summary>答え</summary>

大文字・小文字を区別しない検索（Case-Insensitive）。
"Lysozyme" と "lysozyme" と "LYSOZYME" のどれでもヒットする。
</details>

**Q5-4**: `searchPlates` に `userId` 条件がある理由は？

<details>
<summary>答え</summary>

他のユーザーのプレートが検索結果に含まれないようにするため。
これがないと、全ユーザーのプレートが検索対象になり、
**情報漏洩（IDOR: Insecure Direct Object Reference）**になる。
</details>

### 演習

**E5-1**: `lib/actions/plates.ts` の `getPlates()` 関数を読んで、以下を確認しよう：
- どんな条件でプレートを取得しているか
- `include` で何のリレーションを含めているか
- 並び順は何で決まっているか

**E5-2**: 新しい Server Action `getPlateStats()` を設計してみよう（コードは書かなくてOK）。
この関数はユーザーのプレート統計（合計プレート数、アクティブ数、アーカイブ数、全ウェルの結晶化率）を返す。
どんな Prisma クエリが必要か考えてみよう。

<details>
<summary>ヒント</summary>

```tsx
export async function getPlateStats() {
  const userId = await getCurrentUserId();

  // 方法1: 複数クエリ
  const totalPlates = await prisma.plate.count({ where: { userId } });
  const activePlates = await prisma.plate.count({ where: { userId, status: "ACTIVE" } });

  // 方法2: groupBy
  const statusCounts = await prisma.plate.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  // ウェルの結晶化率は？
  // → Well を集計して CRYSTAL / 全FILLED の割合を計算
}
```
</details>

---

<a id="chapter-6"></a>
## Chapter 6: フォームとバリデーション

### 学ぶこと

ユーザー入力のバリデーション（検証）と、エラー表示の仕組み。

### 読むファイル

**ファイル①**: `lib/validations.ts`

```tsx
import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上必要です"),
});

export const createPlateSchema = z.object({
  name: z.string().min(1).max(200),
  plateTypeId: z.string().min(1),
  sampleName: z.string().max(200).optional(),
  reservoirTemplateId: z.number().nullable().optional(),
  screeningTemplateId: z.number().nullable().optional(),
  notes: z.string().max(2000).optional(),
  filledPositions: z.array(z.string()).optional(),
});
```

**ファイル②**: Server Action でのバリデーション使用（`lib/actions/auth.ts`）

```tsx
export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    // バリデーション失敗 → エラーメッセージを返す
    return { error: parsed.error.issues[0].message };
  }

  // parsed.data は型安全（TypeScript の型が自動推論される）
  // parsed.data.email は string 型が保証されている
}
```

### 理解チェック問題

**Q6-1**: `safeParse` と `parse` の違いは？なぜ `safeParse` を使っているのか？

<details>
<summary>答え</summary>

- `parse()` — バリデーション失敗時に**例外を投げる**（try-catch が必要）
- `safeParse()` — 失敗時に `{ success: false, error: ZodError }` を返す（例外なし）

Server Action ではユーザーに分かりやすいエラーメッセージを返したいので、
例外ではなく戻り値でエラーを返す `safeParse` が適している。
</details>

**Q6-2**: `z.string().optional()` と `z.string().nullable()` の違いは？

<details>
<summary>答え</summary>

- `.optional()` — 値が `undefined`（未入力）でもOK。型: `string | undefined`
- `.nullable()` — 値が `null` でもOK。型: `string | null`
- フォームで「入力しなかった」場合は `undefined`（optional）
- DB で「値がない」ことを表現する場合は `null`（nullable）
</details>

### 演習

**E6-1**: 以下のバリデーションスキーマを自分で書いてみよう：
- プレート名: 必須、1〜200文字
- メモ: 任意、最大2000文字
- ステータス: "ACTIVE" か "ARCHIVED" のどちらか
- ウェル数: 24 か 96 のどちらかの数値

<details>
<summary>答え</summary>

```tsx
const plateSchema = z.object({
  name: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
  wellCount: z.union([z.literal(24), z.literal(96)]),
});
```
</details>

**E6-2**: `components/new-plate-sheet.tsx` を開いて、バリデーションエラーがどのように表示されているか確認しよう。エラーメッセージはどこに表示される？ Server Action からどう受け取っている？

---

<a id="chapter-7"></a>
## Chapter 7: セキュリティ

### 学ぶこと

認証だけでは不十分。「認可」（このユーザーはこのデータにアクセスしていいか）も必要。

### 読むファイル

**ファイル①**: `lib/actions/plates.ts` の `updatePlate`

```tsx
export async function updatePlate(id: number, data: {...}) {
  const userId = await getCurrentUserId();

  // 所有者チェック: このプレートは自分のものか？
  const plate = await prisma.plate.findUnique({ where: { id } });
  if (!plate || plate.userId !== userId) {
    throw new Error("Not found");
  }

  return prisma.plate.update({ where: { id }, data });
}
```

**ファイル②**: `lib/actions/wells.ts` の `updateWell`

```tsx
export async function updateWell(id: number, data: {...}) {
  const userId = await getCurrentUserId();

  // ウェルの所有者チェック（Plate を経由して確認）
  const well = await prisma.well.findUnique({
    where: { id },
    include: { plate: { select: { userId: true } } },
  });
  if (!well || well.plate.userId !== userId) {
    throw new Error("Not found");
  }

  return prisma.well.update({ where: { id }, data });
}
```

### 理解チェック問題

**Q7-1**: もし `updatePlate` に所有者チェックがなかったら、どんな攻撃ができるか？

<details>
<summary>答え</summary>

**IDOR（Insecure Direct Object Reference）攻撃**。
他のユーザーのプレート ID を知っていれば（もしくは推測すれば）、
そのプレートの内容を勝手に変更できてしまう。
例: ブラウザの DevTools でリクエストを改ざんし、
`updatePlate(999, { name: "改ざん" })` と呼ぶだけで他人のデータを書き換え可能。
</details>

**Q7-2**: `updateWell` では `well.plate.userId` で所有者を確認している。なぜ `well.userId` ではないのか？

<details>
<summary>答え</summary>

`Well` モデルには `userId` フィールドがない（DB設計上、所有者は Plate に紐づく）。
ウェルの所有者を確認するには、親の Plate を経由する必要がある。
`include: { plate: { select: { userId: true } } }` でリレーションを辿っている。
</details>

**Q7-3**: エラーメッセージが `"Not found"` になっている理由は？`"Unauthorized"` ではないのはなぜ？

<details>
<summary>答え</summary>

セキュリティのベストプラクティス: **存在しないのか権限がないのかを区別させない**。
`"Unauthorized"` と返すと「このIDのリソースは存在するが権限がない」と分かり、
攻撃者にとって有用な情報になる。`"Not found"` なら区別がつかない。
</details>

### 演習

**E7-1**: `lib/actions/plates.ts` の全関数を確認して、`getCurrentUserId()` が呼ばれている関数と呼ばれていない関数を一覧にしよう。もし呼ばれていない関数があれば、それはセキュリティ上問題ないか考えてみよう。

**E7-2**: 新しい Server Action `deletePlate(id)` を書くとしたら、どんなチェックが必要か？疑似コードを書いてみよう。

<details>
<summary>答え</summary>

```tsx
export async function deletePlate(id: number) {
  // 1. 認証チェック
  const userId = await getCurrentUserId();

  // 2. 所有者チェック
  const plate = await prisma.plate.findUnique({ where: { id } });
  if (!plate || plate.userId !== userId) {
    throw new Error("Not found");
  }

  // 3. 削除（Well は onDelete: Cascade で自動削除される）
  await prisma.plate.delete({ where: { id } });

  // 4. リダイレクトまたはレスポンス
  redirect("/");
}
```
</details>

---

<a id="chapter-8"></a>
## Chapter 8: 実践課題 — 新機能を追加してみよう

### ここまでの知識を使って、実際にコードを書いてみる。

---

### 課題 A: プレートの「お気に入り」機能（難易度 ★★☆）

**要件**: ユーザーがプレートを「お気に入り」に登録/解除できるようにする。

**ステップ:**

1. **スキーマ設計**: `Plate` モデルに `isFavorite` フィールドを追加

```prisma
model Plate {
  // 既存フィールド...
  isFavorite Boolean @default(false)  // ← 追加
}
```

2. **マイグレーション**: `npx prisma migrate dev --name add-favorite`

3. **Server Action**: `toggleFavorite(plateId)` を作成
   - `getCurrentUserId()` で認証確認
   - 所有者チェック
   - `isFavorite` を反転

4. **UI**: プレートカードにハートアイコンを追加
   - クリックで `toggleFavorite` を呼び出す

**考えてみよう:**
- `toggleFavorite` ではどんなセキュリティチェックが必要か？
- UI は Server Component？Client Component？
- ダッシュボードにお気に入りフィルターを追加するにはどうする？

---

### 課題 B: プレートのコメント機能（難易度 ★★★）

**要件**: プレートにコメントを投稿・表示できるようにする。

**ステップ:**

1. **スキーマ設計**: 新しい `Comment` モデルを作成

```prisma
model Comment {
  id        Int      @id @default(autoincrement())
  content   String   @db.Text
  createdAt DateTime @default(now())

  plateId   Int
  plate     Plate    @relation(fields: [plateId], references: [id], onDelete: Cascade)

  userId    String
  user      User     @relation(fields: [userId], references: [id])
}
```

2. **バリデーション**: `commentSchema` を作成
   - content: 必須、1〜1000文字

3. **Server Actions**: 3つの関数を作成
   - `getComments(plateId)` — プレートのコメント一覧
   - `addComment(plateId, content)` — コメント追加（認証 + バリデーション）
   - `deleteComment(commentId)` — コメント削除（所有者チェック）

4. **UI**: プレート詳細ページにコメントセクションを追加

**考えてみよう:**
- `deleteComment` では、コメント自体の作成者だけでなく、プレートの所有者も削除できるべきか？
- コメント一覧は Server Component で取得する？それとも Client Component？
- `onDelete: Cascade` はここで正しいか？（プレートが削除されたらコメントも消えてOK？）

---

### 課題 C: ウェル一括編集機能（難易度 ★★★）

**要件**: 複数のウェルを一括でステータス変更できるようにする。

**ステップ:**

1. **UI**: ウェルグリッドに「選択モード」を追加
   - 複数のウェルをタップして選択
   - 選択後に「ステータス変更」ボタンを表示

2. **Server Action**: `updateWellsBatch(wellIds, status)` を作成
   - 認証チェック
   - **全ウェルの所有者チェック**（1つでも他人のウェルがあればエラー）
   - `prisma.well.updateMany()` で一括更新

**考えてみよう:**
- 所有者チェックはどう実装する？N回のクエリ？1回のクエリ？
- `updateMany` と個別の `update` ループ、どちらが良いか？
- 選択状態は `useState` で管理する？どんな型にする？

<details>
<summary>ヒント: 効率的な所有者チェック</summary>

```tsx
// 1回のクエリで全ウェルの所有者を確認
const wells = await prisma.well.findMany({
  where: { id: { in: wellIds } },
  include: { plate: { select: { userId: true } } },
});

// 全ウェルが自分のものか確認
const allOwned = wells.length === wellIds.length
  && wells.every(w => w.plate.userId === userId);

if (!allOwned) throw new Error("Not found");
```
</details>

---

## 付録: コードリーディングのコツ

### ファイルを読む順番

```
1. app/layout.tsx           ← アプリ全体の構造を理解
2. proxy.ts                 ← 認証のガードを理解
3. app/(app)/page.tsx       ← Server Component パターン
4. dashboard-client.tsx     ← Client Component パターン
5. lib/actions/plates.ts    ← Server Actions パターン
6. lib/prisma.ts            ← DB接続の仕組み
7. lib/supabase/*.ts        ← 認証の仕組み
8. components/*.tsx          ← UI パーツ
```

### 「なぜ？」を常に問う

コードを読む時は「何をしているか」だけでなく「**なぜそうしているか**」を考える。

```
× 「ここで userId をチェックしている」
○ 「なぜ userId をチェックするのか？ → 他人のデータを操作させないため」

× 「ここで safeParse を使っている」
○ 「なぜ parse ではなく safeParse なのか？ → エラーを例外ではなく戻り値で返すため」
```

### 変更してみる

理解を確認する一番の方法は、コードを変えて何が起きるか見ること。

```
- "use client" を削除 → 何がエラーになる？
- userId チェックを削除 → どんな脆弱性が生まれる？
- include を削除 → 何のデータが取れなくなる？
```

ただし、変更は**ローカル開発環境**で試すこと。本番には反映しないように。
