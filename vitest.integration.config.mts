import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// DB を伴う結合テスト。ローカルの Supabase の Postgres に、テスト専用の DB を作って流す。
// 決まりは docs/plans/2026-10-10-integration-tests.md

// TEST_DATABASE_URL が無ければ、ローカルの Supabase（supabase start）の Postgres に
// plate_lab_test を作って使う。テストは毎回テーブルを空にするので、手元のマシンの外にある DB や、
// 名前が _test で終わらない DB は受け付けない（本番や開発の DB を消さないため）
const url = new URL(
  process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/plate_lab_test"
);
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
  throw new Error(
    `Integration tests only run against a local database, got ${url.hostname}`
  );
}
if (!url.pathname.endsWith("_test")) {
  throw new Error(
    `The integration test database name must end with _test, got ${url.pathname}`
  );
}
// global-setup.ts（このプロセス）とテスト（ワーカー）の両方が読む。.env の DATABASE_URL より先に効く
process.env.DATABASE_URL = url.toString();

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    // 1つの DB を消しては作り直すので、ファイルを並べて流さない
    fileParallelism: false,
    env: { DATABASE_URL: url.toString() },
  },
});
