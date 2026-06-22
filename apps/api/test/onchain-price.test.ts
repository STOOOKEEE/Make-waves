import { describe, it, expect } from "vitest";
import type { XrplCurrency } from "@tide/xrpl";
import { AmmOnchainPriceProvider } from "../src/feed/onchain-price";
import type { AmmPriceReader, SymbolPoolMap } from "../src/feed/onchain-price";

const ISSUER = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

const POOLS: SymbolPoolMap = {
  XRP: { asset: { currency: "XRP" }, asset2: { currency: "USD", issuer: ISSUER } },
};

class FakeReader implements AmmPriceReader {
  calls: Array<{ asset: XrplCurrency; asset2: XrplCurrency }> = [];
  constructor(private readonly price: number | Error) {}
  async ammSpotPrice(asset: XrplCurrency, asset2: XrplCurrency): Promise<number> {
    this.calls.push({ asset, asset2 });
    if (this.price instanceof Error) {
      throw this.price;
    }
    return this.price;
  }
}

describe("AmmOnchainPriceProvider", () => {
  it("lit le spot AMM pour un symbole mappé", async () => {
    const reader = new FakeReader(0.5);
    const provider = new AmmOnchainPriceProvider(reader, POOLS);
    expect(await provider.priceFor("XRP")).toBe(0.5);
    expect(reader.calls).toHaveLength(1);
  });

  it("renvoie undefined pour un symbole non mappé (sans appeler le lecteur)", async () => {
    const reader = new FakeReader(0.5);
    const provider = new AmmOnchainPriceProvider(reader, POOLS);
    expect(await provider.priceFor("ETH")).toBeUndefined();
    expect(reader.calls).toHaveLength(0);
  });

  it("laisse remonter l'erreur de lecture (gérée par l'orchestrateur)", async () => {
    const reader = new FakeReader(new Error("amm_info failed"));
    const provider = new AmmOnchainPriceProvider(reader, POOLS);
    await expect(provider.priceFor("XRP")).rejects.toThrow("amm_info failed");
  });

  it("traite un prix aberrant du lecteur comme indisponible (undefined)", async () => {
    for (const bad of [Number.NaN, 0, -1, Number.POSITIVE_INFINITY]) {
      const provider = new AmmOnchainPriceProvider(new FakeReader(bad), POOLS);
      expect(await provider.priceFor("XRP")).toBeUndefined();
    }
  });
});
