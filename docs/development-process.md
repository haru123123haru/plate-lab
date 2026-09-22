# PLATE LAB — ゼロからの作成工程ガイド

## このドキュメントについて

DNA結晶化プレート管理アプリ「PLATE LAB」の全作成工程を、
**これを読めば一から作れる**レベルで詳しく解説したガイド。

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術スタック選定の理由](#2-技術スタック選定の理由)
3. [Phase 0: プロジェクト初期化](#3-phase-0-プロジェクト初期化)
4. [Phase 1: デザイン & データモデル設計](#4-phase-1-デザイン--データモデル設計)
5. [Phase 2: UI 実装（フロントエンド）](#5-phase-2-ui-実装フロントエンド)
6. [Phase 3: 認証 & バックエンド](#6-phase-3-認証--バックエンド)
7. [Phase 4: バリデーション・QRコード・検索](#7-phase-4-バリデーションqrコード検索)
8. [Phase 5: セキュリティ強化](#8-phase-5-セキュリティ強化)
9. [Phase 6: 本番デプロイ](#9-phase-6-本番デプロイ)
10. [アーキテクチャ解説](#10-アーキテクチャ解説)
11. [学んだ教訓](#11-学んだ教訓)

---

## 1. プロジェクト概要

### 何を作ったか

研究室でDNA結晶化実験に使う「プレート」を管理するWebアプリ。

**課題**: 研究室には何百枚ものプレートがあり、「あの条件で作ったプレートはどれだっけ？」と探すのが大変。

**解決策**:
- Webアプリでプレート情報を登録・検索
- QRコードを印刷してプレートに貼付
- スマホでQRコードを読み取れば即座に詳細情報にアクセス

### 管理対象のプレート

| 種類 | ウェル数 | 作り方 |
|------|---------|--------|
| Hanging Drop | 24穴（4×6） | 手動 |
| Sitting Drop | 96穴（8×12） | ロボット |
| Sitting Manual | 96穴（8×12） | 手動 |

### 主要機能

- ユーザー登録・ログイン（メール + Google OAuth）
- プレートの CRUD（作成・一覧・詳細・編集・削除）
- ウェルマップの視覚的表示（色分け: 空/充填/結晶/沈殿/透明）
- 条件テンプレートの管理（PEG / MPD スクリーニングセット）
- QRコード生成 & ダウンロード
- キーワード検索（プレート名、サンプル名、条件等）
- 多言語対応（日本語 / 英語）
- ダークモード対応

---

## 2. 技術スタック選定の理由

```
Next.js 16      — フルスタックフレームワーク。Server Components + Server Actions で
                   フロント・バックエンドを1つのプロジェクトで管理。

Tailwind v4     — ユーティリティファースト CSS。デザイントークンとの相性が良い。
                   v4 から CSS-first の設定方式に変更。

shadcn/ui       — UIコンポーネントライブラリ。コードがプロジェクトに直接コピーされるので
                   カスタマイズが自由自在。Button, Dialog, Sheet 等を使用。

TypeScript      — 型安全。Prisma の自動生成型と合わせてバグを防止。

Prisma 7        — ORM。TypeScriptの型とDBスキーマが自動同期。
                   v7 から PrismaPg adapter が必須に。

Supabase        — PostgreSQL + Auth + Realtime のBaaS。
                   無料プランで PostgreSQL と認証が使える。

Vercel          — Next.js のデプロイ先。GitHub 連携で自動デプロイ。
                   無料プランでサーバーレス環境が使える。

react-qr-code  — QRコード生成。SVG ベースで軽量。
Zod v4          — バリデーション。TypeScript の型と統合。
```

---

## 3. Phase 0: プロジェクト初期化

### 3.1 Next.js プロジェクト作成

```bash
npx create-next-app@latest plate-manage-app
```

選択肢:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **No**
- App Router: **Yes**
- Turbopack: **Yes**

### 3.2 追加パッケージのインストール

```bash
# UI コンポーネント
npx shadcn@latest init
npx shadcn@latest add button input label card dialog sheet tabs badge separator switch

# DB & ORM
npm install prisma @prisma/client @prisma/adapter-pg

# 認証
npm install @supabase/supabase-js @supabase/ssr

# QRコード
npm install react-qr-code

# バリデーション
npm install zod

# アイコン
npm install lucide-react

# ユーティリティ（shadcn が自動で追加）
npm install clsx tailwind-merge
```

### 3.3 Supabase ローカル環境

```bash
# Supabase CLI インストール（npx でも使える）
npx supabase init
npx supabase start
```

これで以下が起動する:
- PostgreSQL (port 54322)
- Auth Server (port 54321)
- Studio（DB管理画面, port 54323）

### 3.4 Prisma 初期化

```bash
npx prisma init
```

生成されるファイル:
- `prisma/schema.prisma` — スキーマ定義
- `prisma.config.ts` — Prisma 設定（v7 で追加）
- `.env` — 環境変数

### 3.5 ディレクトリ構成（最終形）

```
plate-manage-app/
├── app/                          # Next.js App Router
│   ├── (app)/                    # 認証必須のページグループ
│   │   ├── page.tsx              # / ダッシュボード
│   │   ├── dashboard-client.tsx
│   │   ├── layout.tsx
│   │   ├── plates/[id]/          # /plates/:id プレート詳細
│   │   ├── samples/              # /samples サンプル一覧
│   │   ├── mypage/               # /mypage マイページ
│   │   │   └── edit/             # /mypage/edit プロフィール編集
│   │   └── settings/             # /settings 設定
│   ├── (auth)/                   # 未認証向けページグループ
│   │   ├── login/                # /login ログイン
│   │   └── register/             # /register 新規登録
│   ├── auth/callback/            # /auth/callback OAuth コールバック
│   ├── layout.tsx                # ルートレイアウト
│   └── globals.css               # グローバルCSS & デザイントークン
├── components/                   # 共通コンポーネント
│   ├── ui/                       # shadcn/ui コンポーネント
│   ├── fab-button.tsx            # フローティングアクションボタン
│   ├── list-row.tsx              # リスト行
│   ├── page-header.tsx           # ページヘッダー
│   ├── plate-card.tsx            # プレートカード
│   ├── search-bar.tsx            # 検索バー
│   ├── well-grid.tsx             # 96ウェルグリッド
│   ├── well-grid-24.tsx          # 24ウェルグリッド
│   └── ...
├── lib/                          # ロジック層
│   ├── actions/                  # Server Actions
│   │   ├── auth.ts               # 認証（signUp, signIn, signOut, signInWithGoogle）
│   │   ├── plates.ts             # プレートCRUD + 検索
│   │   ├── wells.ts              # ウェル更新
│   │   ├── plate-types.ts        # プレート種別管理
│   │   ├── condition-templates.ts # 条件テンプレート管理
│   │   ├── settings.ts           # ユーザー設定
│   │   └── user.ts               # ユーザー情報更新
│   ├── supabase/                 # Supabase クライアント
│   │   ├── client.ts             # ブラウザ用
│   │   ├── server.ts             # サーバー用
│   │   └── middleware.ts         # 認証ミドルウェア
│   ├── auth.ts                   # getCurrentUserId() ヘルパー
│   ├── prisma.ts                 # Prisma Client インスタンス
│   ├── validations.ts            # Zod スキーマ
│   ├── i18n.ts                   # 国際化（100+ キー × 2言語）
│   └── utils.ts                  # cn() ヘルパー
├── prisma/
│   ├── schema.prisma             # DBスキーマ定義
│   ├── migrations/               # マイグレーションファイル
│   └── seed.ts                   # 開発用シードデータ
├── supabase/
│   ├── config.toml               # ローカルSupabase設定
│   └── migrations/               # 本番用マイグレーション
├── conditions/                   # 条件テンプレートデータ（Markdown）
│   ├── peg.md                    # PEGスクリーニング 96ウェル
│   └── mpd.md                    # MPDスクリーニング 96ウェル
├── proxy.ts                      # Next.js ミドルウェアエントリ
├── prisma.config.ts              # Prisma CLI設定
├── next.config.ts                # Next.js設定
└── package.json
```

---

## 4. Phase 1: デザイン & データモデル設計

### 4.1 デザインシステム

モバイルファースト（402px 基準幅）で設計。
CSS変数でデザイントークンを定義し、全コンポーネントで統一的に使用。

**`app/globals.css` に定義するトークン:**

```css
@theme {
  /* 背景色 */
  --color-bg-primary: #F5F5F5;    /* アプリ全体の背景 */
  --color-bg-surface: #FFFFFF;     /* カード・シートの背景 */

  /* テキスト色 */
  --color-text-primary: #000000;   /* メインテキスト */
  --color-text-secondary: #999999; /* 補助テキスト */
  --color-text-tertiary: #C4C4C4;  /* プレースホルダー等 */
  --color-text-disabled: #E5E5E5;  /* 無効テキスト */

  /* ボーダー */
  --color-border-default: #E5E5E5; /* 通常のボーダー */
  --color-border-strong: #000000;  /* 強調ボーダー */
  --color-border-subtle: #F5F5F5;  /* 控えめなボーダー */

  /* アクセント */
  --color-accent-positive: #34A853; /* 成功・結晶 */
  --color-accent-negative: #D93025; /* エラー・削除 */
}
```

**使い方（Tailwind クラス）:**
```html
<!-- ハードコード色は使わない -->
<div class="bg-bg-primary text-text-primary">     <!-- ○ 正しい -->
<div class="bg-gray-100 text-black">              <!-- × 間違い -->
```

**ダークモード:** CSS変数を `.dark` クラスで上書き。

### 4.2 データモデル設計

要件定義から以下のモデルを設計:

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

// ============================
// ユーザー関連
// ============================

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  name         String
  role         String?                    // 職位
  organization String?                   // 所属組織
  bio          String?       @db.Text     // 自己紹介
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  plates       Plate[]                    // 所有プレート
  plateTypes   PlateType[]                // カスタムプレート種別
  settings     UserSettings?             // 1対1 設定
}

model UserSettings {
  id              Int      @id @default(autoincrement())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  language        String   @default("en")     // en | ja
  appearance      String   @default("light")  // light | dark | system
  notifNewPlate   Boolean  @default(true)
  notifStatus     Boolean  @default(true)
  notifReminder   Boolean  @default(false)
}

// ============================
// プレート関連
// ============================

enum PlateStatus {
  ACTIVE
  ARCHIVED
}

enum WellStatus {
  FILLED
  EMPTY
  CRYSTAL
  PRECIPITATE
  CLEAR
}

model PlateType {
  id          Int      @id @default(autoincrement())
  name        String                     // "96 Well - Sitting"
  wellCount   Int                        // 24 or 96
  description String?
  isDefault   Boolean  @default(false)   // デフォルト種別かカスタムか
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  plates      Plate[]
}

model Plate {
  id                    Int       @id @default(autoincrement())
  name                  String                  // "Plate A-001"
  status                PlateStatus @default(ACTIVE)
  sampleName            String?                 // "Lysozyme"
  notes                 String?   @db.Text
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // リレーション
  plateTypeId           Int
  plateType             PlateType @relation(fields: [plateTypeId], references: [id])
  userId                String
  user                  User      @relation(fields: [userId], references: [id])

  // 条件テンプレート（リザーバー＆スクリーニング）
  reservoirTemplateId   Int?
  reservoirTemplate     ConditionTemplate? @relation("reservoir", ...)
  screeningTemplateId   Int?
  screeningTemplate     ConditionTemplate? @relation("screening", ...)

  wells                 Well[]    // ウェル一覧
}

model Well {
  id            Int        @id @default(autoincrement())
  position      String                    // "A1", "H12"
  row           Int
  col           Int
  status        WellStatus @default(EMPTY)

  // 条件データ（充填時に設定）
  protein       String?
  concentration String?
  buffer        String?
  ph            String?
  precipitant   String?
  notes         String?    @db.Text

  plateId       Int
  plate         Plate      @relation(fields: [plateId], references: [id], onDelete: Cascade)
}

// ============================
// 条件テンプレート関連
// ============================

model ConditionTemplate {
  id          Int             @id @default(autoincrement())
  name        String                    // "PEG", "MPD"
  description String?
  wells       TemplateWell[]           // テンプレート内のウェル条件
  // ...（Plate とのリレーション省略）
}

model TemplateWell {
  id          Int               @id @default(autoincrement())
  position    String                    // "A1"
  composition String                    // JSON: {"salt":"...","precipitant":"..."}
  templateId  Int
  template    ConditionTemplate @relation(fields: [templateId], references: [id])
}

model ConditionSet {
  id                    Int     @id @default(autoincrement())
  name                  String
  isDefault             Boolean @default(false)
  reservoirTemplateId   Int
  screeningTemplateId   Int
  // ...（ConditionTemplate とのリレーション）
}
```

### 4.3 マイグレーション実行

```bash
# マイグレーション生成＆適用
npx prisma migrate dev --name init

# Prisma Client 生成
npx prisma generate
```

---

## 5. Phase 2: UI 実装（フロントエンド）

### 5.1 設計パターン: Server Component + Client Component

**基本ルール:**
```
Server Component（page.tsx）
  └─ DBからデータ取得（Server Actions）
  └─ データを props で渡す
      └─ Client Component（xxx-client.tsx）
          └─ ユーザーインタラクション（onClick, useState 等）
```

**具体例 — ダッシュボードページ:**

```tsx
// app/(app)/page.tsx — Server Component
// DBからデータ取得して Client に渡す
export default async function DashboardPage() {
  const plates = await getPlates();
  const plateTypes = await getPlateTypes();
  // ... データを UI 形式に変換
  return <DashboardClient plates={plates} plateTypes={plateTypes} />;
}
```

```tsx
// app/(app)/dashboard-client.tsx — Client Component
"use client";
export default function DashboardClient({ plates, plateTypes }) {
  const [search, setSearch] = useState("");
  // ... ユーザーインタラクション
  return (
    <div>
      <SearchBar value={search} onChange={setSearch} />
      {plates.map(plate => <ListRow key={plate.id} ... />)}
    </div>
  );
}
```

### 5.2 共通コンポーネント

#### PageHeader — ページタイトル

```tsx
// components/page-header.tsx — Server Component（インタラクションなし）
export function PageHeader({ title, rightAction }) {
  return (
    <div className="flex items-center justify-between px-5 pt-14 pb-4
                    border-b border-border-default">
      <h1 className="text-xl font-bold text-text-primary">{title}</h1>
      {rightAction}
    </div>
  );
}
```

#### ListRow — リスト行

```tsx
// components/list-row.tsx — Client Component（onClick あり）
"use client";
export function ListRow({ icon: Icon, title, description, onClick, rightElement }) {
  return (
    <button type="button" onClick={onClick}
            className="flex items-center gap-3 w-full px-5 py-3 text-left ...">
      {Icon && <Icon className="w-5 h-5 text-text-secondary" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{title}</p>
        {description && <p className="text-xs text-text-secondary">{description}</p>}
      </div>
      {rightElement}
    </button>
  );
}
```

> **教訓**: `onClick` を受け取るコンポーネントは必ず `"use client"` が必要。
> Server Component から Client Component に関数（Lucideアイコン含む）を渡す場合、
> 親も Client Component にする必要がある。

#### WellGrid — ウェルマップ（96穴）

```tsx
// components/well-grid.tsx — Client Component
"use client";
export function WellGrid({ wells, onWellClick }) {
  // 8行 × 12列 のグリッドを描画
  // 各ウェルの status に応じて色を変える
  const getColor = (status) => {
    switch (status) {
      case "CRYSTAL":     return "bg-accent-positive";  // 緑
      case "PRECIPITATE": return "bg-accent-negative";  // 赤
      case "FILLED":      return "bg-text-primary";     // 黒
      case "CLEAR":       return "bg-blue-400";
      default:            return "bg-border-default";    // グレー
    }
  };
  // ...
}
```

#### FAB — フローティングアクションボタン

```tsx
// components/fab-button.tsx — Client Component
"use client";
export function FabButton({ onClick }) {
  return (
    // absolute + 親に relative でモバイルコンテナ内に制約
    // （fixed だとモバイルコンテナからはみ出す）
    <button type="button" onClick={onClick}
            className="absolute bottom-20 right-4 w-14 h-14 rounded-full
                       bg-text-primary text-bg-surface shadow-lg ...">
      <Plus className="w-6 h-6" />
    </button>
  );
}
```

> **教訓**: `fixed` ではなく `absolute` + 親に `relative` を使う。
> モバイルファーストで `max-w-[402px]` のコンテナ内に制約するため。

### 5.3 ルートレイアウト

```tsx
// app/layout.tsx
export default async function RootLayout({ children }) {
  // ユーザー設定を取得（言語、テーマ）
  const settings = await getUserSettings();
  const lang = settings?.language || "en";
  const appearance = settings?.appearance || "light";

  return (
    <html lang={lang} className={appearance === "dark" ? "dark" : ""}>
      <body>
        <LocaleProvider locale={lang}>
          {/* max-w-[402px] でモバイル幅に制約 */}
          <div className="mx-auto max-w-[402px] min-h-dvh bg-bg-primary relative">
            {children}
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
```

### 5.4 多言語対応（i18n）

```tsx
// lib/i18n.ts
const translations = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.samples": "Samples",
    "plate.details": "Plate Details",
    "well.status.crystal": "Crystal",
    // ... 100+ キー
  },
  ja: {
    "nav.dashboard": "ダッシュボード",
    "nav.samples": "サンプル",
    "plate.details": "プレート詳細",
    "well.status.crystal": "結晶",
    // ...
  },
};

// Context で言語を提供
// Client Component で useTranslation() フックで使用
export function useTranslation() {
  const { locale } = useContext(LocaleContext);
  const t = (key: string) => translations[locale]?.[key] || key;
  return { t, locale };
}
```

---

## 6. Phase 3: 認証 & バックエンド

### 6.1 Supabase Auth 設定

**3つのクライアントを作成:**

```tsx
// lib/supabase/client.ts — ブラウザ用
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts — サーバー用（Server Components, Server Actions）
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {} // Server Component からは書き込み不可
      },
    },
  });
}

// lib/supabase/middleware.ts — ミドルウェア用
export async function updateSession(request: NextRequest) {
  // セッションをリフレッシュ
  // 未認証ユーザーを /login にリダイレクト
  // /login, /register, /auth/callback は除外
}
```

### 6.2 ミドルウェア（認証ガード）

```tsx
// proxy.ts（Next.js のミドルウェアエントリ）
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**動作**: 全リクエストでセッション Cookie を検証。
未認証なら `/login` にリダイレクト。

### 6.3 認証 Server Actions

```tsx
// lib/actions/auth.ts
"use server";

export async function signUp(email: string, password: string, name: string) {
  // 1. Zod でバリデーション
  const parsed = signUpSchema.safeParse({ email, password, name });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // 2. Supabase Auth でユーザー作成
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // 3. Prisma に User レコード作成（Supabase User ID を使用）
  await prisma.user.create({
    data: { id: data.user!.id, email, name },
  });

  // 4. ダッシュボードにリダイレクト
  redirect("/");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getBaseUrl()}/auth/callback`,
    },
  });
  if (data.url) redirect(data.url);
}
```

### 6.4 OAuth コールバック

```tsx
// app/auth/callback/route.ts
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createClient();

  // 1. コードをセッションに交換
  const { data } = await supabase.auth.exchangeCodeForSession(code!);

  // 2. Prisma に User が存在しなければ作成
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

  // 3. ダッシュボードにリダイレクト
  return NextResponse.redirect(new URL("/", request.url));
}
```

**ポイント**: Supabase Auth の User ID と Prisma の User ID を同じにすることで、
認証ユーザーとDBデータが紐づく。

### 6.5 Server Actions パターン

全ての Server Action は同じパターンに従う:

```tsx
// lib/actions/plates.ts
"use server";

