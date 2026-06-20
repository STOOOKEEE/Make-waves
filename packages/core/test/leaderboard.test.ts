import { describe, it, expect } from "vitest";
import { buildLeaderboard } from "../src/leaderboard/leaderboard";
import { MissingPriceError } from "../src/errors";
import type { AccountSnapshot } from "../src/leaderboard/types";

const PRICES = { XRP: 0.5 };
const QUOTE = "RLUSD";
const START = 1000;

describe("buildLeaderboard", () => {
  it("classe les comptes par equity décroissante avec PnL", () => {
    const accounts: AccountSnapshot[] = [
      { userId: "a", balances: { RLUSD: 1000 } }, // equity 1000, pnl 0
      { userId: "b", balances: { RLUSD: 200, XRP: 2000 } }, // equity 1200, pnl +200
      { userId: "c", balances: { RLUSD: 0, XRP: 1000 } }, // equity 500, pnl -500
    ];
    const board = buildLeaderboard(accounts, PRICES, QUOTE, START);

    expect(board.map((e) => e.userId)).toEqual(["b", "a", "c"]);
    expect(board.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(board[0]?.equity).toBe(1200);
    expect(board[0]?.pnl).toBe(200);
    expect(board[2]?.pnl).toBe(-500);
  });

  it("retourne une liste vide sans compte", () => {
    expect(buildLeaderboard([], PRICES, QUOTE, START)).toEqual([]);
  });

  it("gère les ex-aequo (même rang) de façon déterministe", () => {
    const accounts: AccountSnapshot[] = [
      { userId: "z", balances: { RLUSD: 1000 } },
      { userId: "a", balances: { RLUSD: 1000 } },
    ];
    const board = buildLeaderboard(accounts, PRICES, QUOTE, START);
    expect(board.map((e) => e.userId)).toEqual(["a", "z"]);
    expect(board.map((e) => e.rank)).toEqual([1, 1]);
    // Equities égales -> PnL égaux.
    expect(board.map((e) => e.pnl)).toEqual([0, 0]);
  });

  it("lève si une devise détenue n'a pas de prix (pas de classement à l'aveugle)", () => {
    const accounts: AccountSnapshot[] = [
      { userId: "a", balances: { FOO: 10 } },
    ];
    expect(() => buildLeaderboard(accounts, PRICES, QUOTE, START)).toThrow(
      MissingPriceError,
    );
  });

  it("utilise le capital de départ par défaut quand non fourni", () => {
    const accounts: AccountSnapshot[] = [
      { userId: "a", balances: { RLUSD: 10_000 } },
    ];
    const board = buildLeaderboard(accounts, PRICES, QUOTE);
    expect(board[0]?.pnl).toBe(0); // PAPER_STARTING_EQUITY = 10_000
  });
});
