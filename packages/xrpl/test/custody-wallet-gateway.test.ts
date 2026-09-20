import { describe, expect, it } from "vitest";
import { Wallet, type Transaction } from "xrpl";
import {
  XrplCustodialWalletGateway,
  type CustodyLedgerClient,
} from "../src/custody/wallet-gateway";

class FakeLedgerClient implements CustodyLedgerClient {
  prepared: Transaction | null = null;

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async autofill(tx: Transaction): Promise<Transaction> {
    this.prepared = tx;
    return { ...tx, Fee: "10", Sequence: 1, LastLedgerSequence: 100 };
  }

  async submitAndWait(): Promise<{
    result: { hash: string; meta: { TransactionResult: string } };
  }> {
    return { result: { hash: "LINKED", meta: { TransactionResult: "tesSUCCESS" } } };
  }
}

describe("XrplCustodialWalletGateway", () => {
  it("fait signer le financement du wallet 2 par le wallet 1, pas par le funder Tide", async () => {
    const operator = Wallet.generate();
    const starter = Wallet.generate();
    const reward = Wallet.generate();
    if (!operator.seed || !starter.seed) throw new Error("seed de test absente");
    const ledger = new FakeLedgerClient();
    const gateway = new XrplCustodialWalletGateway({
      serverUrl: "wss://example.test",
      funderSeed: operator.seed,
      sourceTag: 777,
      clientFactory: () => ledger,
    });

    await expect(
      gateway.fundWalletFromSeed(starter.seed, reward.classicAddress, "1210000"),
    ).resolves.toEqual({ hash: "LINKED" });

    expect(ledger.prepared).toMatchObject({
      TransactionType: "Payment",
      Account: starter.classicAddress,
      Destination: reward.classicAddress,
      Amount: "1210000",
      SourceTag: 777,
    });
    expect(ledger.prepared?.Account).not.toBe(operator.classicAddress);
  });

  it("clôture le wallet 1 par AccountDelete taggé, fee 0,2 XRP, solde à la destination", async () => {
    const operator = Wallet.generate();
    const starter = Wallet.generate();
    const reward = Wallet.generate();
    if (!operator.seed || !starter.seed) throw new Error("seed de test absente");
    const ledger = new FakeLedgerClient();
    const gateway = new XrplCustodialWalletGateway({
      serverUrl: "wss://example.test",
      funderSeed: operator.seed,
      sourceTag: 777,
      clientFactory: () => ledger,
    });

    await expect(
      gateway.deleteAccount(starter.seed, reward.classicAddress, "200000"),
    ).resolves.toEqual({ hash: "LINKED" });

    expect(ledger.prepared).toMatchObject({
      TransactionType: "AccountDelete",
      Account: starter.classicAddress,
      Destination: reward.classicAddress,
      Fee: "200000",
      SourceTag: 777,
    });
  });
});
