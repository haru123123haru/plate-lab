import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const client = new PrismaClient({
    adapter,
    // 一時的な計測（#17）。測り終えたら消す
    log: [{ emit: "event", level: "query" }],
  });
  client.$on("query", (e) => {
    console.log(`[timing] db ${e.duration}ms ${e.query.slice(0, 80)}`);
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
