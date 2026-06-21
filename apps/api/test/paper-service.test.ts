import { describe, it, expect, beforeEach } from "vitest";
import { PaperService } from "../src/services/paper-service";
import {
  AccountExistsError,
  AccountNotFoundError,
  InvalidStartingEquityError,
  InvalidUserError,
} from "../src/services/errors";
import {
  InsufficientBalanceError,
  MissingPriceError,
  type MarketOrderInput,
} from "@tide/core";

const PRICES = { XRP: 0.5 };
const START = 1000;

function buy(amount: number, price: number): MarketOrderInput {
  return { pair: { base: "XRP", quote: "RLUSD" }, side: "buy", amount, price };
}

describe("PaperService — comptes", () => {
  let service: PaperService;
  beforeEach(() => {
    service = new PaperService(START);
  });

  it("ouvre un compte avec le capital de départ", () => {
    service.openAccount("alice");
    expect(service.balancesOf("alice")).toEqual({ RLUSD: START });
  });

  it("rejette un userId vide", () => {
    expect(() => service.openAccount("  ")).toThrow(InvalidUserError);
  });

  it("rejette un compte déjà ouvert", () => {
    service.openAccount("alice");
    expect(() => service.openAccount("alice")).toThrow(AccountExistsError);
  });

  it("lève sur un compte inconnu", () => {
    expect(() => service.balancesOf("bob")).toThrow(AccountNotFoundError);
  });

  it("rejette un capital de départ invalide", () => {
    expect(() => new PaperService(-500)).toThrow(InvalidStartingEquityError);
    expect(() => new PaperService(Number.NaN)).toThrow(
      InvalidStartingEquityError,
    );
  });
});

describe("PaperService — ordres", () => {
  let service: PaperService;
  beforeEach(() => {
    service = new PaperService(START);
    service.openAccount("alice");
  });

  it("applique un ordre et met à jour les soldes", () => {
    const fill = service.placeOrder("alice", buy(100, 0.5));
    expect(fill.quoteAmount).toBe(50);
    expect(service.balancesOf("alice")).toEqual({ RLUSD: 950, XRP: 100 });
  });

  it("enregistre l'historique des ordres", () => {
    service.placeOrder("alice", buy(10, 0.5));
    service.placeOrder("alice", buy(20, 0.5));
    expect(service.ordersOf("alice")).toHaveLength(2);
  });

  it("calcule equity et PnL après trade", () => {
    service.placeOrder("alice", buy(100, 0.5)); // 950 RLUSD + 100 XRP
    // equity = 950 + 100 * 0.5 = 1000 -> PnL 0
    expect(service.equityOf("alice", PRICES)).toBe(1000);
    expect(service.pnlOf("alice", PRICES)).toBe(0);
  });

  it("lève sur ordre pour un compte inconnu", () => {
    expect(() => service.placeOrder("bob", buy(1, 0.5))).toThrow(
      AccountNotFoundError,
    );
  });

  it("ne laisse pas muter les soldes via la référence retournée", () => {
    service.placeOrder("alice", buy(100, 0.5));
    Object.assign(service.balancesOf("alice"), { RLUSD: 1 });
    expect(service.balancesOf("alice")).toEqual({ RLUSD: 950, XRP: 100 });
  });

  it("propage le solde insuffisant et laisse le compte intact", () => {
    expect(() => service.placeOrder("alice", buy(10_000, 0.5))).toThrow(
      InsufficientBalanceError,
    );
    expect(service.balancesOf("alice")).toEqual({ RLUSD: START });
    expect(service.ordersOf("alice")).toHaveLength(0);
  });
});

describe("PaperService — leaderboard", () => {
  it("classe tous les comptes par equity", () => {
    const service = new PaperService(START);
    service.openAccount("alice");
    service.openAccount("bob");
    // bob achète du XRP qui monte: 1000 RLUSD -> 2000 XRP @0.5, prix monte à 0.6
    service.placeOrder("bob", { ...buy(2000, 0.5) });
    const board = service.leaderboard({ XRP: 0.6 });
    expect(board.map((e) => e.userId)).toEqual(["bob", "alice"]);
    expect(board[0]?.equity).toBe(1200); // 2000 * 0.6
    expect(board[0]?.pnl).toBe(200);
  });

  it("retourne une liste vide sans compte", () => {
    expect(new PaperService(START).leaderboard(PRICES)).toEqual([]);
  });

  it("lève si une devise détenue n'a pas de prix", () => {
    const service = new PaperService(START);
    service.openAccount("bob");
    service.placeOrder("bob", buy(100, 0.5)); // bob détient du XRP
    expect(() => service.leaderboard({})).toThrow(MissingPriceError);
  });
});
