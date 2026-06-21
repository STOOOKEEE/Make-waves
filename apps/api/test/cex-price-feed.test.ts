import { describe, it, expect } from "vitest";
import {
  fetchCexPrices,
  type CexFeedConfig,
  type FetchJson,
} from "../src/feed/cex-price-feed";
import { PriceFeedError } from "../src/feed/errors";

const CONFIG: CexFeedConfig = {
  baseUrl: "https://api.example.com/v3",
  symbolToId: { XRP: "ripple", BTC: "bitcoin" },
  vsCurrency: "usd",
};

/** fetchJson factice qui retourne une réponse fixée et capture l'URL appelée. */
function fakeFetch(response: unknown): { fetchJson: FetchJson; urls: string[] } {
  const urls: string[] = [];
  const fetchJson: FetchJson = (url) => {
    urls.push(url);
    return Promise.resolve(response);
  };
  return { fetchJson, urls };
}

describe("fetchCexPrices", () => {
  it("construit une PriceMap depuis la réponse CEX", async () => {
    const { fetchJson } = fakeFetch({ ripple: { usd: 0.5 } });
    const prices = await fetchCexPrices(CONFIG, ["XRP"], fetchJson);
    expect(prices).toEqual({ XRP: 0.5 });
  });

  it("gère plusieurs symboles", async () => {
    const { fetchJson } = fakeFetch({
      ripple: { usd: 0.5 },
      bitcoin: { usd: 60000 },
    });
    const prices = await fetchCexPrices(CONFIG, ["XRP", "BTC"], fetchJson);
    expect(prices).toEqual({ XRP: 0.5, BTC: 60000 });
  });

  it("construit l'URL avec ids et devise", async () => {
    const { fetchJson, urls } = fakeFetch({ ripple: { usd: 0.5 } });
    await fetchCexPrices(CONFIG, ["XRP"], fetchJson);
    expect(urls[0]).toBe(
      "https://api.example.com/v3/simple/price?ids=ripple&vs_currencies=usd",
    );
  });

  it("ne fait aucun appel pour une liste vide", async () => {
    const { fetchJson, urls } = fakeFetch({});
    const prices = await fetchCexPrices(CONFIG, [], fetchJson);
    expect(prices).toEqual({});
    expect(urls).toHaveLength(0);
  });

  it("lève pour un symbole non mappé", async () => {
    const { fetchJson } = fakeFetch({});
    await expect(fetchCexPrices(CONFIG, ["DOGE"], fetchJson)).rejects.toThrow(
      PriceFeedError,
    );
  });

  it("lève si l'entrée d'un id est absente", async () => {
    const { fetchJson } = fakeFetch({ ripple: { usd: 0.5 } });
    await expect(
      fetchCexPrices(CONFIG, ["XRP", "BTC"], fetchJson),
    ).rejects.toThrow(PriceFeedError);
  });

  it("lève sur un prix invalide (≤ 0, non-number)", async () => {
    const zero = fakeFetch({ ripple: { usd: 0 } });
    await expect(fetchCexPrices(CONFIG, ["XRP"], zero.fetchJson)).rejects.toThrow(
      PriceFeedError,
    );
    const str = fakeFetch({ ripple: { usd: "0.5" } });
    await expect(fetchCexPrices(CONFIG, ["XRP"], str.fetchJson)).rejects.toThrow(
      PriceFeedError,
    );
  });

  it("lève si la devise demandée est absente de l'entrée", async () => {
    const { fetchJson } = fakeFetch({ ripple: { eur: 0.5 } }); // usd manquant
    await expect(fetchCexPrices(CONFIG, ["XRP"], fetchJson)).rejects.toThrow(
      PriceFeedError,
    );
  });

  it("lève si la réponse n'est pas un objet", async () => {
    const { fetchJson } = fakeFetch("pas du json objet");
    await expect(fetchCexPrices(CONFIG, ["XRP"], fetchJson)).rejects.toThrow(
      PriceFeedError,
    );
  });
});
