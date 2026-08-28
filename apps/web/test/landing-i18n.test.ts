// @vitest-environment node
// Lecture de source, aucun DOM requis : sous happy-dom `import.meta.url` n'est
// pas une URL `file:` et la résolution du chemin échoue.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Garde-fou de dette, pas test de comportement. La landing traînait
 * **29 clés i18n orphelines** — vestiges de quatre blocs supprimés du template
 * sans nettoyer le dictionnaire. Ce test transforme le nettoyage ponctuel en
 * invariant : une clé déclarée doit être utilisée, et les deux langues doivent
 * rester à parité.
 */
const SOURCE = readFileSync(
  fileURLToPath(new URL("../src/views/LandingView.vue", import.meta.url)),
  "utf-8",
);

/** Les clés d'un bloc de langue : `    maClé: '…'` à exactement 4 espaces. */
function declaredKeys(block: string): Set<string> {
  return new Set([...block.matchAll(/^ {4}([A-Za-z0-9_]+):/gm)].map((m) => m[1] as string));
}

const script = SOURCE.split("<template>")[0] ?? "";
const enBlock = (script.split("  en: {")[1] ?? "").split("  fr: {")[0] ?? "";
// Le bloc FR s'arrête à sa fermeture ; ce qui suit est du code, pas des clés.
const frBlock = (script.split("  fr: {")[1] ?? "").split("\n  },")[0] ?? "";

const en = declaredKeys(enBlock);
const fr = declaredKeys(frBlock);
// `t('…')` uniquement : `emit('…')` finit aussi par `t(` et serait un faux positif.
const used = new Set(
  [...SOURCE.matchAll(/[^a-zA-Z]t\(\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1] as string),
);

describe("LandingView — hygiène du dictionnaire i18n", () => {
  it("déclare exactement les mêmes clés en anglais et en français", () => {
    expect([...en].filter((k) => !fr.has(k))).toEqual([]);
    expect([...fr].filter((k) => !en.has(k))).toEqual([]);
  });

  it("n'a aucune clé déclarée mais inutilisée", () => {
    expect([...en].filter((k) => !used.has(k)).sort()).toEqual([]);
  });

  it("n'utilise aucune clé non déclarée", () => {
    expect([...used].filter((k) => !en.has(k)).sort()).toEqual([]);
  });

  it("ne déclare plus les tokens de couleur en local (le fork est soldé)", () => {
    const style = SOURCE.split("<style scoped>")[1] ?? "";
    for (const forked of ["--ink:", "--ink2:", "--white:", "--hair:"]) {
      expect(style).not.toContain(forked);
    }
  });
});
