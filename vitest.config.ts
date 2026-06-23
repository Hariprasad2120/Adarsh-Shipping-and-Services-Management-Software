import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/scrap/**", "**/dist/**"],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
