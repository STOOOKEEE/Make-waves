import { describe, it, expect } from "vitest";
import { PaperService } from "../src/services/paper-service";
import { InMemoryAccountStore } from "../src/store/account-store";
import { SqliteAccountStore } from "../src/store/sqlite-account-store";
import type { AccountStore } from "../src/store/account-store";
import { InsufficientBalanceError, type MarketOrderInput } from "@tide/core";

const PRICES = { XRP: 0.5 };

function buy(amount: number, price: number): MarketOrderInput {
  return { pair: { base: "XRP", quote: "RLUSD" }, side: "buy", amount, price };
}

const stores: ReadonlyArray<{ name: string; make: () => AccountStore }> = [
  { name: "InMemory", make: () => new InMemoryAccountStore() },
  { name: "Sqlite", make: () => new SqliteAccountStore() },
];

for (const { name, make } of stores) {
  describe(`PaperService + ${name}AccountStore (comportement identique)`, () => {
    it("ouvre, trade et reflète les soldes", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      expect(service.balancesOf("a")).toEqual({ RLUSD: 1000 });

      service.placeOrder("a", buy(100, 0.5));
      expect(service.balancesOf("a")).toEqual({ RLUSD: 950, XRP: 100 });
      expect(service.ordersOf("a")).toHaveLength(1);
      expect(service.equityOf("a", PRICES)).toBe(1000);
    });

    it("persiste l'historique des ordres dans l'ordre d'exécution", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      service.placeOrder("a", buy(10, 0.5));
      service.placeOrder("a", buy(20, 0.5));
      expect(service.ordersOf("a").map((o) => o.amount)).toEqual([10, 20]);
    });

    it("solde insuffisant : état intact (atomicité)", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      expect(() => service.placeOrder("a", buy(10_000, 0.5))).toThrow(
        InsufficientBalanceError,
      );
      expect(service.balancesOf("a")).toEqual({ RLUSD: 1000 });
      expect(service.ordersOf("a")).toHaveLength(0);
    });

    it("classe plusieurs comptes par equity", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      service.openAccount("b");
      service.placeOrder("b", buy(2000, 0.5)); // b: 0 RLUSD + 2000 XRP
      const board = service.leaderboard({ XRP: 0.6 });
      expect(board.map((e) => e.userId)).toEqual(["b", "a"]);
      expect(board[0]?.equity).toBe(1200);
    });

    it("ne fuit pas la référence des soldes", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      (service.balancesOf("a") as Record<string, number>).RLUSD = 1;
      expect(service.balancesOf("a")).toEqual({ RLUSD: 1000 });
    });

    it("ouvre une position perp : marge réservée, frais débités, equity inclut le PnL", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      const pos = service.openPosition("a", {
        product: "perp",
        symbol: "XRP",
        side: "long",
        qty: 1000,
        entry: 0.5,
        leverage: 5,
        margin: 100,
        fee: 1,
      });
      expect(pos.id).not.toBe("");
      expect(service.balancesOf("a")).toEqual({ RLUSD: 999 }); // cash - fee
      expect(service.equityOf("a", { XRP: 0.5 })).toBeCloseTo(999); // PnL nul à l'entrée
      expect(service.equityOf("a", { XRP: 0.6 })).toBeCloseTo(1099); // +100 de PnL
      expect(service.positionsOf("a")).toHaveLength(1);
    });

    it("ferme une position perp : PnL réalisé crédité au cash", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      const pos = service.openPosition("a", {
        product: "perp",
        symbol: "XRP",
        side: "long",
        qty: 1000,
        entry: 0.5,
        leverage: 5,
        margin: 100,
        fee: 0,
      });
      const { realizedPnl } = service.closePosition("a", pos.id, { XRP: 0.6 });
      expect(realizedPnl).toBeCloseTo(100);
      expect(service.balancesOf("a")).toEqual({ RLUSD: 1100 });
      expect(service.positionsOf("a")).toHaveLength(0);
    });

    it("plafonne la perte à la marge à la fermeture (isolated margin)", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      const pos = service.openPosition("a", {
        product: "perp",
        symbol: "XRP",
        side: "long",
        qty: 1000,
        entry: 0.5,
        leverage: 5,
        margin: 100,
        fee: 0,
      });
      // PnL brut = (0.1 - 0.5) * 1000 = -400, plafonné à -100 (la marge).
      const { realizedPnl } = service.closePosition("a", pos.id, { XRP: 0.1 });
      expect(realizedPnl).toBe(-100);
      expect(service.balancesOf("a")).toEqual({ RLUSD: 900 });
    });

    it("refuse une marge supérieure au cash disponible", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      expect(() =>
        service.openPosition("a", {
          product: "perp",
          symbol: "XRP",
          side: "long",
          qty: 1,
          entry: 0.5,
          leverage: 1,
          margin: 2000,
          fee: 0,
        }),
      ).toThrow(InsufficientBalanceError);
    });

    it("classe les comptes en incluant le PnL des positions", () => {
      const service = new PaperService(1000, make());
      service.openAccount("a");
      service.openAccount("b");
      service.openPosition("b", {
        product: "perp",
        symbol: "XRP",
        side: "long",
        qty: 1000,
        entry: 0.5,
        leverage: 5,
        margin: 100,
        fee: 0,
      });
      const board = service.leaderboard({ XRP: 0.6 }); // b : 1000 cash + 100 PnL
      expect(board.map((e) => e.userId)).toEqual(["b", "a"]);
      expect(board[0]?.equity).toBeCloseTo(1100);
    });
  });
}

describe("SqliteAccountStore — spécifique", () => {
  it("retourne undefined pour un compte absent", () => {
    const store = new SqliteAccountStore();
    expect(store.has("x")).toBe(false);
    expect(store.getBalances("x")).toBeUndefined();
    expect(store.getOrders("x")).toBeUndefined();
    store.close();
  });

  it("persiste plusieurs devises pour un compte", () => {
    const store = new SqliteAccountStore();
    store.open("a", { RLUSD: 1000, XRP: 50 });
    expect(store.getBalances("a")).toEqual({ RLUSD: 1000, XRP: 50 });
    expect(store.snapshots()).toEqual([
      { userId: "a", balances: { RLUSD: 1000, XRP: 50 }, positions: [] },
    ]);
    store.close();
  });

  it("persiste et relit les positions ouvertes", () => {
    const store = new SqliteAccountStore();
    store.open("a", { RLUSD: 1000 });
    store.openPosition("a", { RLUSD: 999 }, {
      id: "pos-1",
      product: "perp",
      symbol: "XRP",
      side: "short",
      qty: 200,
      entry: 0.5,
      leverage: 3,
      margin: 33.3,
      fee: 1,
    });
    expect(store.getPositions("a")).toEqual([
      {
        id: "pos-1",
        product: "perp",
        symbol: "XRP",
        side: "short",
        qty: 200,
        entry: 0.5,
        leverage: 3,
        margin: 33.3,
        fee: 1,
      },
    ]);
    store.closePosition("a", { RLUSD: 1010 }, "pos-1");
    expect(store.getPositions("a")).toEqual([]);
    expect(store.getBalances("a")).toEqual({ RLUSD: 1010 });
    store.close();
  });
});
