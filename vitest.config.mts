import { defineConfig } from "vitest/config";

// The database URL for tests is resolved in tests/global-setup.ts (which runs
// before the test workers are spawned and exports DATABASE_URL for them).
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": new URL("./src/", import.meta.url).pathname,
    },
  },
});