export async function getPlates() {
  // 1. 認証チェック（未認証なら /login にリダイレクト）
  const userId = await getCurrentUserId();

  // 2. 自分のデータのみ取得
  return prisma.plate.findMany({
    where: { userId },
    include: { plateType: true, wells: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPlate(input: CreatePlateInput) {
  // 1. 認証チェック
  const userId = await getCurrentUserId();

  // 2. バリデーション
  const parsed = createPlateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // 3. DB操作
  const plate = await prisma.plate.create({
    data: {
      ...parsed.data,
      userId,
      wells: {
        create: generateWells(rows, cols, filledPositions),
      },
    },
  });

  return { plate };
}
```

### 6.6 ウェル自動生成ロジック

プレート作成時にウェルを自動生成:

```tsx
function generateWells(rows: number, cols: number, filledPositions: Set<string>) {
  const wells = [];
  const rowLabels = "ABCDEFGH";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const position = `${rowLabels[r]}${c + 1}`; // "A1", "B3", "H12"
      wells.push({
        position,
        row: r,
        col: c,
        status: filledPositions.has(position) ? "FILLED" : "EMPTY",
      });
    }
  }
  return wells;
}

// 24穴: 4行(A-D) × 6列(1-6) = 24 ウェル
// 96穴: 8行(A-H) × 12列(1-12) = 96 ウェル
```

---

## 7. Phase 4: バリデーション・QRコード・検索

### 7.1 Zod バリデーション

```tsx
// lib/validations.ts
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
  // ...
});
```

> **注意**: Zod v4 ではエラーは `.errors` ではなく `.issues` でアクセスする。
> `parsed.error.issues[0].message`

### 7.2 QRコード生成 & ダウンロード

```tsx
// app/(app)/plates/[id]/plate-detail-client.tsx 内
import QRCode from "react-qr-code";

