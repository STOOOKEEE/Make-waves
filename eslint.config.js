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
      // Maquette statique de référence (HTML/JS navigateur), hors build app.
      "design_site/**",
      // Contrats Solidity (Foundry) : hors du périmètre ESLint/TS.
      "packages/contracts/**",
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
