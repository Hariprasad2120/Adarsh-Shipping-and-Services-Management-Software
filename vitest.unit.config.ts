import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
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
