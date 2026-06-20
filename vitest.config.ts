import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.{test,spec}.ts", "apps/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/**/src/**/*.ts"],
    },
  },
});
