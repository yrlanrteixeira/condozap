import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export const getTestPrisma = (): PrismaClient => {
  if (!prisma) {
    const url = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
    if (!url || !url.includes("test")) {
      throw new Error(
        `getTestPrisma refused: DATABASE_URL_TEST must contain "test"`
      );
    }
    const adapter = new PrismaPg({ connectionString: url });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
};

export const truncateAll = async (): Promise<void> => {
  const p = getTestPrisma();
  const rows = await p.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations'`
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await p.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE;`);
};

export const disconnectTestPrisma = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};