// ハイドレーションエラー防止: useEffect で URL を設定
const [qrUrl, setQrUrl] = useState(`/plates/${plate.id}`);
useEffect(() => {
  setQrUrl(`${window.location.origin}/plates/${plate.id}`);
}, [plate.id]);

// QRコード表示
<QRCode value={qrUrl} size={128} />

// ダウンロード機能（SVG → Canvas → PNG 変換）
function downloadQR() {
  const svg = document.querySelector("#qr-code svg");
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 512, 512);
    const link = document.createElement("a");
    link.download = `plate-${plate.id}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src = "data:image/svg+xml;base64," + btoa(new XMLSerializer().serializeToString(svg));
}
```

> **教訓**: `typeof window !== "undefined"` でURL設定するとハイドレーションエラーになる。
> `useState` + `useEffect` パターンを使う。

### 7.3 サーバーサイド検索

```tsx
// lib/actions/plates.ts
export async function searchPlates(query: string) {
  const userId = await getCurrentUserId();
  return prisma.plate.findMany({
    where: {
      userId,
      OR: [
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

**クライアント側のデバウンス（300ms）:**
```tsx
const timerRef = useRef<NodeJS.Timeout>();

const handleSearch = useCallback((query: string) => {
  setSearch(query);
  if (timerRef.current) clearTimeout(timerRef.current);

  if (!query.trim()) {
    setFilteredPlates(plates);  // 空なら全件表示
    return;
  }

  timerRef.current = setTimeout(async () => {
    const results = await searchPlates(query);
    setFilteredPlates(results);
  }, 300);  // 300ms 待ってからサーバーに問い合わせ
}, [plates]);
```

---

## 8. Phase 5: セキュリティ強化

### 8.1 Server Actions の認可チェック

全ての CRUD 操作で「自分のデータか」を確認:

```tsx
export async function updatePlate(id: number, data: UpdatePlateInput) {
  const userId = await getCurrentUserId();

  // 所有者チェック
  const plate = await prisma.plate.findUnique({ where: { id } });
  if (!plate || plate.userId !== userId) {
    throw new Error("Not found");
  }

  return prisma.plate.update({ where: { id }, data });
}
```

### 8.2 Row Level Security (RLS)

Supabase の PostgreSQL に RLS ポリシーを設定:

```sql
-- supabase/migrations/20260219_enable_rls.sql

