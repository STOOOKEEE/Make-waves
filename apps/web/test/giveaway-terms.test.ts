// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { LOCALES, setLocale } from "../src/i18n/locale";
import {
  CARRY_OVER_MONTHS,
  CLAIM_WINDOW_DAYS,
  DRAW_WINDOW_DAYS,
  ORGANISER,
  TERMS,
  TERMS_VERSION,
} from "../src/data/giveaway-terms";
import { useGiveawayTerms } from "../src/composables/useGiveawayTerms";

/**
 * Le règlement est un texte opposable : une phrase présente dans une seule
 * langue, ou un article vide, ce sont des trous dans ce qu'on peut faire valoir.
 * Ces tests gardent la forme, pas le fond.
 */

beforeEach(() => {
  localStorage.clear();
  setLocale("en");
  useGiveawayTerms().setAccepted(false);
});

describe("Règlement de la tombola", () => {
  it("est complet dans les deux langues, article par article", () => {
    expect(TERMS.length).toBeGreaterThanOrEqual(20);
    for (const article of TERMS) {
      for (const lang of LOCALES) {
        expect(article.title[lang].trim(), `titre ${article.id} en ${lang}`).not.toBe("");
        for (const [i, paragraph] of article.paragraphs.entries()) {
          expect(paragraph[lang].trim(), `${article.id} §${i + 1} en ${lang}`).not.toBe("");
        }
      }
      expect(article.paragraphs.length, `${article.id} sans paragraphe`).toBeGreaterThan(0);
    }
  });

  it("a des identifiants d'article uniques, les ancres en dépendent", () => {
    const ids = TERMS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("porte la condition suspensive et la borne au seul grand prix", () => {
    const condition = TERMS.find((a) => a.id === "condition");
    expect(condition).toBeDefined();
    const en = condition?.paragraphs.map((p) => p.en).join(" ") ?? "";
    const fr = condition?.paragraphs.map((p) => p.fr).join(" ") ?? "";
    expect(en).toContain("only if the Tide project wins the grand prize");
    expect(fr).toContain("que si le projet Tide remporte le grand prix");
    // Un prix de catégorie ne doit pas pouvoir être lu comme déclencheur.
    expect(en).toContain("does not trigger it");
    expect(fr).toContain("ne la déclenche pas");
  });

  it("n'écrit aucun tiret cadratin dans le règlement", () => {
    for (const article of TERMS) {
      for (const lang of LOCALES) {
        const text = [article.title[lang], ...article.paragraphs.map((p) => p[lang])].join(" ");
        expect({ id: article.id, lang, dash: /[—–]/.test(text) }).toEqual({
          id: article.id,
          lang,
          dash: false,
        });
      }
    }
  });

  it("garde une identité d'organisateur renseignée", () => {
    // Les valeurs peuvent encore être des marqueurs à compléter avant publication,
    // mais aucune ne doit être vide : c'est l'identité qu'on oppose en cas de litige.
    for (const value of Object.values(ORGANISER)) {
      expect(value.trim()).not.toBe("");
    }
  });

  it("expose des délais cohérents", () => {
    expect(DRAW_WINDOW_DAYS).toBeGreaterThan(0);
    expect(CLAIM_WINDOW_DAYS).toBeGreaterThan(0);
    expect(CARRY_OVER_MONTHS).toBeGreaterThan(0);
  });
});

describe("useGiveawayTerms", () => {
  it("n'est pas accepté par défaut", () => {
    expect(useGiveawayTerms().accepted.value).toBe(false);
  });

  it("enregistre l'acceptation avec la version en vigueur", () => {
    const terms = useGiveawayTerms();
    terms.setAccepted(true);
    expect(terms.accepted.value).toBe(true);
    expect(localStorage.getItem("tide.giveawayTermsAccepted")).toBe(TERMS_VERSION);
  });

  it("redemande l'accord quand le règlement change de version", () => {
    // Une acceptation portant sur un texte antérieur ne vaut pas pour le nouveau.
    localStorage.setItem("tide.giveawayTermsAccepted", "1970-01-01");
    const terms = useGiveawayTerms();
    terms.setAccepted(false);
    localStorage.setItem("tide.giveawayTermsAccepted", "1970-01-01");
    expect(useGiveawayTerms().accepted.value).toBe(false);
  });

  it("se retire", () => {
    const terms = useGiveawayTerms();
    terms.setAccepted(true);
    terms.setAccepted(false);
    expect(terms.accepted.value).toBe(false);
    expect(localStorage.getItem("tide.giveawayTermsAccepted")).toBeNull();
  });
});
