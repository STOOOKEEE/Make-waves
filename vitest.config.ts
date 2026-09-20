import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // pnpm isole les dépendances par workspace : `vue` vit dans
      // apps/web/node_modules. On ajoute un alias depuis la racine pour que
      // les tests Vue fonctionnent quand vitest est lancé depuis la racine
      // du monorepo.
      vue: path.resolve(import.meta.dirname, "apps/web/node_modules/vue"),
      "@vue/test-utils": path.resolve(
        import.meta.dirname,
        "apps/web/node_modules/@vue/test-utils",
      ),
    },
  },
  test: {
    include: ["packages/**/*.{test,spec}.ts", "apps/**/*.{test,spec}.ts"],
    setupFiles: ["./test-setup/dom.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/**/src/**/*.ts", "apps/**/src/**/*.ts"],
    },
  },
});
