import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // DB を伴う結合テストは vitest.integration.config.mts で流す
    exclude: [...configDefaults.exclude, "tests/integration/**"],
  },
});
