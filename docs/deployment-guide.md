# 本番デプロイガイド — Supabase + Vercel

## このドキュメントについて

PLATE LAB アプリの本番デプロイの仕組みを解説するガイド。
「何がどう繋がっているのか」を理解することで、自分でトラブル対応できるようになることが目的。

---

## 全体構成図

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  ブラウザ     │────▶│  Vercel           │────▶│  Supabase           │
│  (ユーザー)   │◀────│  (Next.js サーバー) │◀────│  (DB + Auth)        │
└──────────────┘     └──────────────────┘     └─────────────────────┘
                           │                        │
                     Vercel が担当:             Supabase が担当:
                     - HTML/CSS/JS 配信          - PostgreSQL データベース
                     - Server Actions 実行       - ユーザー認証 (Auth)
                     - API ルート処理            - Google OAuth 連携
                     - 環境変数の管理            - Connection Pooler
```

---

## 1. Supabase の役割（データベース + 認証）

### Supabase = 「バックエンドサービス」

Supabase は2つの機能を提供している：

#### (A) PostgreSQL データベース

アプリのデータ（ユーザー、プレート、ウェル等）を保存する場所。

```
あなたのアプリ  ──(SQL)──▶  Supabase PostgreSQL
                             └─ User テーブル
                             └─ Plate テーブル
                             └─ Well テーブル
                             └─ ...
```

**接続方法は2種類ある：**

| 方式 | ポート | 用途 | 備考 |
|------|--------|------|------|
| Transaction Pooler | 6543 | アプリからの通常クエリ | Vercel等のサーバーレス環境向け |
| Session Pooler | 5432 | マイグレーション実行 | 長時間接続が必要な操作向け |

> **なぜ直接接続しないのか？**
> Supabase Free プランの直接接続は IPv6 のみ対応。
> Vercel は IPv4 なので接続できない。Pooler は IPv4 対応。

#### (B) 認証（Auth）

ユーザーのサインアップ・ログイン・Google OAuth を処理する。
アプリ側ではパスワードを直接扱わず、Supabase Auth に委任している。

```
ログインボタン押下
  ↓
Supabase Auth SDK がリクエスト送信
  ↓
Supabase が認証処理（パスワード照合 or Google OAuth）
  ↓
JWT トークンをブラウザの Cookie に保存
  ↓
以降のリクエストは Cookie で認証状態を維持
```

---

## 2. Vercel の役割（ホスティング + サーバー実行）

### Vercel = 「アプリを動かす場所」

Next.js アプリをビルドして世界中に配信する。

### ビルドの流れ

```
git push (GitHub)  or  npx vercel --prod (CLI)
  ↓
Vercel がコードを受け取る
  ↓
① npm install（依存パッケージをインストール）
  ↓
② postinstall: prisma generate（Prisma Client を生成）
  ↓
③ npm run build → prisma generate && next build
  ↓
④ Next.js がページをコンパイル・最適化
  ↓
⑤ デプロイ完了 → https://plate-manage-app.vercel.app で公開
```

### 環境変数の役割

Vercel に設定した環境変数は、アプリ実行時に `process.env.XXX` で読み取られる。

```
┌─ Vercel 環境変数 ─────────────────────────────────────────────────┐
│                                                                   │
│  NEXT_PUBLIC_SUPABASE_URL ──────▶ Supabase のURL                  │
│  NEXT_PUBLIC_SUPABASE_ANON_KEY ─▶ Supabase の公開APIキー          │
│  DATABASE_URL ──────────────────▶ DBへの接続先(Transaction Pooler) │
│  DIRECT_URL ────────────────────▶ DBへの接続先(Session Pooler)     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
        ↑
  これらがないとアプリは Supabase に接続できない
```

| 変数名 | 公開/秘密 | 何に使われるか |
|--------|-----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 公開 | ブラウザ・サーバーから Supabase API にアクセス |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開 | Supabase API の認証キー（権限は制限的） |
| `DATABASE_URL` | **秘密** | Prisma がDBにクエリを送る時の接続先 |
| `DIRECT_URL` | **秘密** | Prisma マイグレーション用の接続先 |

> **`NEXT_PUBLIC_` の意味**
> この接頭辞がある変数はブラウザに公開される（JavaScriptに埋め込まれる）。
> DB接続文字列など秘密情報には絶対に付けない。

---

## 3. Prisma の役割（DB アクセス）

### Prisma = 「データベースとの橋渡し」

TypeScript のコードから SQL を書かずに DB を操作できるようにする。

```
Server Action のコード
  ↓
prisma.plate.findMany()  ← TypeScript で記述
  ↓
Prisma Client（generated/prisma/）
  ↓
PrismaPg Adapter（@prisma/adapter-pg）
  ↓
Supabase PostgreSQL（Pooler 経由）
```

### ファイルの関係

```
prisma/schema.prisma     ← テーブル構造の定義（設計図）
prisma.config.ts         ← Prisma CLI が使う設定（DIRECT_URL）
lib/prisma.ts            ← アプリが使う接続設定（DATABASE_URL）
generated/prisma/        ← 自動生成されるクライアントコード（gitに含めない）
```

### なぜ2つのURLが必要か

```
DATABASE_URL（Transaction Pooler, port 6543）
  └─ アプリ実行時に使う
  └─ 短い接続を大量にさばける（サーバーレス向き）
  └─ ?pgbouncer=true を付ける

