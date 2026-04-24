import { execSync } from "node:child_process";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { Client } from "pg";

export default async function globalSetup(): Promise<void> {
  loadEnv({ path: resolve(process.cwd(), ".env.test"), override: true });

  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST not set — ensure backend/.env.test exists."
    );
  }
  if (!url.includes("test")) {
    throw new Error(
      `REFUSING TO RUN: DATABASE_URL_TEST does not contain "test": ${url}`
    );
  }

  process.env.DATABASE_URL = url;

  console.log("[test/global-setup] dropping and recreating public schema...");
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE;");
  await client.query("CREATE SCHEMA public;");
  await client.query("GRANT ALL ON SCHEMA public TO public;");
  await client.end();

  console.log("[test/global-setup] applying migrations...");
  execSync("npx prisma migrate deploy --schema=prisma/schema.prisma", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
  console.log("[test/global-setup] ready.");
}
