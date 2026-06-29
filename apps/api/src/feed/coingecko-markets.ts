import { PriceFeedError } from "./errors";
import type { FetchJson } from "./cex-price-feed";

/**
 * Ligne de marché telle qu'exposée à la watchlist : symbole, nom, prix et
 * variation 24h. Vient de l'endpoint CoinGecko `/coins/markets` (un seul appel
 * pour les top N coins par capitalisation — pas de mapping manuel par coin).
 */
export interface MarketRow {
  readonly symbol: string;
  readonly name: string;
  readonly price: number;
  readonly change24h: number;
}

/** Configuration du feed « markets » CoinGecko (top N par capitalisation). */
export interface MarketsFeedConfig {
  readonly baseUrl: string;
  /** Devise de cotation (ex. "usd"). */
  readonly vsCurrency: string;
  /** Nombre de coins à récupérer (1..250, max imposé par CoinGecko). */
  readonly perPage: number;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/**
 * Récupère les top `perPage` coins par capitalisation (prix + variation 24h + nom)
 * via CoinGecko `/coins/markets`. `fetchJson` injecté → testable sans réseau.
 *
 * Robustesse : une entrée malformée (prix manquant/≤0, symbole vide) est ignorée
 * plutôt que de faire échouer tout le feed ; les **doublons de symbole** sont
 * dédoublonnés en gardant le premier (la plus grosse capitalisation, l'ordre étant
 * `market_cap_desc`). Lève `PriceFeedError` seulement si la réponse n'est pas un
 * tableau ou ne contient aucun coin exploitable.
 */
export async function fetchMarkets(
  config: MarketsFeedConfig,
  fetchJson: FetchJson,
): Promise<MarketRow[]> {
  const url =
    `${config.baseUrl}/coins/markets` +
    `?vs_currency=${encodeURIComponent(config.vsCurrency)}` +
    `&order=market_cap_desc&per_page=${String(config.perPage)}` +
    `&page=1&price_change_percentage=24h`;
  const raw = await fetchJson(url);
  if (!Array.isArray(raw)) {
    throw new PriceFeedError("réponse markets: tableau attendu");
  }

  const seen = new Set<string>();
  const rows: MarketRow[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const entry = item as Record<string, unknown>;
    const symbolRaw = nonEmptyString(entry["symbol"]);
    const name = nonEmptyString(entry["name"]);
    const price = num(entry["current_price"]);
    if (symbolRaw === undefined || name === undefined || price === undefined || price <= 0) {
      continue;
    }
    const symbol = symbolRaw.toUpperCase();
    if (seen.has(symbol)) {
      continue; // homonyme moins capitalisé : on garde le premier (plus gros)
    }
    seen.add(symbol);
    rows.push({ symbol, name, price, change24h: num(entry["price_change_percentage_24h"]) ?? 0 });
  }

  if (rows.length === 0) {
    throw new PriceFeedError("réponse markets: aucun coin exploitable");
  }
  return rows;
}
