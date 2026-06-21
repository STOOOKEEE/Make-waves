import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.nuxt/**",
      "**/.output/**",
      "**/coverage/**",
      // Les .vue sont typés par vue-tsc (eslint TS ne les parse pas).
      "**/*.vue",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Convention projet : jamais de `any` pour contourner le typage.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
