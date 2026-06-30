import { describe, it, expect } from "vitest";
import { InvalidPriceError, type Position } from "@tide/core";
import {
  SettlementService,
  SettlementError,
  type VaultClient,
} from "../src/index";

/** Fake de `VaultClient` : enregistre les appels pour assertions, sans RPC. */
class FakeVault implements VaultClient {
  public opens: Array<{ account: string; margin: bigint; fee: bigint }> = [];
  public closes: Array<{ account: string; marginRelease: bigint; pnl: bigint }> = [];
  #collateral = new Map<string, bigint>();

  openAccounting(account: string, margin: bigint, fee: bigint): Promise<void> {
    this.opens.push({ account, margin, fee });
    return Promise.resolve();
  }
  closeAccounting(account: string, marginRelease: bigint, pnl: bigint): Promise<void> {
    this.closes.push({ account, marginRelease, pnl });
    return Promise.resolve();
  }
  collateralOf(account: string): Promise<bigint> {
    return Promise.resolve(this.#collateral.get(account) ?? 0n);
  }
  seedCollateral(account: string, amount: bigint): void {
    this.#collateral.set(account, amount);
  }
}

function pos(overrides: Partial<Position> = {}): Position {
  return {
    id: "p1",
    product: "perp",
    symbol: "XRP",
    side: "long",
    qty: 100,
    entry: 2,
    leverage: 5,
    margin: 40,
    fee: 0.12,
    ...overrides,
  };
}

describe("SettlementService", () => {
  it("refuse des décimales invalides (fail-fast au constructeur)", () => {
    const vault = new FakeVault();
    expect(() => new SettlementService(vault, { collateralDecimals: -1 })).toThrow(SettlementError);
    expect(() => new SettlementService(vault, { collateralDecimals: 1.5 })).toThrow(SettlementError);
    expect(() => new SettlementService(vault, { collateralDecimals: 37 })).toThrow(SettlementError); // borne haute (audit)
    expect(() => new SettlementService(vault, { collateralDecimals: 100 })).toThrow(SettlementError);
  });

  it("openPosition : envoie marge+fee en unités de base", async () => {
    const vault = new FakeVault();
    const svc = new SettlementService(vault, { collateralDecimals: 6 });
    await svc.openPosition("0xabc", 40, 0.12);
    expect(vault.opens).toEqual([{ account: "0xabc", margin: 40_000_000n, fee: 120_000n }]);
  });

  it("openPosition : rejette margin/fee invalides", async () => {
    const vault = new FakeVault();
    const svc = new SettlementService(vault, { collateralDecimals: 6 });
    await expect(svc.openPosition("0xabc", -1, 0)).rejects.toThrow(SettlementError);
    await expect(svc.openPosition("0xabc", 1, Number.NaN)).rejects.toThrow(SettlementError);
  });

  it("closePosition : envoie marge release + PnL positif", async () => {
    const vault = new FakeVault();
    const svc = new SettlementService(vault, { collateralDecimals: 6 });
    await svc.closePosition("0xabc", pos(), 2.5); // gain +50
    expect(vault.closes).toEqual([{ account: "0xabc", marginRelease: 40_000_000n, pnl: 50_000_000n }]);
  });

  it("closePosition : PnL plafonné à -marge (isolated)", async () => {
    const vault = new FakeVault();
    const svc = new SettlementService(vault, { collateralDecimals: 6 });
    await svc.closePosition("0xabc", pos(), 1); // perte brute -100 → plafond -40
    expect(vault.closes[0]?.pnl).toBe(-40_000_000n);
    expect(vault.closes[0]?.pnl).toBe(-(vault.closes[0]?.marginRelease ?? 0n));
  });

  it("closePosition : prix aberrant remonté", async () => {
    const vault = new FakeVault();
    const svc = new SettlementService(vault, { collateralDecimals: 6 });
    await expect(svc.closePosition("0xabc", pos(), 0)).rejects.toThrow(InvalidPriceError);
    await expect(svc.closePosition("0xabc", pos(), Number.NaN)).rejects.toThrow(InvalidPriceError);
    expect(vault.closes).toEqual([]); // aucun appel vault sur entrée invalide
  });

  it("closePosition : id de position ≠ adresse de compte (séparation explicite)", async () => {
    const vault = new FakeVault();
    const svc = new SettlementService(vault, { collateralDecimals: 6 });
    const p: Position = pos({ id: "local-uuid-1" });
    await svc.closePosition("0xEVMaddress", p, 2.5);
    expect(vault.closes[0]?.account).toBe("0xEVMaddress"); // pas "local-uuid-1"
  });

  it("collateralOf : délègue au vault", async () => {
    const vault = new FakeVault();
    vault.seedCollateral("0xabc", 123_456_000n);
    const svc = new SettlementService(vault, { collateralDecimals: 6 });
    await expect(svc.collateralOf("0xabc")).resolves.toBe(123_456_000n);
    await expect(svc.collateralOf("0xinconnu")).resolves.toBe(0n);
  });
});