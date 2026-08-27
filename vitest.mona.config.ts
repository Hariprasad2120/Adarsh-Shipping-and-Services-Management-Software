import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/modules/mona/**/*.test.{ts,tsx}",
      "src/modules/mona/**/__tests__/**/*.test.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/OLD UI code/**",
      "**/_design-reference/**",
      "**/src/generated/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
