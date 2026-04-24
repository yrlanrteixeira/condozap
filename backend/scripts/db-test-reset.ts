import { execSync } from "node:child_process";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { Client } from "pg";

loadEnv({ path: resolve(process.cwd(), ".env.test"), override: true });

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  throw new Error("DATABASE_URL_TEST not set in .env.test");
}

if (!url.includes("test")) {
  throw new Error(
    `REFUSING TO RESET: DATABASE_URL_TEST does not contain "test": ${url}`
  );
}

process.env.DATABASE_URL = url;

const dropAndRecreatePublicSchema = async (): Promise<void> => {
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log("[db-test-reset] dropping and recreating public schema...");
  await client.query("DROP SCHEMA IF EXISTS public CASCADE;");
  await client.query("CREATE SCHEMA public;");
  await client.query("GRANT ALL ON SCHEMA public TO public;");
  await client.end();
};

const main = async (): Promise<void> => {
  await dropAndRecreatePublicSchema();

  console.log("[db-test-reset] applying migrations via prisma migrate deploy...");
  execSync("npx prisma migrate deploy --schema=prisma/schema.prisma", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });

  console.log("[db-test-reset] done.");
};

main().catch((err: unknown) => {
  console.error("[db-test-reset] failed:", err);
  process.exit(1);
});
