// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TideClient } from "@tide/client";
import GiveawayView from "../src/views/GiveawayView.vue";
import { reveal } from "../src/directives/reveal";
import { setLocale } from "../src/i18n/locale";
import { useSession } from "../src/composables/useSession";
import { useWalletEntry } from "../src/composables/useWalletEntry";
import { useGiveawayTerms } from "../src/composables/useGiveawayTerms";

const WALLET = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";

/**
 * Sur Tide un compte EST un wallet XRPL : la page lit l'adresse connectée, puis
 * les badges, où `first_trade.earned` est la preuve serveur d'un premier trade.
 */
function fakeClient(firstTradeEarned: boolean) {
  return {
    badges: vi.fn().mockResolvedValue([
      {
        code: "first_trade",
        title: "First trade",
        description: "",
        imageUrl: "",
        earned: firstTradeEarned,
        status: "unclaimed",
        nftTokenId: null,
        claimMode: "external_wallet",
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
  return Object.assign(wrapper, { client });
}

/** Connecte un wallet XRPL, le seul « compte » qui existe sur Tide. */
function connectWallet(): void {
  useSession().setWallet(WALLET, "gem");
}

beforeEach(() => {
  localStorage.clear();
  setLocale("en");
  useSession().disconnectWallet();
  useWalletEntry().close();
  useGiveawayTerms().setAccepted(false);
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
    expect(rules[0]?.text()).toContain("Connect your wallet");
    wrapper.unmount();
  });

  it("part de zéro entrée sans wallet, et ne lit rien côté serveur", async () => {
    const wrapper = await mountGiveaway(true);
    expect(wrapper.get(".entries-total strong").text()).toBe("0");
    expect(wrapper.find(".entries-note").exists()).toBe(true);
    // Sans wallet il n'y a pas d'identité : rien à demander au serveur.
    expect(wrapper.client.badges).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("compte 1 pour un wallet connecté, 4 avec le premier trade", async () => {
    connectWallet();

    const noTrade = await mountGiveaway(false);
    expect(noTrade.get(".entries-total strong").text()).toBe("1");
    expect(noTrade.client.badges).toHaveBeenCalledWith(WALLET);
    noTrade.unmount();

    const withTrade = await mountGiveaway(true);
    expect(withTrade.get(".entries-total strong").text()).toBe("4");
    expect(withTrade.findAll(".rule.done")).toHaveLength(2);
    withTrade.unmount();
  });

  it("recalcule les entrées quand le wallet se connecte page ouverte", async () => {
    const wrapper = await mountGiveaway(true);
    expect(wrapper.get(".entries-total strong").text()).toBe("0");

    connectWallet();
    await flushPromises();
    await flushPromises();

    expect(wrapper.get(".entries-total strong").text()).toBe("4");
    wrapper.unmount();
  });

  it("n'ouvre le funnel wallet qu'une fois le règlement accepté", async () => {
    const wrapper = await mountGiveaway();
    const entry = useWalletEntry();

    // Sans acceptation, le bouton ne fait pas entrer : on ne peut pas opposer
    // une condition suspensive à quelqu'un qui n'a pas eu l'occasion de la lire.
    await wrapper.findAll(".rule")[0]?.get(".rule-cta").trigger("click");
    expect(entry.open.value).toBe(false);

    await wrapper.get(".terms-accept input").setValue(true);
    expect(useGiveawayTerms().accepted.value).toBe(true);

    await wrapper.findAll(".rule")[0]?.get(".rule-cta").trigger("click");
    expect(entry.open.value).toBe(true);

    wrapper.unmount();
  });

  it("annonce la condition sur la page, pas seulement dans le règlement", async () => {
    for (const [lang, badge, title] of [
      ["en", "If Tide wins Make Waves", "We win, you win."],
      ["fr", "Si Tide gagne Make Waves", "On gagne, tu gagnes."],
    ] as const) {
      setLocale(lang);
      const wrapper = await mountGiveaway();
      // Le bandeau est collé au titre, pas relégué dans les petites lignes :
      // c'est ce qui sépare une promesse conditionnelle d'une promesse trompeuse.
      expect(wrapper.get(".cond-badge").text()).toContain(badge);
      expect(wrapper.get(".gw-cond").text()).toContain(title);
      // Et le fait que rien n'est remis en cas de défaite est dit avant le règlement.
      expect(wrapper.get(".gw-cond").text().length).toBeGreaterThan(400);
      wrapper.unmount();
    }
  });

  it("conserve les entrées si la condition échoue, sans promettre une suite", async () => {
    const wrapper = await mountGiveaway();
    const text = wrapper.get(".gw-cond").text();
    expect(text).toContain("carried over");
    expect(text).toContain("12 months");
    wrapper.unmount();
  });

  it("explique comment obtenir un wallet plutôt que de le supposer acquis", async () => {
    const wrapper = await mountGiveaway();
    const text = wrapper.text();
    expect(text).toContain("Xaman");
    expect(text).toContain("GemWallet");
    expect(text).toContain("1 XRP");
    // Les deux applications sont téléchargeables depuis la page.
    const links = wrapper.findAll(".wallet-apps a").map((a) => a.attributes("href"));
    expect(links).toEqual(["https://xaman.app", "https://gemwallet.app"]);
    wrapper.unmount();
  });

  it("dit dans les deux langues que le wallet EST le compte", async () => {
    const en = await mountGiveaway();
    expect(en.text().toLowerCase()).toContain("your wallet is your account");
    expect(en.text().toLowerCase()).toContain("no email");
    en.unmount();

    setLocale("fr");
    const fr = await mountGiveaway();
    expect(fr.text().toLowerCase()).toContain("ton wallet est ton compte");
    expect(fr.text().toLowerCase()).toContain("pas d'e-mail");
    fr.unmount();
  });

  it("n'affiche aucun total global d'entrées (règle growth sur la traction)", async () => {
    connectWallet();
    const wrapper = await mountGiveaway(true);
    expect(wrapper.findAll(".entries-total")).toHaveLength(1);
    expect(wrapper.text()).toContain("Your entries");
    for (const forbidden of ["participants", "people entered", "total entries"]) {
      expect(wrapper.text().toLowerCase()).not.toContain(forbidden);
    }
    wrapper.unmount();
  });

  it("porte les mentions obligatoires Apple, X et la licence du modèle 3D", async () => {
    const wrapper = await mountGiveaway();
    const text = wrapper.text();
    expect(text).toContain("Apple is not a sponsor of this operation");
    expect(text).toContain("in no way sponsored, endorsed or administered by, or associated with, X");
    expect(text).toContain("XRPL Commons organises the Make Waves hackathon but does not organise this operation");
    expect(text).toContain("Creative Commons Attribution 4.0");
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
    connectWallet();
    const wrapper = await mountGiveaway(false);

    const tradeRule = wrapper.findAll(".rule")[1];
    await tradeRule?.get(".rule-cta").trigger("click");
    expect(wrapper.emitted("navigate")?.[0]).toEqual(["/dashboard"]);

    await tradeRule?.get(".rule-hint a").trigger("click");
    expect(wrapper.emitted("navigate")?.[1]).toEqual(["/tutorial"]);

    wrapper.unmount();
  });
});
