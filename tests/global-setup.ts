import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

// Tests run against a real Postgres database:
//   TEST_DATABASE_URL if set, otherwise DATABASE_URL.
// The schema is dropped and rebuilt from the migrations here; every row is also
// deleted between tests. Point this at a throwaway database, never production.
//
// This runs once, in the main process, before the test workers spawn, so
// setting DATABASE_URL / DIRECT_URL here makes the workers' Prisma client
// connect to the right database.
const PRISMA_BIN = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);

function prismaExecute(url: string, args: string[], input?: string) {
  try {
    execFileSync(PRISMA_BIN, ["db", "execute", "--url", url, ...args], {
      encoding: "utf8",
      input,
    });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message: string };
    throw new Error(
      `prisma db execute failed:\n${err.stdout ?? ""}\n${err.stderr ?? ""}\n${err.message}`,
    );
  }
}

export default function setup() {
  // vitest injects .env into process.env before this runs.
  const testUrl = process.env.TEST_DATABASE_URL;
  const url = testUrl || process.env.DATABASE_URL;
  const directUrl = testUrl
    ? process.env.TEST_DIRECT_URL || testUrl
    : process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!url || !directUrl) {
    throw new Error(
      "No database URL for tests. Set TEST_DATABASE_URL (preferred) or " +
        "DATABASE_URL to a throwaway Postgres database in .env or the shell.",
    );
  }
  if (!testUrl) {
    console.warn(
      "\n!  TEST_DATABASE_URL not set - running tests against DATABASE_URL. " +
        "Every row in that database is deleted between tests.\n",
    );
  }

  // Rebuild a clean schema from the committed migrations.
  const migrationsDir = join(process.cwd(), "prisma", "migrations");
  const migrationDirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  prismaExecute(
    directUrl,
    ["--stdin"],
    "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;",
  );
  for (const dir of migrationDirs) {
    prismaExecute(directUrl, [
      "--file",
      join(migrationsDir, dir, "migration.sql"),
    ]);
  }

  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = directUrl;
}
