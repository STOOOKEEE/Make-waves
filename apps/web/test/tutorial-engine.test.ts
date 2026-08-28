// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { BookDepth } from "@tide/client";
import {
  closeSim,
  fillPrice,
  liquidationPrice,
  openSim,
  riskAtStop,
  simEquity,
  SIM_MAKER_FEE,
  SIM_STARTING_EQUITY,
  SIM_TAKER_FEE,
  triggerFor,
  unrealizedPnl,
  type OpenInput,
  type SimPosition,
} from "../src/lib/sandbox/engine";
import { seededRandom, walkSeries } from "../src/lib/sandbox/walk";

const book: BookDepth = {
  symbol: "BTC",
  quoteSymbol: "USDT",
  source: "test",
  asks: [{ price: 101, size: 1, total: 1 }],
  bids: [{ price: 99, size: 1, total: 1 }],
  mid: 100,
  spread: 2,
};

function open(overrides: Partial<OpenInput> = {}) {
  const input: OpenInput = {
    symbol: "BTC",
    product: "perp",
    side: "buy",
    amount: 100,
    leverage: 10,
    liquidity: "taker",
    takeProfit: null,
    stopLoss: null,
    ...overrides,
  };
  return openSim(input, 100, book, 1_000, "p1");
}

describe("moteur du bac à sable", () => {
  it("fait payer le spread à un taker, pas à un maker", () => {
    expect(fillPrice(100, "buy", "taker", book)).toBe(101);
    expect(fillPrice(100, "sell", "taker", book)).toBe(99);
    expect(fillPrice(100, "buy", "maker", book)).toBe(100);
  });

  it("applique le levier à l'exposition, jamais à la marge engagée", () => {
    const { position } = open({ amount: 100, leverage: 10 });
    expect(position.margin).toBe(100);
    // 100 $ de marge × 10 = 1000 $ d'exposition, au prix taker de 101.
    expect(position.qty * position.entry).toBeCloseTo(1000, 6);
    expect(position.fee).toBeCloseTo(1000 * SIM_TAKER_FEE, 6);
  });

  it("ignore le levier en spot", () => {
    const { position } = open({ product: "spot", leverage: 20, amount: 100 });
    expect(position.leverage).toBe(1);
    expect(position.qty * position.entry).toBeCloseTo(100, 6);
    expect(liquidationPrice(position)).toBeNull();
  });

  it("rapproche la liquidation quand le levier monte", () => {
    const at2 = open({ leverage: 2 }).position;
    const at20 = open({ leverage: 20 }).position;
    // Long : liquidation sous l'entrée. 2x → −50 %, 20x → −5 %.
    expect(liquidationPrice(at2)).toBeCloseTo(at2.entry * 0.5, 6);
    expect(liquidationPrice(at20)).toBeCloseTo(at20.entry * 0.95, 6);
  });

  it("place la liquidation d'un short au-dessus de l'entrée", () => {
    const { position } = open({ side: "sell", leverage: 10 });
    const liq = liquidationPrice(position);
    expect(liq).not.toBeNull();
    expect(liq as number).toBeGreaterThan(position.entry);
  });

  it("calcule le PnL avec la formule du domaine, dans les deux sens", () => {
    const long = open({ side: "buy" }).position;
    const short = open({ side: "sell" }).position;
    expect(unrealizedPnl(long, long.entry * 1.01)).toBeGreaterThan(0);
    expect(unrealizedPnl(long, long.entry * 0.99)).toBeLessThan(0);
    expect(unrealizedPnl(short, short.entry * 0.99)).toBeGreaterThan(0);
    expect(unrealizedPnl(short, short.entry * 1.01)).toBeLessThan(0);
  });

  it("fait primer la liquidation sur le stop, et le stop sur le take-profit", () => {
    const base = open({ leverage: 10, side: "buy" }).position;
    // Tous les seuils franchis d'un coup : un seul doit l'emporter.
    const position: SimPosition = {
      ...base,
      stopLoss: base.entry * 0.98,
      takeProfit: base.entry * 1.02,
    };
    const liq = liquidationPrice(position) as number;
    expect(triggerFor(position, liq - 1)).toBe("liquidation");
    expect(triggerFor(position, position.entry * 0.979)).toBe("stop-loss");
    expect(triggerFor(position, position.entry * 1.03)).toBe("take-profit");
    expect(triggerFor(position, position.entry)).toBeNull();
  });

  it("ne laisse jamais perdre plus que la marge engagée", () => {
    const { position } = open({ leverage: 20, amount: 100 });
    // Effondrement bien au-delà du prix de liquidation.
    const closed = closeSim(position, position.entry * 0.5, "liquidation", 2_000);
    expect(closed.pnl).toBeGreaterThanOrEqual(-position.margin);
    expect(closed.pnl).toBeCloseTo(-position.margin, 6);
  });

  it("rend une équité intacte si on ouvre et ferme au prix d'entrée, aux frais près", () => {
    const { position } = open({ liquidity: "maker", leverage: 1, product: "spot" });
    // La marge est réservée, pas dépensée : seuls les frais sortent du cash.
    const cash = SIM_STARTING_EQUITY - position.fee;
    const closed = closeSim(position, position.entry, "manual", 2_000);
    const finalEquity = cash + closed.pnl - closed.fee;
    const expectedFees = position.entry * position.qty * (SIM_MAKER_FEE + SIM_TAKER_FEE);
    expect(SIM_STARTING_EQUITY - finalEquity).toBeCloseTo(expectedFees, 6);
  });

  it("ne double-compte pas la marge dans l'équité", () => {
    const { position } = open();
    // Au prix d'entrée, le PnL est nul : l'équité vaut exactement le cash.
    expect(simEquity(10_000, [position], position.entry)).toBeCloseTo(10_000, 6);
    // Et elle suit le PnL latent, rien d'autre.
    const pnl = unrealizedPnl(position, position.entry * 1.01);
    expect(simEquity(10_000, [position], position.entry * 1.01)).toBeCloseTo(10_000 + pnl, 6);
  });

  it("chiffre la perte au stop", () => {
    expect(riskAtStop({ entry: 100, stopLoss: 95, qty: 2 })).toBe(10);
    expect(riskAtStop({ entry: 100, stopLoss: null, qty: 2 })).toBeNull();
  });
});

describe("marche de prix", () => {
  it("est reproductible à graine égale", () => {
    const a = walkSeries(100, 20, seededRandom(7));
    const b = walkSeries(100, 20, seededRandom(7));
    expect(a).toEqual(b);
    expect(walkSeries(100, 20, seededRandom(8))).not.toEqual(a);
  });

  it("reste strictement positive même sous forte volatilité", () => {
    const series = walkSeries(100, 500, seededRandom(1), { volatility: 0.4, drift: -0.2 });
    expect(series.every((price) => price > 0)).toBe(true);
  });

  it("descend sous une dérive négative imposée (scénario de liquidation)", () => {
    const series = walkSeries(100, 60, seededRandom(3), { volatility: 0.001, drift: -0.002 });
    expect(series.at(-1) as number).toBeLessThan(95);
  });
});
