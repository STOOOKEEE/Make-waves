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
      { userId: "a", balances: { RLUSD: 1000, XRP: 50 } },
    ]);
    store.close();
  });
});
