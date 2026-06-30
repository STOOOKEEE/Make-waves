import { describe, it, expect } from "vitest";
import {
  positionPnl,
  equityWithPositions,
  reservedMargin,
  availableMargin,
  validateOpenPosition,
  InvalidPriceError,
  InvalidPositionError,
  MissingPriceError,
} from "../src/index";
import type { OpenPositionInput, Position } from "../src/index";

const QUOTE = "USD";

function position(overrides: Partial<Position> = {}): Position {
  return {
    id: "pos-1",
    product: "perp",
    symbol: "XRP",
    side: "long",
    qty: 100,
    entry: 2,
    leverage: 5,
    margin: 40,
    fee: 0.24,
    ...overrides,
  };
}

function openInput(overrides: Partial<OpenPositionInput> = {}): OpenPositionInput {
  return {
    product: "perp",
    symbol: "XRP",
    side: "long",
    qty: 100,
    entry: 2,
    leverage: 5,
    margin: 40,
    fee: 0.24,
    ...overrides,
  };
}

describe("positionPnl", () => {
  it("long : gain quand le prix monte", () => {
    expect(positionPnl(position(), 2.5)).toBeCloseTo(50);
  });

  it("long : perte quand le prix baisse", () => {
    expect(positionPnl(position(), 1.5)).toBeCloseTo(-50);
  });

  it("short : gain quand le prix baisse", () => {
    expect(positionPnl(position({ side: "short" }), 1.5)).toBeCloseTo(50);
  });

  it("short : perte quand le prix monte", () => {
    expect(positionPnl(position({ side: "short" }), 2.5)).toBeCloseTo(-50);
  });

  it("rejette un mark price aberrant", () => {
    expect(() => positionPnl(position(), 0)).toThrow(InvalidPriceError);
    expect(() => positionPnl(position(), -1)).toThrow(InvalidPriceError);
    expect(() => positionPnl(position(), Number.NaN)).toThrow(InvalidPriceError);
  });
});

describe("equityWithPositions", () => {
  it("sans position = equity des soldes seuls", () => {
    const balances = { USD: 1000, XRP: 10 };
    const prices = { XRP: 2 };
    expect(equityWithPositions(balances, [], prices, QUOTE)).toBeCloseTo(1020);
  });

  it("ajoute le PnL non réalisé des positions", () => {
    // Cash 1000 (marge 40 incluse) + position long 100 XRP @2, mark 2.5 → +50.
    const balances = { USD: 1000 };
    const prices = { XRP: 2.5 };
    expect(equityWithPositions(balances, [position()], prices, QUOTE)).toBeCloseTo(1050);
  });

  it("combine soldes spot et PnL de position", () => {
    const balances = { USD: 1000, XRP: 10 };
    const prices = { XRP: 2.5 };
    // soldes : 1000 + 10*2.5 = 1025 ; position : +50 → 1075.
    expect(equityWithPositions(balances, [position()], prices, QUOTE)).toBeCloseTo(1075);
  });

  it("lève si une position porte sur une devise sans prix", () => {
    expect(() => equityWithPositions({ USD: 1000 }, [position()], {}, QUOTE)).toThrow(
      MissingPriceError,
    );
  });
});

describe("reservedMargin / availableMargin", () => {
  it("reservedMargin somme les marges", () => {
    expect(reservedMargin([position({ margin: 40 }), position({ margin: 60 })])).toBeCloseTo(100);
  });

  it("availableMargin = cash - marge réservée", () => {
    expect(availableMargin({ USD: 1000 }, [position({ margin: 40 })], QUOTE)).toBeCloseTo(960);
  });

  it("availableMargin jamais négatif", () => {
    expect(availableMargin({ USD: 30 }, [position({ margin: 40 })], QUOTE)).toBe(0);
  });

  it("availableMargin = cash quand aucune position", () => {
    expect(availableMargin({ USD: 500 }, [], QUOTE)).toBeCloseTo(500);
  });
});

describe("validateOpenPosition", () => {
  it("accepte une entrée valide", () => {
    expect(() => validateOpenPosition(openInput())).not.toThrow();
  });

  it("rejette un produit inconnu", () => {
    expect(() =>
      validateOpenPosition(openInput({ product: "future" as OpenPositionInput["product"] })),
    ).toThrow(InvalidPositionError);
  });

  it("rejette un symbole vide", () => {
    expect(() => validateOpenPosition(openInput({ symbol: "  " }))).toThrow(InvalidPositionError);
  });

  it("rejette un sens invalide", () => {
    expect(() =>
      validateOpenPosition(openInput({ side: "buy" as OpenPositionInput["side"] })),
    ).toThrow(InvalidPositionError);
  });

  it("rejette une quantité non positive", () => {
    expect(() => validateOpenPosition(openInput({ qty: 0 }))).toThrow(InvalidPositionError);
    expect(() => validateOpenPosition(openInput({ qty: Number.NaN }))).toThrow(InvalidPositionError);
  });

  it("rejette un prix d'entrée non positif", () => {
    expect(() => validateOpenPosition(openInput({ entry: 0 }))).toThrow(InvalidPositionError);
  });

  it("rejette un levier hors bornes", () => {
    expect(() => validateOpenPosition(openInput({ leverage: 0.5 }))).toThrow(InvalidPositionError);
    expect(() => validateOpenPosition(openInput({ leverage: 1000 }))).toThrow(InvalidPositionError);
  });

  it("rejette une marge non positive", () => {
    expect(() => validateOpenPosition(openInput({ margin: 0 }))).toThrow(InvalidPositionError);
  });

  it("rejette des frais négatifs", () => {
    expect(() => validateOpenPosition(openInput({ fee: -1 }))).toThrow(InvalidPositionError);
  });

  it("accepte des frais nuls", () => {
    expect(() => validateOpenPosition(openInput({ fee: 0 }))).not.toThrow();
  });
});
