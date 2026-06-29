import { describe, it, expect } from "vitest";
import {
  readBestAsk,
  readBestBid,
  readBookDepth,
  readBookQuote,
} from "../src/price/book-reader";
import type {
  BookOffersClient,
  BookOffersResult,
} from "../src/price/book-reader";
import { InvalidPriceError } from "../src/errors";

const ISSUER = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const XRP = { currency: "XRP" };
const USD = { currency: "USD", issuer: ISSUER };

const EMPTY: BookOffersResult = { result: { offers: [] } };

/**
 * Faux client routé par devise `taker_gets` : le book "ask" est celui où les
 * vendeurs fournissent la base (XRP), le book "bid" celui où ils fournissent la
 * quote (USD). Reproduit le comportement de `book_offers`.
 */
function fakeBook(books: {
  ask?: BookOffersResult;
  bid?: BookOffersResult;
}): BookOffersClient {
  return {
    request: async (request) =>
      request.taker_gets.currency === "XRP"
        ? (books.ask ?? EMPTY)
        : (books.bid ?? EMPTY),
  };
}

// Vendeur fournit 1000 XRP contre 500 USD → ask = 0,5 USD/XRP
const ASK: BookOffersResult = {
  result: {
    offers: [
      { TakerGets: "1000000000", TakerPays: { currency: "USD", issuer: ISSUER, value: "500" } },
    ],
  },
};
// Vendeur fournit 490 USD contre 1000 XRP → bid = 0,49 USD/XRP
const BID: BookOffersResult = {
  result: {
    offers: [
      { TakerGets: { currency: "USD", issuer: ISSUER, value: "490" }, TakerPays: "1000000000" },
    ],
  },
};

describe("book-reader", () => {
  it("readBestAsk = quote/base de la meilleure offre", async () => {
    expect(await readBestAsk(fakeBook({ ask: ASK }), XRP, USD)).toBe(0.5);
  });

  it("readBestBid = quote/base du book inverse", async () => {
    expect(await readBestBid(fakeBook({ bid: BID }), XRP, USD)).toBe(0.49);
  });

  it("readBookQuote agrège bid/ask/mid/spread", async () => {
    const quote = await readBookQuote(fakeBook({ ask: ASK, bid: BID }), XRP, USD);
    expect(quote.ask).toBe(0.5);
    expect(quote.bid).toBe(0.49);
    expect(quote.mid).toBe(0.495);
    expect(quote.spread).toBeCloseTo(0.0202, 4);
  });

  it("lève InvalidPriceError si un côté du carnet est vide", async () => {
    await expect(readBestAsk(fakeBook({}), XRP, USD)).rejects.toBeInstanceOf(
      InvalidPriceError,
    );
    await expect(
      readBookQuote(fakeBook({ ask: ASK }), XRP, USD),
    ).rejects.toBeInstanceOf(InvalidPriceError);
  });

  it("refuse une offre à funded partiel (un seul côté) — pas de prix faux", async () => {
    const partial: BookOffersResult = {
      result: {
        offers: [
          {
            TakerGets: "1000000000",
            TakerPays: { currency: "USD", issuer: ISSUER, value: "500" },
            taker_gets_funded: "500000000", // pays_funded absent → incohérent
          },
        ],
      },
    };
    await expect(
      readBestAsk(fakeBook({ ask: partial }), XRP, USD),
    ).rejects.toBeInstanceOf(InvalidPriceError);
  });

  it("privilégie les montants funded (disponibles) au montant offert", async () => {
    const fundedAsk: BookOffersResult = {
      result: {
        offers: [
          {
            TakerGets: "9999999999",
            TakerPays: { currency: "USD", issuer: ISSUER, value: "9999" },
            taker_gets_funded: "1000000000",
            taker_pays_funded: { currency: "USD", issuer: ISSUER, value: "500" },
          },
        ],
      },
    };
    expect(await readBestAsk(fakeBook({ ask: fundedAsk }), XRP, USD)).toBe(0.5);
  });

  it("lève InvalidPriceError sur un carnet croisé (ask < bid)", async () => {
    const cheapAsk: BookOffersResult = {
      result: {
        offers: [
          { TakerGets: "1000000000", TakerPays: { currency: "USD", issuer: ISSUER, value: "400" } },
        ],
      },
    };
    const richBid: BookOffersResult = {
      result: {
        offers: [
          { TakerGets: { currency: "USD", issuer: ISSUER, value: "500" }, TakerPays: "1000000000" },
        ],
      },
    };
    await expect(
      readBookQuote(fakeBook({ ask: cheapAsk, bid: richBid }), XRP, USD),
    ).rejects.toBeInstanceOf(InvalidPriceError);
  });

  it("readBookDepth retourne les niveaux cumulés en base", async () => {
    const asks: BookOffersResult = {
      result: {
        offers: [
          { TakerGets: "100000000", TakerPays: { currency: "USD", issuer: ISSUER, value: "50" } },
          { TakerGets: "150000000", TakerPays: { currency: "USD", issuer: ISSUER, value: "79.5" } },
        ],
      },
    };
    const bids: BookOffersResult = {
      result: {
        offers: [
          { TakerGets: { currency: "USD", issuer: ISSUER, value: "49" }, TakerPays: "100000000" },
          { TakerGets: { currency: "USD", issuer: ISSUER, value: "56.4" }, TakerPays: "120000000" },
        ],
      },
    };
    const depth = await readBookDepth(fakeBook({ ask: asks, bid: bids }), XRP, USD, 2);
    expect(depth.asks).toEqual([
      { price: 0.5, size: 100, total: 100 },
      { price: 0.53, size: 150, total: 250 },
    ]);
    expect(depth.bids).toEqual([
      { price: 0.49, size: 100, total: 100 },
      { price: 0.47, size: 120, total: 220 },
    ]);
    expect(depth.mid).toBe(0.495);
    expect(depth.spread).toBeCloseTo(0.0202, 4);
  });
});
