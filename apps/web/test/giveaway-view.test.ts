// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ref } from "vue";
import type { TideClient } from "@tide/client";
import GiveawayView from "../src/views/GiveawayView.vue";
import { reveal } from "../src/directives/reveal";
import { setLocale } from "../src/i18n/locale";
import { useSession } from "../src/composables/useSession";

/**
 * `useAccountAuth` est un singleton de module qui lit son profil au chargement :
 * écrire dans localStorage depuis un test arrive trop tard. On l'injecte donc
 * ici pour piloter l'état « compte lié », qui est la seule chose que la page
 * lui demande.
 */
const auth = vi.hoisted(() => ({
  // Rempli par la factory du mock, qui est la première à pouvoir importer Vue.
  signedIn: undefined as unknown as Ref<boolean>,
  open: vi.fn(),
}));

vi.mock("../src/composables/useAccountAuth", async () => {
  const { ref } = await import("vue");
  auth.signedIn = ref(false);
  return { useAccountAuth: () => ({ signedIn: auth.signedIn, open: auth.open }) };
});

/**
 * La page ne lit que les badges : `first_trade.earned` est la preuve serveur
 * qu'un premier trade paper a eu lieu.
 */
const PAPER_USER = "paper:u1";

/**
 * La page résout d'abord l'identité comptable (session Paper), puis lit les
 * badges : `first_trade.earned` est la preuve serveur d'un premier trade.
 */
function fakeClient(firstTradeEarned: boolean) {
  return {
    setToken: vi.fn(),
    authRefreshPaper: vi.fn().mockResolvedValue({ token: "jwt", userId: PAPER_USER }),
    authPaper: vi.fn().mockResolvedValue({ token: "jwt", userId: PAPER_USER }),
    badges: vi.fn().mockResolvedValue([
      {
        code: "first_trade",
        title: "First trade",
        description: "",
        imageUrl: "",
        earned: firstTradeEarned,
        status: "unclaimed",
        nftTokenId: null,
        claimMode: "paper_reward",
      },
    ]),
  } as unknown as TideClient;
}

async function mountGiveaway(firstTradeEarned = false) {
  const client = fakeClient(firstTradeEarned);
  const wrapper = mount(GiveawayView, {
    props: { client },
    global: { directives: { reveal } },
  });
  await flushPromises();
  await flushPromises();
  return Object.assign(wrapper, { client });
}

/** Simule un compte e-mail/Google lié et l'identité comptable qui va avec. */
function signIn(): void {
  auth.signedIn.value = true;
  useSession().setPaperUser(PAPER_USER);
}

beforeEach(() => {
  localStorage.clear();
  setLocale("en");
  auth.signedIn.value = false;
  auth.open.mockClear();
  useSession().disconnectWallet();
  useSession().setPaperUser("");
});

describe("GiveawayView — page tombola", () => {
  it("annonce le lot et bascule EN↔FR", async () => {
    const wrapper = await mountGiveaway();
    expect(wrapper.get("h1").text()).toContain("AirPods Max");
    expect(wrapper.text()).toContain("Win a pair of");

    setLocale("fr");
    await flushPromises();
    expect(wrapper.text()).toContain("Gagne une paire");

    wrapper.unmount();
  });

  it("affiche les trois règles d'entrée avec leur poids", async () => {
    const wrapper = await mountGiveaway();
    const rules = wrapper.findAll(".rule");
    expect(rules).toHaveLength(3);
    expect(rules.map((r) => r.get(".rule-weight").text())).toEqual([
      "+1 entry",
      "+3 entries",
      "+2 entries",
    ]);
    wrapper.unmount();
  });

  it("part de zéro entrée pour un visiteur anonyme", async () => {
    const wrapper = await mountGiveaway(true);
    expect(wrapper.get(".entries-total strong").text()).toBe("0");
    // Le badge est bien gagné côté serveur, mais sans compte lié rien n'est
    // attribuable à une personne : la règle « compte » reste à faire.
    expect(wrapper.find(".entries-note").exists()).toBe(true);
    // Aucune session anonyme n'est ouverte au passage sur la page.
    expect(wrapper.client.badges).not.toHaveBeenCalled();
    expect(wrapper.client.authPaper).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("compte 1 pour un compte lié, 4 avec le premier trade", async () => {
    signIn();

    const noTrade = await mountGiveaway(false);
    expect(noTrade.get(".entries-total strong").text()).toBe("1");
    expect(noTrade.client.badges).toHaveBeenCalledWith(PAPER_USER);
    noTrade.unmount();

    const withTrade = await mountGiveaway(true);
    expect(withTrade.get(".entries-total strong").text()).toBe("4");
    expect(withTrade.findAll(".rule.done")).toHaveLength(2);
    withTrade.unmount();
  });

  it("annonce le parrainage sans le compter tant que le backend n'existe pas", async () => {
    signIn();
    const wrapper = await mountGiveaway(true);

    const referral = wrapper.findAll(".rule")[2];
    expect(referral?.classes()).toContain("pending");
    expect(referral?.get(".soon").text()).toBe("Opening soon");
    // +2 annoncées, mais le total reste 1 + 3.
    expect(wrapper.get(".entries-total strong").text()).toBe("4");

    wrapper.unmount();
  });

  it("n'affiche aucun total global d'entrées (règle growth sur la traction)", async () => {
    const wrapper = await mountGiveaway(true);
    // Le seul compteur de la page est le compteur personnel.
    expect(wrapper.findAll(".entries-total")).toHaveLength(1);
    expect(wrapper.text()).toContain("Your entries");
    for (const forbidden of ["participants", "people entered", "total entries"]) {
      expect(wrapper.text().toLowerCase()).not.toContain(forbidden);
    }
    wrapper.unmount();
  });

  it("porte les deux mentions obligatoires, Apple et X", async () => {
    const wrapper = await mountGiveaway();
    const text = wrapper.text();
    expect(text).toContain("Apple is not a sponsor of this promotion");
    expect(text).toContain("in no way sponsored, endorsed or administered by, or associated with, X");
    wrapper.unmount();
  });

  it("respecte les interdits de copie en promotion financière", async () => {
    for (const lang of ["en", "fr"] as const) {
      setLocale(lang);
      const wrapper = await mountGiveaway(true);
      const text = wrapper.text().toLowerCase();
      for (const banned of [
        "risk-free",
        "sans risque",
        "prize pool",
        "cagnotte",
        "guaranteed",
        "passive income",
      ]) {
        expect(text).not.toContain(banned);
      }
      wrapper.unmount();
    }
  });

  it("renvoie vers le terminal et le tutoriel quand le trade manque", async () => {
    signIn();
    const wrapper = await mountGiveaway(false);

    const tradeRule = wrapper.findAll(".rule")[1];
    await tradeRule?.get(".rule-cta").trigger("click");
    expect(wrapper.emitted("navigate")?.[0]).toEqual(["/dashboard"]);

    await tradeRule?.get(".rule-hint a").trigger("click");
    expect(wrapper.emitted("navigate")?.[1]).toEqual(["/tutorial"]);

    wrapper.unmount();
  });
});
