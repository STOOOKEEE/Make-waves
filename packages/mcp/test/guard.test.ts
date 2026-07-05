import { describe, it, expect } from "vitest";
import { enforceRiskLimits } from "../src/lib/guard";
import { McpError } from "../src/lib/errors";
import type { Mandate } from "../src/types";

const mandate = (overrides: Partial<Mandate> = {}): Mandate => ({
  id: "m1", agentId: "a1", userId: "u1",
  capitalMax: 1000, perteMaxJour: 50, maxTradesPerDay: 5, maxLeverage: 3,
  pairesAutorisees: ["BTC", "ETH"], style: null,
  validUntil: Date.now() + 60_000, signedAt: 0, signature: "x", status: "active",
  ...overrides,
});

describe("enforceRiskLimits", () => {
  it("passes when all limits respected", async () => {
    await expect(enforceRiskLimits({
      mandate: mandate(),
      symbol: "BTC", side: "buy", qty: 0.01, leverage: 1,
      capitalEngaged: 100, perteJour: 0, tradesJour: 0, priceUsd: 30000,
    })).resolves.toBeUndefined();
  });
  it("rejects when symbol not in pairesAutorisees", async () => {
    await expect(enforceRiskLimits({
      mandate: mandate(), symbol: "DOGE", side: "buy", qty: 0.01, leverage: 1,
      capitalEngaged: 0, perteJour: 0, tradesJour: 0, priceUsd: 0.1,
    })).rejects.toMatchObject({ code: "RISK_LIMIT" });
  });
  it("rejects when capitalEngaged + trade > capitalMax", async () => {
    await expect(enforceRiskLimits({
      mandate: mandate(), symbol: "BTC", side: "buy", qty: 0.05, leverage: 1,
      capitalEngaged: 900, perteJour: 0, tradesJour: 0, priceUsd: 30000,
    })).rejects.toMatchObject({ code: "RISK_LIMIT" });
  });
  it("rejects when tradesJour + 1 > maxTradesPerDay", async () => {
    await expect(enforceRiskLimits({
      mandate: mandate(), symbol: "BTC", side: "buy", qty: 0.001, leverage: 1,
      capitalEngaged: 0, perteJour: 0, tradesJour: 5, priceUsd: 30000,
    })).rejects.toMatchObject({ code: "RISK_LIMIT" });
  });
  it("rejects when leverage > maxLeverage", async () => {
    await expect(enforceRiskLimits({
      mandate: mandate(), symbol: "BTC", side: "buy", qty: 0.001, leverage: 10,
      capitalEngaged: 0, perteJour: 0, tradesJour: 0, priceUsd: 30000,
    })).rejects.toMatchObject({ code: "RISK_LIMIT" });
  });
  it("rejects when perteJour exceeds perteMaxJour", async () => {
    await expect(enforceRiskLimits({
      mandate: mandate({ perteMaxJour: 10 }), symbol: "BTC", side: "buy", qty: 0.001, leverage: 1,
      capitalEngaged: 0, perteJour: 10, tradesJour: 0, priceUsd: 30000,
    })).rejects.toMatchObject({ code: "RISK_LIMIT" });
  });
  it("rejects negative or zero qty", async () => {
    await expect(enforceRiskLimits({
      mandate: mandate(), symbol: "BTC", side: "buy", qty: 0, leverage: 1,
      capitalEngaged: 0, perteJour: 0, tradesJour: 0, priceUsd: 30000,
    })).rejects.toMatchObject({ code: "INVALID_PARAMS" });
  });
});