// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import RoadmapView from "../src/views/RoadmapView.vue";
import { reveal } from "../src/directives/reveal";
import { setLocale } from "../src/i18n/locale";
import { resolveRoadmap } from "../src/data/roadmap";

/* La page `#/roadmap` est une page de contenu pur : aucune prop, aucun appel
 * API, un seul événement `navigate`. Les tests vérifient le contrat DOM (ce que
 * le CSS et le pitch supposent) et le SEO posé/retiré au montage. */

/** Titre restauré au démontage — identique à `DEFAULT_TITLE` de useSeo.ts. */
const DEFAULT_TITLE = "TIDE — Learn to trade crypto with virtual money";

function mountRoadmap() {
  return mount(RoadmapView, { global: { directives: { reveal } } });
}

beforeEach(() => {
  localStorage.clear();
  setLocale("en");
  document.title = DEFAULT_TITLE;
});

describe("RoadmapView — page Vision & roadmap", () => {
  it("rend le hero et bascule EN↔FR", async () => {
    const wrapper = mountRoadmap();
    expect(wrapper.get("h1").text()).toContain("The XRP Ledger");
    expect(wrapper.get(".hero-lead").text()).toBe(resolveRoadmap("en").hero.lead);

    setLocale("fr");
    await flushPromises();
    expect(wrapper.get("h1").text()).toContain("Le XRP Ledger");
    expect(wrapper.get(".hero-lead").text()).toBe(resolveRoadmap("fr").hero.lead);

    wrapper.unmount();
  });

  it("rend les cinq points de la thèse", () => {
    const wrapper = mountRoadmap();
    const points = wrapper.findAll(".rm-thesis li.thesis-point");
    expect(points).toHaveLength(5);
    expect(points[0]?.get("h3").text().trim()).not.toBe("");
    expect(points[0]?.get("p").text().trim()).not.toBe("");
    wrapper.unmount();
  });

  it("rend les trois étapes produit dans l'ordre", () => {
    const wrapper = mountRoadmap();
    const stages = wrapper.findAll("article.stage");
    expect(stages).toHaveLength(3);
    expect(stages.map((s) => s.attributes("data-stage"))).toEqual([
      "learn",
      "prove",
      "trade",
    ]);
    expect(stages[0]?.get(".n").text()).toBe("01");
    expect(stages[0]?.findAll("dl.stage-facts dd").length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it("marque les quatre phases dans l'ordre, chacune avec ses points", () => {
    const wrapper = mountRoadmap();
    const phases = wrapper.findAll(".rm-roadmap li.phase");
    expect(phases).toHaveLength(4);
    expect(phases.map((p) => p.attributes("data-status"))).toEqual([
      "now",
      "next",
      "then",
      "later",
    ]);
    for (const phase of phases) {
      expect(phase.findAll("ul.phase-items > li").length).toBeGreaterThanOrEqual(2);
    }
    expect(wrapper.findAll('li.phase[data-status="now"]')).toHaveLength(1);
    wrapper.unmount();
  });

  it("rend la section DEX : un badge et trois étapes", () => {
    const wrapper = mountRoadmap();
    const dex = wrapper.get(".rm-dex");
    expect(dex.find(".dex-badge").exists()).toBe(true);
    expect(dex.get(".dex-badge").text().trim()).not.toBe("");
    expect(dex.findAll("li.dex-step")).toHaveLength(3);
    wrapper.unmount();
  });

  it("rend le bloc technique délimité : parcours, primitives et stack", () => {
    const wrapper = mountRoadmap();
    const tech = wrapper.get(".rm-tech");

    // Bloc réservé aux ingénieurs XRPL : il s'ouvre sur son étiquette.
    const first = tech.element.firstElementChild;
    expect(first?.tagName).toBe("P");
    expect(first?.classList.contains("lab")).toBe(true);

    const steps = tech.findAll("li.flow-step");
    expect(steps).toHaveLength(5);
    // Un trade fictif et une simple connexion de wallet n'émettent rien.
    for (const i of [1, 4]) {
      expect(steps[i]?.find(".tx-none").exists()).toBe(true);
      expect(steps[i]?.find("ul.tx").exists()).toBe(false);
    }
    expect(steps[0]?.findAll("ul.tx li").length).toBeGreaterThan(0);

    expect(tech.findAll("li.primitive")).toHaveLength(8);
    expect(tech.findAll("li.tech-group")).toHaveLength(6);
    wrapper.unmount();
  });

  it("ne garde aucune section de l'ancien modèle de contenu", () => {
    const wrapper = mountRoadmap();
    for (const gone of [".rm-problem", ".rm-funding", ".rm-xrpl", ".rm-hackathon"]) {
      expect(wrapper.find(gone).exists()).toBe(false);
    }
    wrapper.unmount();
  });

  it("n'utilise que le bleu comme accent décoratif (doré, up/down et ombres réservés)", () => {
    // Les couleurs vivent dans le <style scoped>, jamais en style inline : le
    // test lit donc la source du composant, pas le DOM rendu — et il la lit en
    // entier, pour attraper aussi une couleur réservée posée dans le template.
    const file = join(dirname(fileURLToPath(import.meta.url)), "../src/views/RoadmapView.vue");
    const source = readFileSync(file, "utf8");
    // Les tokens réservés, mais aussi leur valeur en dur (tokens.css) : doré,
    // hausse, baisse, mode Live, projecteur du tutoriel.
    expect(source).not.toMatch(
      /--gold|--up\b|--down\b|--live\b|--guide|box-shadow|#ffd66b|#bff6ce|#ffb9ac|#ff9d3c/i,
    );
  });

  it("enchaîne les niveaux de titre sans en sauter un", () => {
    const wrapper = mountRoadmap();
    const levels = [...wrapper.element.querySelectorAll("h1, h2, h3, h4")].map((el) =>
      Number(el.tagName.slice(1)),
    );
    expect(levels[0]).toBe(1);
    // En descendant, on ne saute jamais un niveau (h2 → h4 est un trou).
    const jumps = levels
      .map((level, i) => ({ from: levels[i - 1] ?? level, to: level }))
      .filter((step) => step.to > step.from + 1)
      .map((step) => `h${step.from} → h${step.to}`);
    expect(jumps).toEqual([]);
    wrapper.unmount();
  });

  it("navigue depuis les CTA d'étape et le CTA final", async () => {
    const wrapper = mountRoadmap();

    await wrapper.findAll("a.stage-cta")[0]?.trigger("click");
    expect(wrapper.emitted("navigate")?.[0]).toEqual(["/learn"]);

    const finals = wrapper.findAll(".rm-final a.pill");
    expect(finals.length).toBe(2);
    await finals[0]?.trigger("click");
    expect(wrapper.emitted("navigate")?.[1]).toEqual(["/dashboard"]);
    await finals[1]?.trigger("click");
    expect(wrapper.emitted("navigate")?.[2]).toEqual(["/learn"]);

    wrapper.unmount();
  });

  it("rend à index.html ses balises statiques au démontage", async () => {
    // En prod, <meta name="description"> et <link rel="canonical"> existent
    // déjà dans index.html : la page les écrase le temps de sa visite, puis
    // doit les restaurer — sinon tous les autres écrans héritent du roadmap.
    const meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "description du site");
    document.head.appendChild(meta);
    const canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", "https://tidetrade.xyz/");
    document.head.appendChild(canonical);

    const wrapper = mountRoadmap();
    await flushPromises();
    expect(meta.getAttribute("content")).toBe(resolveRoadmap("en").hero.seoDescription);

    wrapper.unmount();
    await flushPromises();
    expect(meta.getAttribute("content")).toBe("description du site");
    expect(canonical.getAttribute("href")).toBe("https://tidetrade.xyz/");
    // Les balises créées par la page, elles, disparaissent.
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();

    meta.remove();
    canonical.remove();
  });

  it("pose son titre de page et le rend au démontage", async () => {
    const wrapper = mountRoadmap();
    await flushPromises();
    expect(document.title).toContain("Vision & roadmap");

    setLocale("fr");
    await flushPromises();
    expect(document.title).toContain("Vision & feuille de route");

    wrapper.unmount();
    await flushPromises();
    expect(document.title).toBe(DEFAULT_TITLE);
  });
});
