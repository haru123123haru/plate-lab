import { afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { currentUser } from "./fixtures";

// ログインの代わり。Action はこのユーザーとして動く
vi.mock("@/lib/auth", () => ({
  getCurrentUserId: async () => {
    if (!currentUser.id) throw new Error("No user signed in");
    return currentUser.id;
  },
}));

// テストごとに全テーブルを空にする。マイグレーションが入れた共有の行も消えるので、
// 共有のタイプやテンプレートが要るテストは自分で作る
beforeEach(async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`
    );
  }
  currentUser.id = null;
});

afterAll(async () => {
  await prisma.$disconnect();
});
