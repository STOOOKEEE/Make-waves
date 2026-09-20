import type { PriceMap } from "@tide/core";
import { PriceFeedError } from "./errors";

/**
 * Récupère un JSON depuis une URL. Injecté pour découpler du réseau : en test on
 * passe un faux, en prod un wrapper de `fetch`. Le module reste ainsi testable
 * sans réseau réel.
 */
export type FetchJson = (url: string) => Promise<unknown>;

/** Configuration d'un feed CEX de type CoinGecko (`/simple/price`). */
export interface CexFeedConfig {
  readonly baseUrl: string;
  /** Mapping symbole XRPL -> id du CEX (ex. "XRP" -> "ripple"). */
  readonly symbolToId: Readonly<Record<string, string>>;
  /** Devise de cotation (ex. "usd"). */
  readonly vsCurrency: string;
}

function idFor(config: CexFeedConfig, symbol: string): string {
  const id = config.symbolToId[symbol];
  if (id === undefined) {
    throw new PriceFeedError(`Symbole non mappé vers le CEX: ${symbol}`);
  }
  return id;
}

function asRecord(value: unknown, ctx: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PriceFeedError(`${ctx}: objet attendu`);
  }
  return value as Record<string, unknown>;
}

function parsePrices(
  config: CexFeedConfig,
  symbols: readonly string[],
  raw: unknown,
): PriceMap {
  const root = asRecord(raw, "réponse CEX");
  const result: Record<string, number> = {};
  for (const symbol of symbols) {
    const id = idFor(config, symbol);
    const entry = asRecord(root[id], `réponse CEX (${id})`);
    const price = entry[config.vsCurrency];
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      throw new PriceFeedError(
        `réponse CEX: prix invalide pour ${symbol} (${String(price)})`,
      );
    }
    result[symbol] = price;
  }
  return result;
}

/**
 * Construit une `PriceMap` (symbole -> prix en `vsCurrency`) depuis un CEX.
 * Ne fait aucun appel réseau direct : `fetchJson` est injecté. Lève
 * `PriceFeedError` si un symbole n'est pas mappé ou si la réponse est invalide.
 */
export async function fetchCexPrices(
  config: CexFeedConfig,
  symbols: readonly string[],
  fetchJson: FetchJson,
): Promise<PriceMap> {
  if (symbols.length === 0) {
    return {};
  }
  const ids = symbols.map((symbol) => idFor(config, symbol));
  // Encodage défensif des composants d'URL (la virgule séparatrice reste hors encodage).
  const idsParam = ids.map((id) => encodeURIComponent(id)).join(",");
  const vsParam = encodeURIComponent(config.vsCurrency);
  const url = `${config.baseUrl}/simple/price?ids=${idsParam}&vs_currencies=${vsParam}`;
  const raw = await fetchJson(url);
  return parsePrices(config, symbols, raw);
}
