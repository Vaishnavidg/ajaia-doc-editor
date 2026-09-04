import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

// Isolated SQLite database for tests (resolved against the prisma/ dir).
const TEST_DB_URL = "file:./test.db";
const TEST_DB_FILE = path.resolve(process.cwd(), "prisma/test.db");

function removeDbFiles() {
  for (const suffix of ["", "-journal"]) {
    try {
      rmSync(TEST_DB_FILE + suffix);
    } catch {
      /* file may not exist */
    }
  }
}

export default function setup() {
  removeDbFiles();

  // The db file was just deleted, so this creates a fresh schema (no reset).
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });

  return removeDbFiles;
}
