import { describe, it, expect } from "vitest";
import { applyMarketOrder, balanceOf } from "../src/paper/account";
import { InsufficientBalanceError, InvalidOrderError } from "../src/errors";
import type { Balances, MarketOrderInput } from "../src/paper/types";

const PAIR = { base: "XRP", quote: "RLUSD" } as const;

function buy(amount: number, price: number): MarketOrderInput {
  return { pair: PAIR, side: "buy", amount, price };
}

function sell(amount: number, price: number): MarketOrderInput {
  return { pair: PAIR, side: "sell", amount, price };
}

describe("balanceOf", () => {
  it("retourne 0 pour une devise absente", () => {
    expect(balanceOf({}, "XRP")).toBe(0);
  });

  it("retourne le solde existant", () => {
    expect(balanceOf({ XRP: 42 }, "XRP")).toBe(42);
  });
});

describe("applyMarketOrder — achat", () => {
  it("débite la quote et crédite la base", () => {
    const start: Balances = { RLUSD: 1000 };
    const { balances, fill } = applyMarketOrder(start, buy(100, 0.5));

    expect(balances.XRP).toBe(100);
    expect(balances.RLUSD).toBe(950);
    expect(fill.quoteAmount).toBe(50);
  });

  it("lève si la quote est insuffisante", () => {
    expect(() => applyMarketOrder({ RLUSD: 10 }, buy(100, 0.5))).toThrow(
      InsufficientBalanceError,
    );
  });
});

describe("applyMarketOrder — vente", () => {
  it("débite la base et crédite la quote", () => {
    const start: Balances = { XRP: 100, RLUSD: 0 };
    const { balances, fill } = applyMarketOrder(start, sell(40, 0.5));

    expect(balances.XRP).toBe(60);
    expect(balances.RLUSD).toBe(20);
    expect(fill.quoteAmount).toBe(20);
  });

  it("lève si la base est insuffisante", () => {
    expect(() => applyMarketOrder({ XRP: 10 }, sell(40, 0.5))).toThrow(
      InsufficientBalanceError,
    );
  });

  it("lève si la base n'est pas détenue du tout", () => {
    expect(() => applyMarketOrder({}, sell(10, 0.5))).toThrow(
      InsufficientBalanceError,
    );
  });
});

describe("applyMarketOrder — validation", () => {
  it("rejette une quantité ≤ 0", () => {
    expect(() => applyMarketOrder({ RLUSD: 1000 }, buy(0, 0.5))).toThrow(
      InvalidOrderError,
    );
  });

  it("rejette un prix non fini", () => {
    expect(() =>
      applyMarketOrder({ RLUSD: 1000 }, buy(10, Number.NaN)),
    ).toThrow(InvalidOrderError);
  });

  it("rejette une paire base == quote", () => {
    const bad: MarketOrderInput = {
      pair: { base: "XRP", quote: "XRP" },
      side: "buy",
      amount: 10,
      price: 1,
    };
    expect(() => applyMarketOrder({ XRP: 1000 }, bad)).toThrow(InvalidOrderError);
  });

  it("rejette une devise vide dans la paire", () => {
    const bad: MarketOrderInput = {
      pair: { base: "", quote: "RLUSD" },
      side: "buy",
      amount: 10,
      price: 1,
    };
    expect(() => applyMarketOrder({ RLUSD: 1000 }, bad)).toThrow(
      InvalidOrderError,
    );
  });
});

describe("applyMarketOrder — immutabilité", () => {
  it("ne modifie pas les soldes d'origine", () => {
    const start: Balances = { RLUSD: 1000 };
    applyMarketOrder(start, buy(100, 0.5));
    expect(start).toEqual({ RLUSD: 1000 });
  });

  it("ne modifie pas les soldes d'origine sur une vente", () => {
    const start: Balances = { XRP: 100, RLUSD: 0 };
    applyMarketOrder(start, sell(40, 0.5));
    expect(start).toEqual({ XRP: 100, RLUSD: 0 });
  });

  it("aller-retour buy puis sell au même prix revient au capital initial", () => {
    const start: Balances = { RLUSD: 1000 };
    const afterBuy = applyMarketOrder(start, buy(100, 0.5)).balances;
    const afterSell = applyMarketOrder(afterBuy, sell(100, 0.5)).balances;
    expect(afterSell.RLUSD).toBe(1000);
    expect(afterSell.XRP).toBe(0);
  });
});
