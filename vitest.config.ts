import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    include: ["lib/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json-summary"],
    },
  },
});
