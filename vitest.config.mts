import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

const INTEGRATION_TESTS = "src/**/*.integration.test.{ts,tsx}";

/**
 * Integration tests share one Postgres database: each waits for the
 * createTestDb lock and rebuilds the schema, which under load takes far
 * longer than vitest's 5 s default.
 */
const INTEGRATION_TIMEOUT_MS = 60_000;

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [INTEGRATION_TESTS],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: [INTEGRATION_TESTS],
          testTimeout: INTEGRATION_TIMEOUT_MS,
          hookTimeout: INTEGRATION_TIMEOUT_MS,
        },
      },
    ],
  },
});
