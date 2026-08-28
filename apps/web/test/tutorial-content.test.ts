// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CHAPTERS, localizedSteps, STEPS, stepIndexById } from "../src/data/tutorial";
import { getArticle } from "../src/data/learn";
import { tableOfContents } from "../src/data/learn/toc";
import type { Locale } from "../src/i18n/locale";

const LOCALES: readonly Locale[] = ["en", "fr"];

/**
 * Invariants de contenu. C'est le test le plus rentable du lot : il attrape les
 * fautes de rédaction (leçon inexistante, consigne manquante, traduction vide)
 * que ni le typecheck ni un test de rendu ne verraient.
 */
describe("programme du tutoriel", () => {
  it("a des identifiants d'étape uniques et résolvables", () => {
    const ids = STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(stepIndexById(id)).toBeGreaterThanOrEqual(0);
    expect(stepIndexById("inconnu")).toBe(-1);
  });

  it("rattache chaque étape à un chapitre déclaré", () => {
    const known = new Set(CHAPTERS.map((chapter) => chapter.id));
    for (const step of STEPS) expect(known.has(step.chapter)).toBe(true);
  });

  it("pointe uniquement des leçons Tide School qui existent", () => {
    for (const step of STEPS) {
      for (const slug of [step.lesson, ...(step.extraLessons ?? [])]) {
        if (slug === undefined) continue;
        expect(getArticle(slug, "en"), `leçon inconnue: ${slug}`).toBeDefined();
      }
    }
  });

  it("donne une consigne et un message de validation à toute étape actionnable", () => {
    for (const step of STEPS) {
      if (step.goal.kind === "read") continue;
      for (const locale of LOCALES) {
        expect(step.task?.[locale], `task ${locale} manquante: ${step.id}`).toBeTruthy();
        expect(step.done?.[locale], `done ${locale} manquant: ${step.id}`).toBeTruthy();
      }
    }
  });

  it("rend un contenu non vide dans les deux langues", () => {
    for (const locale of LOCALES) {
      for (const step of localizedSteps(locale)) {
        expect(step.title.trim(), `titre vide: ${step.id}`).not.toBe("");
        expect(step.key.trim(), `idée-clé vide: ${step.id}`).not.toBe("");
        expect(step.blocks.length, `aucun bloc: ${step.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("couvre les sujets que le repositionnement promet", () => {
    const ids = new Set(STEPS.map((step) => step.id));
    // La landing promet perps, levier, ordres et risque : le tuto doit les tenir.
    for (const required of [
      "what-is-a-perp",
      "leverage",
      "liquidation",
      "stop-loss",
      "take-profit",
      "position-sizing",
      "limit-order",
      "market-order",
    ]) {
      expect(ids.has(required), `étape manquante: ${required}`).toBe(true);
    }
  });

  it("garde les perps et le risque comme de vrais chapitres, jamais une mention", () => {
    // Ce sont les deux sujets que les plateformes classiques n'expliquent pas,
    // et la liste de coupe ne doit jamais les entamer. On mesure une taille
    // absolue plutôt qu'un ratio : depuis que chaque contrôle du ticket a son
    // étape, le chapitre « ordres » est légitimement le plus gros.
    const count = (chapter: string) => STEPS.filter((s) => s.chapter === chapter).length;
    expect(count("perps")).toBeGreaterThanOrEqual(5);
    expect(count("risk")).toBeGreaterThanOrEqual(4);
    expect(count("perps") + count("risk")).toBeGreaterThanOrEqual(9);
  });

  it("présente chaque contrôle du ticket au moins une fois", () => {
    // La demande est explicite : le tutoriel doit passer sur chaque bouton.
    const lit = new Set(STEPS.map((step) => step.spotlight).filter(Boolean));
    for (const control of [
      "ticket.product",
      "ticket.orderKind",
      "ticket.limit",
      "ticket.execution",
      "ticket.side",
      "ticket.amount",
      "ticket.pcts",
      "ticket.leverage",
      "ticket.tp",
      "ticket.sl",
      "ticket.summary",
      "ticket.place",
    ]) {
      expect(lit.has(control as never), `contrôle jamais présenté : ${control}`).toBe(true);
    }
  });

  it("présente aussi les zones hors ticket", () => {
    const lit = new Set(STEPS.map((step) => step.spotlight).filter(Boolean));
    for (const zone of ["watchlist", "chart.price", "chart.mode", "book", "blotter", "blotter.equity", "blotter.close", "accelerate"]) {
      expect(lit.has(zone as never), `zone jamais présentée : ${zone}`).toBe(true);
    }
  });

  it("ne promet jamais l'absence de risque (règle de promotion financière)", () => {
    const flat = JSON.stringify(STEPS).toLowerCase();
    for (const banned of ["risk-free", "sans risque", "zéro risque", "zero risk"]) {
      expect(flat, `formule interdite: ${banned}`).not.toContain(banned);
    }
  });

  it("résout les ancres de section quand une étape en déclare une", () => {
    for (const step of STEPS) {
      if (step.lesson === undefined) continue;
      const article = getArticle(step.lesson, "en");
      expect(article).toBeDefined();
      // Le sommaire doit être exploitable pour un deep-link éventuel.
      expect(tableOfContents(article?.blocks ?? []).length).toBeGreaterThan(0);
    }
  });
});
