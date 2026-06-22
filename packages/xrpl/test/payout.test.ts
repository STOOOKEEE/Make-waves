import { describe, it, expect } from "vitest";
import { convertStringToHex, Wallet } from "xrpl";
import { buildPayoutPayments } from "../src/tx/payout";
import { MEMO_TYPE_PAYOUT } from "../src/constants";
import {
  InvalidAddressError,
  InvalidAmountError,
  InvalidSourceTagError,
} from "../src/errors";

const POOL = Wallet.generate().classicAddress;
const A = Wallet.generate().classicAddress;
const B = Wallet.generate().classicAddress;
const C = Wallet.generate().classicAddress;
const ISSUER = Wallet.generate().classicAddress;
const TAG = 7777;
const XRP = { currency: "XRP" };
const USD = { currency: "USD", issuer: ISSUER };

function sumDrops(amounts: readonly unknown[]): number {
  return amounts.reduce<number>((total, a) => total + Number(a), 0);
}

describe("buildPayoutPayments", () => {
  it("verse en XRP : un Payment taggé par gagnant, depuis le pool", () => {
    const payments = buildPayoutPayments({
      from: POOL,
      recipients: [
        { address: A, amount: 60 },
        { address: B, amount: 30 },
        { address: C, amount: 10 },
      ],
      currency: XRP,
      sourceTag: TAG,
      competitionId: "cup",
    });
    expect(payments).toHaveLength(3);
    expect(payments[0]).toMatchObject({
      TransactionType: "Payment",
      Account: POOL,
      Destination: A,
      Amount: "60000000",
      SourceTag: TAG,
    });
    expect(payments[0]?.Memos).toHaveLength(1);
    expect(sumDrops(payments.map((p) => p.Amount))).toBe(100_000_000);
  });

  it("conserve le total par plus grand reste (ex-aequo)", () => {
    const payments = buildPayoutPayments({
      from: POOL,
      recipients: [
        { address: A, amount: 1 / 3 },
        { address: B, amount: 1 / 3 },
        { address: C, amount: 1 / 3 },
      ],
      currency: XRP,
      sourceTag: TAG,
      competitionId: "cup",
    });
    expect(payments.map((p) => p.Amount)).toEqual(["333334", "333333", "333333"]);
    expect(sumDrops(payments.map((p) => p.Amount))).toBe(1_000_000);
  });

  it("verse en IOU avec une value propre", () => {
    const payments = buildPayoutPayments({
      from: POOL,
      recipients: [{ address: A, amount: 50.5 }],
      currency: USD,
      sourceTag: TAG,
      competitionId: "cup",
    });
    expect(payments[0]?.Amount).toEqual({ currency: "USD", issuer: ISSUER, value: "50.5" });
  });

  it("n'émet pas de Payment pour un gain nul", () => {
    const payments = buildPayoutPayments({
      from: POOL,
      recipients: [
        { address: A, amount: 100 },
        { address: B, amount: 0 },
      ],
      currency: XRP,
      sourceTag: TAG,
      competitionId: "cup",
    });
    expect(payments).toHaveLength(1);
    expect(payments[0]?.Destination).toBe(A);
  });

  it("pose le memo tide/payout", () => {
    const payments = buildPayoutPayments({
      from: POOL,
      recipients: [{ address: A, amount: 10 }],
      currency: XRP,
      sourceTag: TAG,
      competitionId: "cup",
    });
    const memoTypeHex = convertStringToHex(MEMO_TYPE_PAYOUT);
    expect(payments[0]?.Memos?.[0]?.Memo?.MemoType).toBe(memoTypeHex);
  });

  it("rejette un bénéficiaire = pool, en double, ou une adresse invalide", () => {
    const base = { from: POOL, currency: XRP, sourceTag: TAG, competitionId: "cup" };
    expect(() =>
      buildPayoutPayments({ ...base, recipients: [{ address: POOL, amount: 10 }] }),
    ).toThrow(InvalidAddressError);
    expect(() =>
      buildPayoutPayments({
        ...base,
        recipients: [{ address: A, amount: 10 }, { address: A, amount: 5 }],
      }),
    ).toThrow(InvalidAddressError);
    expect(() =>
      buildPayoutPayments({ ...base, recipients: [{ address: "nope", amount: 10 }] }),
    ).toThrow(InvalidAddressError);
  });

  it("rejette un pool trop grand (anti value exponentielle/tronquée)", () => {
    expect(() =>
      buildPayoutPayments({
        from: POOL,
        recipients: [{ address: A, amount: 1e12 }],
        currency: USD,
        sourceTag: TAG,
        competitionId: "cup",
      }),
    ).toThrow(InvalidAmountError);
  });

  it("ne produit jamais une value IOU en notation scientifique", () => {
    const payments = buildPayoutPayments({
      from: POOL,
      recipients: [
        { address: A, amount: 1234.567891 },
        { address: B, amount: 9876.543219 },
      ],
      currency: USD,
      sourceTag: TAG,
      competitionId: "cup",
    });
    for (const payment of payments) {
      const amount = payment.Amount;
      if (typeof amount === "object") {
        expect(amount.value).not.toMatch(/[eE]/);
      }
    }
  });

  it("rejette tag 0, liste vide, gain négatif", () => {
    expect(() =>
      buildPayoutPayments({
        from: POOL,
        recipients: [{ address: A, amount: 10 }],
        currency: XRP,
        sourceTag: 0,
        competitionId: "cup",
      }),
    ).toThrow(InvalidSourceTagError);
    expect(() =>
      buildPayoutPayments({ from: POOL, recipients: [], currency: XRP, sourceTag: TAG, competitionId: "cup" }),
    ).toThrow(InvalidAmountError);
    expect(() =>
      buildPayoutPayments({
        from: POOL,
        recipients: [{ address: A, amount: -1 }],
        currency: XRP,
        sourceTag: TAG,
        competitionId: "cup",
      }),
    ).toThrow(InvalidAmountError);
  });
});
