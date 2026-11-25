import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
  test: {
    environment: "jsdom",
    // Node 25+ ships its own localStorage global, which shadows jsdom's.
    execArgv: ["--no-experimental-webstorage"],
    include: ["lib/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json-summary"],
    },
  },
});
