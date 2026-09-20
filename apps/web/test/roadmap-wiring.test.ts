// @vitest-environment happy-dom
import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TideClient } from "@tide/client";
import AppBar from "../src/components/AppBar.vue";
import LandingView from "../src/views/LandingView.vue";
import { ROUTES, useRoute } from "../src/composables/useRoute";
import { reveal } from "../src/directives/reveal";
import { setLocale } from "../src/i18n/locale";
import { useSession } from "../src/composables/useSession";
import { useWalletEntry } from "../src/composables/useWalletEntry";

/* `#/roadmap` est une page publique atteignable UNIQUEMENT depuis le footer de
 * la landing : elle doit exister dans le routeur, être liée dans la colonne
 * Ressources, et rester absente de la barre de navigation. */

/** Le client n'est utilisé que pour la vitrine du leader (lecture seule). */
function fakeLandingClient() {
  return {
    leaderboard: vi.fn().mockResolvedValue([{ rank: 1, userId: "alice", equity: 12345 }]),
  } as unknown as TideClient;
}

function fakeBarClient() {
  return {
    ensureAccount: vi.fn().mockResolvedValue(undefined),
    portfolio: vi.fn().mockResolvedValue({ equity: 10_000 }),
    leaderboard: vi.fn().mockResolvedValue([]),
  } as unknown as TideClient;
}

function mountLanding() {
  return mount(LandingView, {
    props: { client: fakeLandingClient() },
    global: { directives: { reveal } },
  });
}

/** `useRoute` n'est utilisable que dans un composant monté (hooks de cycle). */
const RouteProbe = defineComponent({
  setup() {
    const { current } = useRoute();
    return () => h("span", current.value);
  },
});

beforeEach(() => {
  localStorage.clear();
  setLocale("en");
  useSession().disconnectWallet();
  useWalletEntry().close();
  window.location.hash = "";
});

describe("#/roadmap — routage", () => {
  it("fait partie des routes du site", () => {
    expect(ROUTES).toContain("/roadmap");
  });

  it("est reconnue dans le hash", () => {
    window.location.hash = "#/roadmap";
    const wrapper = mount(RouteProbe);
    expect(wrapper.text()).toBe("/roadmap");
    wrapper.unmount();
  });
});

describe("#/roadmap — point d'entrée unique dans le footer", () => {
  it("est le dernier lien de la colonne Ressources, dans le footer", () => {
    const wrapper = mountLanding();
    const footer = wrapper.get("footer");
    const links = footer.findAll("a");
    const link = links.find((a) => a.attributes("href") === "#/roadmap");

    expect(link).toBeDefined();
    expect(link?.text()).toBe("Vision & roadmap");

    // Dernier lien de sa colonne (on ne le noie pas au milieu de la liste).
    const column = footer
      .findAll(".f-col")
      .find((col) => col.findAll("a").some((a) => a.attributes("href") === "#/roadmap"));
    const colLinks = column?.findAll("a") ?? [];
    expect(colLinks[colLinks.length - 1]?.attributes("href")).toBe("#/roadmap");

    wrapper.unmount();
  });

  it("se traduit en français", async () => {
    const wrapper = mountLanding();
    setLocale("fr");
    await flushPromises();

    const link = wrapper
      .get("footer")
      .findAll("a")
      .find((a) => a.attributes("href") === "#/roadmap");
    expect(link?.text()).toBe("Vision & feuille de route");

    wrapper.unmount();
  });

  it("navigue sans recharger la page", async () => {
    const wrapper = mountLanding();
    const link = wrapper
      .get("footer")
      .findAll("a")
      .find((a) => a.attributes("href") === "#/roadmap");

    await link?.trigger("click");
    expect(wrapper.emitted("navigate")?.at(-1)).toEqual(["/roadmap"]);

    wrapper.unmount();
  });
});

describe("#/roadmap — absente de la navigation principale", () => {
  it("n'ajoute aucun onglet à l'app-bar", () => {
    vi.useFakeTimers();
    const wrapper = mount(AppBar, {
      props: { current: "/learn", client: fakeBarClient() },
    });

    const tabs = wrapper.findAll(".tabs button, .tabs a");
    for (const tab of tabs) {
      expect(tab.attributes("href")).not.toBe("#/roadmap");
      expect(tab.text()).not.toMatch(/roadmap|feuille de route/i);
    }
    expect(wrapper.findAll('a[href="#/roadmap"]')).toHaveLength(0);

    wrapper.unmount();
    vi.useRealTimers();
  });
});
