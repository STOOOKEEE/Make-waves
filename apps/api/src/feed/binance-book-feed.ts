import { PriceFeedError } from "./errors";
import type { FetchJson } from "./cex-price-feed";

/** Niveau du carnet exposé à l'UI. */
export interface BookLevel {
  readonly price: number;
  readonly size: number;
  readonly total: number;
}

/** Carnet d'ordres agrégé pour un symbole donné. */
export interface BookDepth {
  readonly symbol: string;
  readonly quoteSymbol: string;
  readonly source: string;
  readonly asks: readonly BookLevel[];
  readonly bids: readonly BookLevel[];
  readonly mid: number;
  readonly spread: number;
}

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
 * Récupère la profondeur Binance d'un symbole coté en USDT. Binance renvoie les
 * asks croissants et les bids décroissants ; on garde l'ordre natif.
 */
export async function fetchBinanceBookDepth(
  symbol: string,
  limit: number,
  fetchJson: FetchJson,
): Promise<BookDepth> {
  const base = symbol.toUpperCase();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  const url =
    `https://api.binance.com/api/v3/depth?symbol=${encodeURIComponent(base)}USDT` +
    `&limit=${String(safeLimit)}`;
  const raw = await fetchJson(url);
  if (typeof raw !== "object" || raw === null) {
    throw new PriceFeedError("réponse depth: objet attendu");
  }
  const record = raw as Record<string, unknown>;
  const asks = cumulate(levels(record["asks"], "depth.asks"));
  const bids = cumulate(levels(record["bids"], "depth.bids"));
  const ask = asks[0]?.price;
  const bid = bids[0]?.price;
  if (ask === undefined || bid === undefined) {
    throw new PriceFeedError("réponse depth: carnet vide");
  }
  return {
    symbol: base,
    quoteSymbol: "USDT",
    source: "Binance",
    asks,
    bids,
    mid: (bid + ask) / 2,
    spread: (ask - bid) / ((bid + ask) / 2),
  };
}
