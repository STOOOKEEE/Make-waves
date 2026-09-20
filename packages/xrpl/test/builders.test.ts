import { describe, it, expect } from "vitest";
import { convertHexToString, type IssuedCurrencyAmount } from "xrpl";
import { buildBuyInPayment } from "../src/tx/payment";
import { buildLiveOffer } from "../src/tx/offer";
import {
  InvalidAddressError,
  InvalidAmountError,
  InvalidMemoError,
  InvalidSourceTagError,
} from "../src/errors";
import { MEMO_TYPE_JOIN } from "../src/constants";

const PLAYER = "rPkAr4m5jrX21Fcfx5GYuLJ6Yb8oL3Ws5o";
const POOL = "ra6hLorXqVpwb7jWfekgjPcPFRHrQqANZg";
const SOURCE_TAG = 777;

describe("buildBuyInPayment", () => {
  it("construit un Payment taggé avec memo de tournoi", () => {
    const tx = buildBuyInPayment({
      account: PLAYER,
      destination: POOL,
      amount: "10000000",
      sourceTag: SOURCE_TAG,
      competitionId: "comp-42",
    });

    expect(tx.TransactionType).toBe("Payment");
    expect(tx.Account).toBe(PLAYER);
    expect(tx.Destination).toBe(POOL);
    expect(tx.Amount).toBe("10000000");
    expect(tx.SourceTag).toBe(SOURCE_TAG);
    const memo = tx.Memos?.[0]?.Memo;
    expect(convertHexToString(memo?.MemoData as string)).toBe("comp-42");
    // Le MemoType signe l'inscription : c'est l'attribution applicative du buy-in.
    expect(convertHexToString(memo?.MemoType as string)).toBe(MEMO_TYPE_JOIN);
  });

  it("accepte un montant de token émis (RLUSD)", () => {
    const amount: IssuedCurrencyAmount = {
      currency: "524C555344000000000000000000000000000000",
      issuer: POOL,
      value: "5",
    };
    const tx = buildBuyInPayment({
      account: PLAYER,
      destination: POOL,
      amount,
      sourceTag: SOURCE_TAG,
      competitionId: "comp-1",
    });
    expect(tx.Amount).toEqual(amount);
  });

  it("rejette une adresse invalide", () => {
    expect(() =>
      buildBuyInPayment({
        account: "x",
        destination: POOL,
        amount: "1",
        sourceTag: SOURCE_TAG,
        competitionId: "c",
      }),
    ).toThrow(InvalidAddressError);
  });

  it("rejette un buy-in vers soi-même", () => {
    expect(() =>
      buildBuyInPayment({
        account: PLAYER,
        destination: PLAYER,
        amount: "1",
        sourceTag: SOURCE_TAG,
        competitionId: "c",
      }),
    ).toThrow(InvalidAddressError);
  });

  it("rejette un SourceTag invalide", () => {
    expect(() =>
      buildBuyInPayment({
        account: PLAYER,
        destination: POOL,
        amount: "1",
        sourceTag: -1,
        competitionId: "c",
      }),
    ).toThrow(InvalidSourceTagError);
  });

  it("rejette un SourceTag à 0 (attribution perdue)", () => {
    expect(() =>
      buildBuyInPayment({
        account: PLAYER,
        destination: POOL,
        amount: "1",
        sourceTag: 0,
        competitionId: "c",
      }),
    ).toThrow(InvalidSourceTagError);
  });

  it("rejette un competitionId vide", () => {
    expect(() =>
      buildBuyInPayment({
        account: PLAYER,
        destination: POOL,
        amount: "1",
        sourceTag: SOURCE_TAG,
        competitionId: "  ",
      }),
    ).toThrow(InvalidMemoError);
  });

  it("rejette un montant invalide (drops non entiers)", () => {
    expect(() =>
      buildBuyInPayment({
        account: PLAYER,
        destination: POOL,
        amount: "1.5",
        sourceTag: SOURCE_TAG,
        competitionId: "c",
      }),
    ).toThrow(InvalidAmountError);
  });
});

describe("buildLiveOffer", () => {
  it("construit un OfferCreate taggé (gives -> TakerGets, wants -> TakerPays)", () => {
    const tx = buildLiveOffer({
      account: PLAYER,
      gives: "10000000",
      wants: { currency: "USD", issuer: POOL, value: "5" },
      sourceTag: SOURCE_TAG,
    });

    expect(tx.TransactionType).toBe("OfferCreate");
    expect(tx.Account).toBe(PLAYER);
    expect(tx.TakerGets).toBe("10000000");
    expect(tx.TakerPays).toEqual({ currency: "USD", issuer: POOL, value: "5" });
    expect(tx.SourceTag).toBe(SOURCE_TAG);
  });

  it("rejette une adresse invalide", () => {
    expect(() =>
      buildLiveOffer({
        account: "nope",
        gives: "1",
        wants: "2",
        sourceTag: SOURCE_TAG,
      }),
    ).toThrow(InvalidAddressError);
  });

  it("rejette une offre triviale (gives == wants)", () => {
    expect(() =>
      buildLiveOffer({
        account: PLAYER,
        gives: "1000",
        wants: "1000",
        sourceTag: SOURCE_TAG,
      }),
    ).toThrow(InvalidAmountError);
  });
});
