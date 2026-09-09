// @vitest-environment node
// Lecture de source, aucun DOM requis : sous happy-dom `import.meta.url` n'est
// pas une URL `file:` et la résolution du chemin échoue.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Même garde-fou que `landing-i18n.test.ts`, sur la page tombola : c'est une
 * surface publique bilingue, et une clé manquante en français s'y verrait
 * immédiatement (repli silencieux sur l'anglais).
 */
const SOURCE = readFileSync(
  fileURLToPath(new URL("../src/views/GiveawayView.vue", import.meta.url)),
  "utf-8",
);

/** Les clés d'un bloc de langue : `    maClé: "…"` à exactement 4 espaces. */
function declaredKeys(block: string): Set<string> {
  return new Set([...block.matchAll(/^ {4}([A-Za-z0-9_]+):/gm)].map((m) => m[1] as string));
}

const script = SOURCE.split("<template>")[0] ?? "";
const enBlock = (script.split("  en: {")[1] ?? "").split("  fr: {")[0] ?? "";
const frBlock = (script.split("  fr: {")[1] ?? "").split("\n  },")[0] ?? "";

const en = declaredKeys(enBlock);
const fr = declaredKeys(frBlock);
// `t("…")` ou `t('…')` : `emit('…')` finit aussi par `t(` et serait un faux positif.
const used = new Set(
  [...SOURCE.matchAll(/[^a-zA-Z]t\(\s*["']([A-Za-z0-9_]+)["']/g)].map((m) => m[1] as string),
);
// Les libellés des règles passent par une table de correspondance, pas par un
// `t("…")` littéral : on lit les clés qu'elle référence.
const viaTable = new Set(
  [...script.matchAll(/(?:title|body):\s*"([A-Za-z0-9_]+)"/g)].map((m) => m[1] as string),
);
const reachable = new Set([...used, ...viaTable]);

describe("GiveawayView — hygiène du dictionnaire i18n", () => {
  it("déclare exactement les mêmes clés en anglais et en français", () => {
    expect([...en].filter((k) => !fr.has(k))).toEqual([]);
    expect([...fr].filter((k) => !en.has(k))).toEqual([]);
  });

  it("n'a aucune clé déclarée mais inutilisée", () => {
    expect([...en].filter((k) => !reachable.has(k)).sort()).toEqual([]);
  });

  it("n'utilise aucune clé non déclarée", () => {
    expect([...reachable].filter((k) => !en.has(k)).sort()).toEqual([]);
  });

  it("ne redéclare aucun token de couleur en local", () => {
    const style = SOURCE.split("<style scoped>")[1] ?? "";
    for (const forked of ["--ink:", "--ink2:", "--white:", "--hair:", "--blue:", "--gold:"]) {
      expect(style).not.toContain(forked);
    }
  });

  it("n'emploie pas les couleurs sémantiques du P&L en décoratif", () => {
    const style = SOURCE.split("<style scoped>")[1] ?? "";
    // `--up` / `--down` sont réservés au P&L, `--guide` au projecteur du tutoriel.
    for (const token of ["var(--up)", "var(--down)", "var(--guide)"]) {
      expect(style).not.toContain(token);
    }
  });
});
