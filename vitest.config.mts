import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests run against an isolated SQLite file (prisma/test.db). Prisma resolves
// the relative file: path against the prisma/ schema directory.
const TEST_DATABASE_URL = "file:./test.db";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
