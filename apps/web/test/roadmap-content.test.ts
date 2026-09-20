import { describe, expect, it } from "vitest";
import { ROADMAP_CONTENT, TEST_COUNT, resolveRoadmap } from "../src/data/roadmap";
import { ROUTES } from "../src/composables/useRoute";
import type { Locale } from "../src/i18n/locale";

/* Le contenu de `#/roadmap` est la source unique du pitch adressé à l'équipe
 * XRPL (jury Make Waves) : il doit être complet dans les deux langues, pointer
 * vers des routes qui existent, et respecter les interdits de copie en
 * promotion financière (docs/BRAND.md § Voice). Ces tests portent sur la
 * donnée, pas sur le rendu. */

/** Un `Localized` = un objet de exactement deux clés, `en` et `fr`. */
function isLocalized(value: unknown): value is { en: string; fr: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value).sort();
  return keys.length === 2 && keys[0] === "en" && keys[1] === "fr";
}

/** Parcourt le contenu et renvoie chaque chaîne bilingue avec son chemin. */
function collectLocalized(
  node: unknown,
  path = "$",
  out: { path: string; en: unknown; fr: unknown }[] = [],
): { path: string; en: unknown; fr: unknown }[] {
  if (isLocalized(node)) {
    out.push({ path, en: node.en, fr: node.fr });
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectLocalized(child, `${path}[${i}]`, out));
    return out;
  }
  if (typeof node === "object" && node !== null) {
    for (const [k, v] of Object.entries(node)) {
      collectLocalized(v, `${path}.${k}`, out);
    }
  }
  return out;
}

/** Toutes les chaînes rendues, langue par langue (pour les interdits de copie). */
function allStrings(l: Locale): string[] {
  return collectLocalized(ROADMAP_CONTENT).map((entry) => String(entry[l]));
}

describe("data/roadmap — contenu du pitch", () => {
  it("n'a aucune chaîne vide, ni en EN ni en FR", () => {
    const entries = collectLocalized(ROADMAP_CONTENT);
    expect(entries.length).toBeGreaterThan(50);
    const broken = entries.filter(
      (e) =>
        typeof e.en !== "string" ||
        typeof e.fr !== "string" ||
        String(e.en).trim() === "" ||
        String(e.fr).trim() === "",
    );
    expect(broken.map((e) => e.path)).toEqual([]);
  });

  it("résout la même structure dans les deux langues", () => {
    for (const l of ["en", "fr"] as const) {
      const c = resolveRoadmap(l);

      expect(c.thesis.points).toHaveLength(5);

      expect(c.stages.items.map((s) => s.id)).toEqual(["learn", "prove", "trade"]);
      expect(c.stages.items.map((s) => s.index)).toEqual(["01", "02", "03"]);

      expect(c.roadmap.phases.map((p) => p.status)).toEqual([
        "now",
        "next",
        "then",
        "later",
      ]);
      expect(c.roadmap.phases.map((p) => p.items.length)).toEqual([4, 5, 3, 2]);

      expect(c.dex.steps).toHaveLength(3);

      expect(c.tech.funding).toHaveLength(5);
      expect(c.tech.primitives).toHaveLength(8);
      expect(c.tech.stack).toHaveLength(6);
    }
  });

  it("ne met dans la colonne tx que de vraies transactions XRPL", () => {
    const c = resolveRoadmap("en");
    const empty = c.tech.funding
      .map((s, i) => ({ i, tx: s.tx }))
      .filter((s) => s.tx.length === 0);
    // Un trade en argent fictif n'est pas du volume on-chain, et brancher un
    // wallet existant ne soumet rien : ces deux étapes-là n'émettent aucune tx.
    expect(empty.map((s) => s.i)).toEqual([1, 4]);
    // Aucune puce n'est un nom de wallet ou de produit : que des tx du ledger.
    const chips = c.tech.funding.flatMap((s) => s.tx);
    expect(chips.filter((tx) => /xaman|gemwallet|xumm/i.test(tx))).toEqual([]);
  });

  it("ne pointe que vers des routes du site (aucun lien profond cassé)", () => {
    for (const l of ["en", "fr"] as const) {
      const c = resolveRoadmap(l);
      const ctas = [...c.stages.items.map((s) => s.cta), c.cta.primary, c.cta.secondary];
      for (const cta of ctas) {
        expect(cta.path.startsWith("/")).toBe(true);
        expect(ROUTES).toContain(cta.path);
        expect(cta.label.trim()).not.toBe("");
      }
    }
  });

  it("tient la limite de 160 caractères sur la description SEO", () => {
    // Au-delà, Google tronque : la promesse se ferait couper en deux.
    for (const l of ["en", "fr"] as const) {
      const description = resolveRoadmap(l).hero.seoDescription;
      expect(`${l} · ${description.length}`).toBe(
        `${l} · ${Math.min(description.length, 160)}`,
      );
    }
  });

  it("respecte les interdits de copie en promotion financière", () => {
    // `take-profit` est le nom d'un type d'ordre, pas une promesse de gain.
    // « prop firm » est un vocabulaire écarté par le produit.
    const banned: [string, RegExp][] = [
      ["risk-free", /risk[-\s]free/i],
      ["sans risque", /sans\s+risque/i],
      ["guaranteed", /guarantee/i],
      ["garanti", /garanti/i],
      ["profit", /(?<!take[-\s])\bprofits?\b/i],
      ["returns", /\breturns\b/i],
      ["APY", /\bAPY\b/i],
      ["prop firm", /\bprop[-\s]firms?\b/i],
    ];
    for (const l of ["en", "fr"] as const) {
      for (const text of allStrings(l)) {
        for (const [label, re] of banned) {
          expect(`${l} · ${label} · ${re.test(text) ? text : "ok"}`).toBe(
            `${l} · ${label} · ok`,
          );
        }
      }
    }
  });

  it("affiche le nombre de tests formaté selon la langue", () => {
    const en = resolveRoadmap("en").tech.stack.find((g) => g.title === "Quality");
    const fr = resolveRoadmap("fr").tech.stack.find((g) => g.title === "Qualité");
    expect(en?.body).toContain(TEST_COUNT.toLocaleString("en-US"));
    expect(fr?.body).toContain(TEST_COUNT.toLocaleString("fr-FR"));
  });
});
