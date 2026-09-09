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

  it("n'écrit aucun tiret cadratin dans la copie affichée", () => {
    // Règle de voix : les tirets cadratins (— et –) sont bannis de tout ce qui
    // est lu par un visiteur. Le test ne regarde que les dictionnaires, pas les
    // commentaires du fichier, qui eux ont le droit d'en contenir.
    for (const [lang, block] of [["en", enBlock], ["fr", frBlock]] as const) {
      const offenders = block
        .split("\n")
        .filter((line) => line.includes("\u2014") || line.includes("\u2013"));
      expect({ lang, offenders }).toEqual({ lang, offenders: [] });
    }
  });

  it("ne recrée pas un parcours de compte hors wallet", () => {
    // Sur Tide, un compte EST un wallet XRPL signé. La page ne doit jamais
    // rouvrir une inscription e-mail/Google en parallèle du funnel wallet.
    expect(SOURCE).not.toContain("useAccountAuth");
    expect(SOURCE).toContain("useWalletEntry");
  });

  it("n'emploie pas les couleurs sémantiques du P&L en décoratif", () => {
    const style = SOURCE.split("<style scoped>")[1] ?? "";
    // `--up` / `--down` sont réservés au P&L, `--guide` au projecteur du tutoriel.
    for (const token of ["var(--up)", "var(--down)", "var(--guide)"]) {
      expect(style).not.toContain(token);
    }
  });
});

describe("TermsPanel — source", () => {
  const SOURCE = readFileSync(
    fileURLToPath(new URL("../src/components/giveaway/TermsPanel.vue", import.meta.url)),
    "utf-8",
  );

  it("n'écrit aucun tiret cadratin dans ses libellés", () => {
    const script = SOURCE.split("<template>")[0] ?? "";
    const dicts = (script.split("  en: {")[1] ?? "").split("\n  },")[0] ?? "";
    const frDict = (script.split("  fr: {")[1] ?? "").split("\n  },")[0] ?? "";
    for (const [name, block] of [["en", dicts], ["fr", frDict]] as const) {
      const offenders = block
        .split("\n")
        .filter((line) => line.includes("—") || line.includes("–"));
      expect({ name, offenders }).toEqual({ name, offenders: [] });
    }
  });

  it("garde la case d'acceptation hors du repli du règlement", () => {
    const template = SOURCE.split("<template>")[1] ?? "";
    const detailsEnd = template.indexOf("</details>");
    const checkbox = template.indexOf('class="terms-accept"');
    // Une case enterrée dans un bloc replié ne serait jamais vue.
    expect(detailsEnd).toBeGreaterThan(0);
    expect(checkbox).toBeGreaterThan(detailsEnd);
  });
});
