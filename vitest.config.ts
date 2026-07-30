import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";
import { assertExactStagingEnvironment } from "./scripts/staging-target";

const stagingEnvironment = dotenv.config({
  path: path.resolve(__dirname, ".env.staging.local"),
  override: true,
  quiet: true,
});
if (stagingEnvironment.error) {
  throw new Error(
    "Vitest refused: .env.staging.local is required for guarded test execution.",
  );
}
assertExactStagingEnvironment("Vitest");

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./scripts/vitest-staging-global-setup.ts"],
    // Database-backed suites share one marker-verified staging database.
    // Running test files concurrently causes cross-suite fixture interference.
    fileParallelism: false,
    exclude: [
      "**/node_modules/**",
      "**/scrap/**",
      "**/dist/**",
      "**/.next/**",
      "**/OLD UI code/**",
      "**/_design-reference/**",
      "**/src/generated/**",
    ],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
