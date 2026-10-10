import { execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// テスト用の DB が無ければ作り、マイグレーションを当てる。本番と同じ手順（prisma migrate deploy）で作る
export default async function setup() {
  // vitest.integration.config.mts で、手元のテスト用 DB だと確かめてから入れてある
  const url = new URL(process.env.DATABASE_URL!);
  const database = url.pathname.slice(1);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: admin.toString() }),
  });
  try {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT 1 FROM pg_database WHERE datname = ${database}
    `;
    if (rows.length === 0) {
      // 識別子なので引用符で囲む
      await prisma.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await prisma.$disconnect();
  }

  // prisma.config.ts は DIRECT_URL を読む。.env より先に環境変数が効く
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DIRECT_URL: url.toString() },
    stdio: "pipe",
  });
}
