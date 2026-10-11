# PLATE LAB

DNA結晶化プレートの情報を Web で管理し、プレートに貼った QR コードから詳細画面に飛べるようにするアプリ。実験台でスマホから使う前提の、モバイルファーストの画面になっている。

本番: https://plate-manage-app.vercel.app

## 構成

Next.js 16（App Router）・React 19・Prisma 7・Supabase（PostgreSQL と認証）・Tailwind CSS 4・shadcn/ui。Vercel にデプロイしていて、`main` への push で本番に出る。

設計とインフラの詳細は [`docs/architecture.md`](docs/architecture.md) にまとめてある。機能ごとの計画書は `docs/plans/` にある。

## ローカルで動かす

Docker Desktop を起動してから、次を実行する。手順の詳細と、しばらく触っていない状態から再開するときの注意は `docs/architecture.md` の6章にある。

```bash
npx supabase start
npx prisma migrate deploy
npx prisma generate
npx prisma db seed   # データが無いときだけ。本番では絶対に実行しない
npm run dev
```

ブラウザでは `http://127.0.0.1:3000` を開く（`localhost` ではない）。

## チェック

```bash
npm run check   # format・lint・typecheck・test・test:integration・build を順に流す
```

`test:integration` は DB を伴う結合テストで、ローカルの Supabase（`npx supabase start`）の Postgres に `plate_lab_test` という DB を作って流す。手元の DB でしか動かない（`vitest.integration.config.mts`）。

`build` は `prisma migrate deploy` を含むので、`.env` の `DIRECT_URL` が指す DB にマイグレーションが適用される。
