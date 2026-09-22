# 本番デプロイ トラブルシューティングガイド

## 概要

Supabase + Vercel への本番デプロイ時に発生した問題と解決策をまとめたドキュメント。
同様の構成（Next.js + Prisma + Supabase + Vercel）で再発防止するための参考資料。

---

## 1. Prisma 7 の破壊的変更

### 問題

Vercelビルド時に以下のエラーが発生：

```
Error: The datasource property `url` is no longer supported in schema files.
Error: The datasource property `directUrl` is no longer supported in schema files.
```

### 原因

Prisma 7 では `schema.prisma` の `datasource` ブロックから `url` / `directUrl` が廃止された。

### 解決策

3ファイルを変更する必要がある：

**`prisma/schema.prisma`** — url/directUrl を削除、generator を変更：
```prisma
datasource db {
  provider = "postgresql"
  // url, directUrl は記述しない
}

generator client {
  provider = "prisma-client"       // prisma-client-js → prisma-client
  output   = "../generated/prisma" // 出力先を明示（必須）
}
```

**`prisma.config.ts`** — datasource URL をここに記述：
```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"), // マイグレーション用（直接接続 or Session pooler）
  },
});
```

**`lib/prisma.ts`** — PrismaPg アダプター経由でクライアント初期化：
```typescript
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!, // ランタイム用（Transaction pooler）
});
const prisma = new PrismaClient({ adapter });
```

**必要なパッケージ：**
```bash
npm install @prisma/adapter-pg
```

**インポートパスの変更：**
- `@prisma/client` → `../generated/prisma/client`（相対パス）
- プロジェクト内の全ファイルで更新が必要

**`.gitignore` に追加：**
```
/generated/prisma
```

---

## 2. Supabase Pooler ホスト名の誤推定

### 問題

DATABASE_URL に `aws-0-ap-northeast-1.pooler.supabase.com` を設定したが、接続エラー：

```
FATAL: Tenant or user not found
```

### 原因

Pooler のホスト名はプロジェクトごとに異なる。`aws-0` ではなく **`aws-1`** だった。

### 解決策

**絶対に推測しない。必ず Supabase Dashboard から正確な接続文字列をコピーする。**

確認手順：
1. Supabase Dashboard → 画面上部の **Connect** ボタン
2. **Connection String** タブ
3. **Method** ドロップダウンを **Transaction pooler** に変更
4. 表示された接続文字列をそのままコピー

正しい形式（このプロジェクトの場合）：
```
postgresql://postgres.nbavmqhtkdiacpwvblij:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

---

## 3. Supabase 直接接続が IPv4 非対応

### 問題

`db.PROJECT_REF.supabase.co:5432` への直接接続が失敗：

```
P1001: Can't reach database server at db.nbavmqhtkdiacpwvblij.supabase.co
```

### 原因

Supabase Free プランの直接接続は **IPv6 のみ対応**。
Vercel の Serverless Functions は **IPv4 のみ**。

Dashboard にも「Not IPv4 compatible — Use Session Pooler if on a IPv4 network」と表示される。

### 解決策

**Vercel（IPv4 環境）では必ず Pooler 接続を使う：**

| 用途 | 接続方式 | ポート |
|------|----------|--------|
| `DATABASE_URL`（ランタイム） | Transaction pooler | 6543 |
| `DIRECT_URL`（マイグレーション） | Session pooler | 5432 |

```
# DATABASE_URL（Transaction pooler）
postgresql://postgres.PROJECT_REF:PASSWORD@aws-X-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true

# DIRECT_URL（Session pooler）
postgresql://postgres.PROJECT_REF:PASSWORD@aws-X-REGION.pooler.supabase.com:5432/postgres
```

---

## 4. Vercel 環境変数に不正文字が混入

### 問題

認証時にエラー：
```
Headers.append: "Bearer eyJ...MTQ 1MjY..." is an invalid header value.
```

### 原因

`vercel env add` でJWTトークンを貼り付ける際、ターミナルの折り返しにより**スペースが混入**した。

### 解決策

- 長い値を貼り付ける際は、**1行で途切れないように注意**
- 設定後に `vercel env pull .env.check` で値を確認する
- 問題がある場合は `vercel env rm` → `vercel env add` で再設定

---

## 5. Vercel 環境変数が空になる

### 問題

`vercel env pull` で確認すると `DATABASE_URL=""` と空だった。

### 原因

`vercel env add` のインタラクティブプロンプト（`Mark as sensitive?` など）でエラーが発生し、値が正しく保存されなかった。

### 解決策

設定後は必ず確認：
```bash
npx vercel env pull .env.check --environment production
cat .env.check
rm .env.check
```

---

## 6. NEXT_PUBLIC_SUPABASE_URL に改行コードが混入

### 問題

`vercel env pull` で確認すると値が `https://xxx.supabase.co\r\n` となっていた。

### 原因

Windows 環境でのコピー＆ペースト時に `\r\n`（CRLF）が末尾に付加された。

### 解決策

- 値の末尾に余計な空白・改行がないか確認
- `vercel env pull` で定期的に値を検証する

---

## デプロイチェックリスト

### 事前準備

- [ ] Supabase Dashboard から正確な Pooler 接続文字列をコピー（推測しない）
- [ ] Prisma 7 対応済み（adapter-pg、prisma.config.ts、import パス）
- [ ] `prisma generate` がローカルで成功する
- [ ] `next build` がローカルで成功する

### Vercel 環境変数設定

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — 末尾に改行・スペースがないこと
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 途中にスペースがないこと（1行で貼り付け）
- [ ] `DATABASE_URL` — Transaction pooler（port 6543、`?pgbouncer=true` 付き）
- [ ] `DIRECT_URL` — Session pooler（port 5432）
- [ ] 設定後 `vercel env pull` で全値を検証

### デプロイ

- [ ] `npx vercel --prod` でデプロイ
- [ ] ユーザー登録が動作する
- [ ] ログインが動作する
- [ ] Google 認証が動作する（要 Google Cloud Console にリダイレクト URI 追加）

### Google OAuth 本番設定

- [ ] Supabase Auth に Google Client ID / Secret を設定（`supabase config push`）
- [ ] Supabase Auth の `site_url` を本番 URL に設定
- [ ] Supabase Auth の `redirect_urls` に本番 URL を追加
- [ ] Google Cloud Console の承認済みリダイレクト URI に追加：
  `https://PROJECT_REF.supabase.co/auth/v1/callback`
