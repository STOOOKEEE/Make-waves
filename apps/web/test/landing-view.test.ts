// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TideClient } from "@tide/client";
import LandingView from "../src/views/LandingView.vue";
import { reveal } from "../src/directives/reveal";
import { setLocale } from "../src/i18n/locale";
import { useWalletEntry } from "../src/composables/useWalletEntry";
import { useSession } from "../src/composables/useSession";

/** Le client n'est utilisé que pour la vitrine du leader (lecture seule). */
function fakeClient() {
  return {
    leaderboard: vi.fn().mockResolvedValue([
      { rank: 1, userId: "alice", equity: 12345 },
    ]),
  } as unknown as TideClient;
}

/** `v-reveal` est une directive globale enregistrée dans main.ts, pas dans la vue. */
function mountLanding() {
  return mount(LandingView, {
    props: { client: fakeClient() },
    global: { directives: { reveal } },
  });
}

beforeEach(() => {
  localStorage.clear();
  setLocale("en");
  useWalletEntry().close();
  useSession().disconnectWallet();
});

describe("LandingView — repositionnement « apprendre d'abord »", () => {
  it("traduit le titre du hero (il était codé en dur hors i18n)", async () => {
    const wrapper = mountLanding();
    expect(wrapper.get(".giant").text()).toContain("Learn to");

    setLocale("fr");
    await flushPromises();
    expect(wrapper.get(".giant").text()).toContain("Apprendre");
    expect(wrapper.get(".giant").text()).not.toContain("Onchain");

    wrapper.unmount();
  });

  it("met l'apprentissage en première carte de la grille produit", () => {
    const wrapper = mountLanding();
    const first = wrapper.findAll(".feature-card")[0];
    expect(first?.attributes("href")).toBe("#/learn");
    wrapper.unmount();
  });

  it("dérive les pistes du contenu réel plutôt que de coder les chiffres en dur", () => {
    const wrapper = mountLanding();
    const chips = wrapper.findAll(".ai-chip").map((c) => c.text());
    expect(chips).toHaveLength(4);
    // 5 + 4 + 5 + 2 = les 16 leçons réellement présentes dans data/learn.
    const total = chips.reduce((sum, chip) => {
      const match = /(\d+)/.exec(chip);
      return sum + (match ? Number(match[1]) : 0);
    }, 0);
    expect(total).toBe(16);
    expect(wrapper.get(".ai-total").text()).toContain("16");
    wrapper.unmount();
  });

  it("garde le funnel wallet de l'associé sur le CTA secondaire", async () => {
    const wrapper = mountLanding();
    const entry = useWalletEntry();
    expect(entry.open.value).toBe(false);

    await wrapper.get(".cta-actions .big-pill.ghost").trigger("click");
    expect(entry.open.value).toBe(true);

    wrapper.unmount();
  });

  it("envoie le CTA principal vers Tide School, pas vers le wallet", async () => {
    const wrapper = mountLanding();
    await wrapper.get(".cta-actions .big-pill:not(.ghost)").trigger("click");
    expect(wrapper.emitted("navigate")?.at(-1)).toEqual(["/learn"]);
    expect(useWalletEntry().open.value).toBe(false);
    wrapper.unmount();
  });

  it("ne promet jamais « sans risque » (prohibited-adjacent en promotion financière)", () => {
    const wrapper = mountLanding();
    for (const locale of ["en", "fr"] as const) {
      setLocale(locale);
      const text = wrapper.text().toLowerCase();
      expect(text).not.toContain("risk-free");
      expect(text).not.toContain("zero risk");
      expect(text).not.toContain("sans risque");
      expect(text).not.toContain("zéro risque");
    }
    wrapper.unmount();
  });

  it("n'a plus de bande de stats (le CSS mort a été purgé)", () => {
    const wrapper = mountLanding();
    expect(wrapper.find(".stats").exists()).toBe(false);
    wrapper.unmount();
  });

  it("ouvre la tombola depuis le footer, et depuis nulle part ailleurs", async () => {
    const wrapper = mountLanding();
    const links = wrapper.findAll('a[href="#/giveaway"]');
    expect(links).toHaveLength(1);
    // Le seul point d'entrée est la colonne « Ressources » du footer.
    expect(wrapper.get("footer").findAll('a[href="#/giveaway"]')).toHaveLength(1);

    await links[0]?.trigger("click");
    expect(wrapper.emitted("navigate")).toContainEqual(["/giveaway"]);

    wrapper.unmount();
  });
});