-- 全テーブルで RLS を有効化
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Well" ENABLE ROW LEVEL SECURITY;
-- ...

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own data" ON "User"
  FOR SELECT USING (id = auth.uid()::text);

-- プレートは所有者のみ
CREATE POLICY "Users can view own plates" ON "Plate"
  FOR SELECT USING ("userId" = auth.uid()::text);

-- ウェルはプレート経由で認可
CREATE POLICY "Users can view own wells" ON "Well"
  FOR SELECT USING (
    "plateId" IN (SELECT id FROM "Plate" WHERE "userId" = auth.uid()::text)
  );
```

### 8.3 セキュリティヘッダー

```tsx
// next.config.ts
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};
```

---

## 9. Phase 6: 本番デプロイ

> 詳細は `docs/deployment-guide.md` と `docs/deployment-troubleshooting.md` を参照。

### 9.1 Supabase 本番環境

```bash
# 1. CLIでログイン
npx supabase login

# 2. 本番プロジェクトにリンク
npx supabase link --project-ref <PROJECT_REF>

# 3. DBスキーマを適用
npx supabase db push

# 4. Auth設定（Google OAuth等）を反映
#    config.toml の redirect_uri を本番用に一時変更してから push
npx supabase config push
```

### 9.2 Vercel 本番環境

```bash
# 1. CLIでログイン
npx vercel login

