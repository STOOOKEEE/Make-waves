// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TideClient } from "@tide/client";
import AppBar from "../src/components/AppBar.vue";
import { setLocale } from "../src/i18n/locale";
import { useSession } from "../src/composables/useSession";

/** L'app-bar rafraîchit rang et équité toutes les 4 s : on fige l'horloge. */
function fakeClient() {
  return {
    ensureAccount: vi.fn().mockResolvedValue(undefined),
    portfolio: vi.fn().mockResolvedValue({ equity: 10_000 }),
    leaderboard: vi.fn().mockResolvedValue([]),
  } as unknown as TideClient;
}

function mountBar(current = "/learn") {
  return mount(AppBar, {
    props: { current: current as never, client: fakeClient() },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  setLocale("en");
  useSession().disconnectWallet();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AppBar — hiérarchie de navigation", () => {
  it("ouvre la rangée sur l'apprentissage", () => {
    const wrapper = mountBar();
    const first = wrapper.findAll(".tabs button, .tabs a")[0];
    expect(first?.text()).toBe("Learn");
    wrapper.unmount();
  });

  it("conserve les six destinations (anti-suppression accidentelle)", () => {
    const wrapper = mountBar();
    const labels = wrapper.findAll(".tabs button, .tabs a").map((t) => t.text());
    expect(labels).toEqual([
      "Learn",
      "Trading",
      "Portfolio",
      "Leaderboard",
      "Competitions",
      "AI Arena",
    ]);
    wrapper.unmount();
  });

  it("marque l'onglet Compétitions actif sur la page de détail d'une compétition", () => {
    const wrapper = mountBar("/competition");
    const active = wrapper
      .findAll(".tabs button, .tabs a")
      .find((t) => t.attributes("aria-current") === "page");
    expect(active?.text()).toBe("Competitions");
    wrapper.unmount();
  });

  it("marque l'onglet Compétitions actif sur la tombola", () => {
    const wrapper = mountBar("/giveaway");
    const active = wrapper
      .findAll(".tabs button, .tabs a")
      .find((t) => t.attributes("aria-current") === "page");
    expect(active?.text()).toBe("Competitions");
    wrapper.unmount();
  });
});