DIRECT_URL（Session Pooler, port 5432）
  └─ prisma migrate / prisma db push で使う
  └─ 長い接続が必要なDB操作向け
```

---

## 4. 認証フローの全体像

### メール登録・ログイン

```
① ユーザーが /register でメール・パスワード入力
   ↓
② Supabase Auth API にサインアップリクエスト
   ↓
③ Supabase がユーザーを作成、UUID を発行
   ↓
④ app/auth/callback/route.ts が呼ばれる
   ↓
⑤ Supabase User ID で Prisma の User レコードを作成
   （これで認証ユーザーとDBユーザーが紐づく）
   ↓
⑥ Cookie にセッション保存 → ダッシュボードへリダイレクト
```

### Google OAuth ログイン

```
① ユーザーが「Googleでログイン」ボタンをクリック
   ↓
② Supabase Auth が Google OAuth ページへリダイレクト
   ↓
③ ユーザーが Google アカウントで認可
   ↓
④ Google → Supabase コールバック
   https://PROJECT_REF.supabase.co/auth/v1/callback
   ↓
⑤ Supabase → アプリのコールバック
   https://plate-manage-app.vercel.app/auth/callback?code=xxx
   ↓
⑥ route.ts でコードをセッションに交換
   ↓
⑦ Prisma で User レコード確認/作成
   ↓
⑧ ダッシュボードへリダイレクト
```

### Middleware（全リクエスト共通）

```
ブラウザからのリクエスト
  ↓
middleware.ts（proxy.ts → lib/supabase/middleware.ts）
  ↓
セッション Cookie を確認
  ├─ 有効 → そのままページ表示
  └─ 無効/期限切れ → /login にリダイレクト
```

---

## 5. 今回のデプロイで実際にやったこと

### Step 1: Supabase 本番プロジェクト

```bash
# CLI でログイン
npx supabase login

# プロジェクトにリンク
npx supabase link --project-ref nbavmqhtkdiacpwvblij

# DBスキーマを適用（マイグレーション）
npx supabase db push

# Auth設定（Google OAuth等）を適用
npx supabase config push
```

> **config push は config.toml の設定をリモートに反映する。**
> ただし config.toml はローカル開発用の値なので、
> Google OAuth の redirect_uri 等は一時的に本番用に書き換えてから push し、
> 終わったらローカル用に戻す。

### Step 2: Vercel

```bash
# CLI でログイン
npx vercel login

# プロジェクトをリンク（初回のみ）
npx vercel link

# 環境変数を設定（4つ必須）
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add DATABASE_URL production
npx vercel env add DIRECT_URL production

# 本番デプロイ
npx vercel --prod
```

### Step 3: Google Cloud Console

OAuth 2.0 クライアントの「承認済みリダイレクト URI」に追加：
```
https://PROJECT_REF.supabase.co/auth/v1/callback
```

---

## 6. 各サービスの管理画面

| サービス | URL | 何ができるか |
|---------|-----|-------------|
| Vercel Dashboard | https://vercel.com/dashboard | デプロイ状況・ログ・環境変数管理 |
| Supabase Dashboard | https://supabase.com/dashboard | DB確認・Auth設定・接続文字列確認 |
| Google Cloud Console | https://console.cloud.google.com | OAuth設定・リダイレクトURI管理 |

---

## 7. よくある操作

### コードを修正して再デプロイ

```bash
# コード修正後
git add . && git commit -m "修正内容"
git push origin main

# Vercel に手動デプロイ（GitHub連携なら自動）
npx vercel --prod
```

### 環境変数を変更

```bash
# 古い値を削除
npx vercel env rm 変数名 production

# 新しい値を設定
npx vercel env add 変数名 production

# 再デプロイ（環境変数変更はデプロイしないと反映されない）
npx vercel --prod
```

### Vercel のエラーログを見る

Vercel Dashboard → プロジェクト → **Deployments** → 該当デプロイ → **Functions** タブ → ログ

### DB のテーブルデータを確認

Supabase Dashboard → **Table Editor** → テーブルを選択

---

## 8. ファイル構成まとめ

```
plate-manage-app/
├── .env                          # ローカル開発用の環境変数（本番では使わない）
├── prisma.config.ts              # Prisma CLI 設定（DIRECT_URL を参照）
├── prisma/
│   ├── schema.prisma             # DB テーブル定義
│   ├── migrations/               # マイグレーションファイル
│   └── seed.ts                   # 開発用シードデータ
├── lib/
│   ├── prisma.ts                 # Prisma Client（DATABASE_URL で接続）
│   └── supabase/
│       ├── client.ts             # ブラウザ用 Supabase クライアント
│       ├── server.ts             # サーバー用 Supabase クライアント
│       └── middleware.ts         # 認証ミドルウェア
├── app/
│   └── auth/callback/route.ts    # OAuth コールバック（User レコード作成）
├── proxy.ts                      # Next.js ミドルウェアのエントリ
├── supabase/
│   ├── config.toml               # Supabase ローカル設定（config push で本番反映）
│   └── migrations/               # Supabase 用マイグレーション
├── generated/prisma/             # Prisma 自動生成（.gitignore 対象）
├── next.config.ts                # Next.js 設定（セキュリティヘッダー等）
└── package.json                  # ビルド: "prisma generate && next build"
```
