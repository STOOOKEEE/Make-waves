import { PriceFeedError } from "./errors";
import type { BookDepth, BookLevel } from "./binance-book-feed";
import type { FetchJson } from "./cex-price-feed";

function num(value: unknown, ctx: string): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed <= 0) {
    throw new PriceFeedError(`${ctx}: nombre positif attendu`);
  }
  return parsed;
}

function levels(raw: unknown, ctx: string): Array<[number, number]> {
  if (!Array.isArray(raw)) {
    throw new PriceFeedError(`${ctx}: tableau attendu`);
  }
  return raw.map((row, index) => {
    if (!Array.isArray(row) || row.length < 2) {
      throw new PriceFeedError(`${ctx}[${String(index)}]: [price,size] attendu`);
    }
    return [num(row[0], `${ctx}[${String(index)}].price`), num(row[1], `${ctx}[${String(index)}].size`)];
  });
}

function cumulate(rows: Array<[number, number]>): BookLevel[] {
  let total = 0;
  return rows.map(([price, size]) => {
    total += size;
    return { price, size, total };
  });
}

/**
 * Récupère la profondeur Gate.io d'un symbole coté en USDT. Sert de fallback CEX
 * réel pour des actifs listés hors Binance (ex. RAIN/USDT).
 */
export async function fetchGateBookDepth(
  symbol: string,
  limit: number,
  fetchJson: FetchJson,
): Promise<BookDepth> {
  const base = symbol.toUpperCase();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  const pair = `${base}_USDT`;
  const url =
    "https://api.gateio.ws/api/v4/spot/order_book" +
    `?currency_pair=${encodeURIComponent(pair)}&limit=${String(safeLimit)}`;
  const raw = await fetchJson(url);
  if (typeof raw !== "object" || raw === null) {
    throw new PriceFeedError("réponse Gate order_book: objet attendu");
  }
  const record = raw as Record<string, unknown>;
  const asks = cumulate(levels(record["asks"], "gate.asks"));
  const bids = cumulate(levels(record["bids"], "gate.bids"));
  const ask = asks[0]?.price;
  const bid = bids[0]?.price;
  if (ask === undefined || bid === undefined) {
    throw new PriceFeedError("réponse Gate order_book: carnet vide");
  }
  return {
    symbol: base,
    quoteSymbol: "USDT",
    source: "Gate",
    asks,
    bids,
    mid: (bid + ask) / 2,
    spread: (ask - bid) / ((bid + ask) / 2),
  };
}