# 2. プロジェクトをリンク
npx vercel link

# 3. 環境変数を設定（4つ必須）
#    値は Supabase Dashboard から正確にコピー
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add DATABASE_URL production      # Transaction Pooler (port 6543)
npx vercel env add DIRECT_URL production        # Session Pooler (port 5432)

# 4. デプロイ
npx vercel --prod
```

### 9.3 Google Cloud Console

OAuth 2.0 クライアントに本番リダイレクト URI を追加:
```
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

---

## 10. アーキテクチャ解説

### 10.1 全体のデータフロー

```
ブラウザ
  │
  ├── ページ表示 ──────▶ Server Component (page.tsx)
  │                        └── Server Action 呼び出し
  │                            └── getCurrentUserId() で認証確認
  │                                └── Prisma でDB問い合わせ
  │                                    └── Supabase PostgreSQL (Pooler 経由)
  │                        └── データを Client Component に props で渡す
  │
  ├── ユーザー操作 ────▶ Client Component (xxx-client.tsx)
  │                        └── ボタンクリック等
  │                            └── Server Action 直接呼び出し
  │                                └── DB操作 → 結果返却
  │
  └── 認証 ────────────▶ Supabase Auth
                           └── JWT Cookie でセッション管理
                           └── Middleware で全リクエスト検証
```

