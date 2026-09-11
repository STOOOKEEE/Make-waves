import { describe, expect, it } from "vitest";
import { Wallet, type Payment } from "xrpl";
import {
  CompetitionPaymentService,
} from "./competition-payment-service";
import type { CompetitionLedgerClient } from "./competition-payment-service";
import type { CompetitionDefinition } from "../store/competition-store";

const COMPETITION: CompetitionDefinition = {
  id: "paper-cup",
  nameEn: "Paper cup",
  nameFr: "Coupe Paper",
  descriptionEn: "Test",
  descriptionFr: "Test",
  mode: "paper",
  buyIn: 0.01,
  rakeRatio: 0,
  payoutWeights: [1],
  startsAt: 1,
  endsAt: 2,
};

class FakeLedger implements CompetitionLedgerClient {
  connected = false;
  autofillInput: Payment | null = null;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async autofill(transaction: Payment): Promise<Payment> {
    this.autofillInput = transaction;
    return { ...transaction, Fee: "12", Sequence: 1, LastLedgerSequence: 100 };
  }

  async submitAndWait(): Promise<{
    readonly result: { readonly hash: string; readonly meta: { readonly TransactionResult: string } };
  }> {
    return { result: { hash: "A".repeat(64), meta: { TransactionResult: "tesSUCCESS" } } };
  }
}

describe("CompetitionPaymentService.submitManagedEntry", () => {
  it("signe le Payment exact avec SourceTag et mémo de compétition", async () => {
    const wallet = Wallet.generate();
    const ledger = new FakeLedger();
    const service = new CompetitionPaymentService({
      serverUrl: "ws://unused",
      prizePoolAddress: Wallet.generate().classicAddress,
      sourceTag: 7777,
      clientFactory: () => ledger,
    });

    const result = await service.submitManagedEntry(wallet.seed!, COMPETITION);
    const expected = service.entryPayment(wallet.classicAddress, COMPETITION);

    expect(result).toEqual({ account: wallet.classicAddress, hash: "A".repeat(64) });
    expect(ledger.autofillInput).toMatchObject({
      ...expected,
      SourceTag: 7777,
    });
    expect(ledger.connected).toBe(false);
  });
});