### 10.2 ファイル命名規則

| パターン | 例 | 意味 |
|---------|-----|------|
| `page.tsx` | `app/(app)/page.tsx` | Server Component。DBアクセスしてデータ取得 |
| `xxx-client.tsx` | `dashboard-client.tsx` | Client Component。UIインタラクション |
| `layout.tsx` | `app/(app)/layout.tsx` | 共通レイアウト |
| `route.ts` | `app/auth/callback/route.ts` | API Route |
| `(group)/` | `(app)/`, `(auth)/` | URL に影響しないルートグループ |

### 10.3 `"use client"` が必要なケース

```
必要:
  ✓ onClick, onChange 等のイベントハンドラがある
  ✓ useState, useEffect, useRef 等のフックを使う
  ✓ ブラウザ API（window, document）を使う
  ✓ 親から関数（Lucideアイコン含む）を props で受け取る

不要:
  ✗ データ表示のみ（テキスト、画像）
  ✗ Server Action の呼び出しのみ（async/await で直接呼べる）
  ✗ レイアウト（children を表示するだけ）
```

---

## 11. 学んだ教訓

### コンポーネント設計

| 教訓 | 詳細 |
|------|------|
| **`"use client"` の判断** | onClick や useState があれば必須。Server Component から関数 props を渡す場合、親も Client にする |
| **`type="button"` 必須** | `<button>` には必ず付ける。フォーム内だとデフォルトで submit になる |
| **`fixed` vs `absolute`** | モバイルコンテナ内の固定要素は `absolute` + 親 `relative`。`fixed` はビューポート基準になりはみ出す |
| **デザイントークン** | `bg-black` → `bg-text-primary` のようにCSS変数を使う。ダークモード対応が楽になる |

### Prisma 7

| 教訓 | 詳細 |
|------|------|
| **schema.prisma から url 削除** | v7 では `prisma.config.ts` に移動。ビルドエラーの原因になる |
| **adapter-pg 必須** | `PrismaPg` アダプター経由でクライアント初期化。`@prisma/adapter-pg` をインストール |
| **import パス変更** | `@prisma/client` → `generated/prisma/client`（相対パス） |

### Supabase + Vercel デプロイ

| 教訓 | 詳細 |
|------|------|
| **Pooler ホスト名** | `aws-0` vs `aws-1` 等、推測禁止。Dashboard からコピー |
| **IPv4 制約** | Free版の直接接続は IPv6 のみ。Vercel では Pooler 必須 |
| **環境変数の検証** | 長い値はスペース混入に注意。設定後は `vercel env pull` で確認 |
| **Zod v4** | エラーは `.errors` ではなく `.issues` |
| **ハイドレーション** | `typeof window` チェックではなく `useState` + `useEffect` パターン |

---

## 参考リンク

- [Next.js App Router ドキュメント](https://nextjs.org/docs/app)
- [Prisma 7 アップグレードガイド](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Supabase Auth + Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [shadcn/ui コンポーネント](https://ui.shadcn.com/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
