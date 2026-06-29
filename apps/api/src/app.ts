import type { FastifyInstance } from "fastify";
import type { PriceMap } from "@tide/core";
import { PaperService } from "./services/paper-service";
import { CompetitionService } from "./services/competition-service";
import { PriceCache } from "./feed/price-cache";
import { fetchCexPrices } from "./feed/cex-price-feed";
import type { CexFeedConfig, FetchJson } from "./feed/cex-price-feed";
import { fetchMarkets } from "./feed/coingecko-markets";
import type { MarketRow, MarketsFeedConfig } from "./feed/coingecko-markets";
import { composePriceMap } from "./feed/compose-price";
import { fetchKlines, isKlineInterval } from "./feed/klines";
import type { Candle } from "./feed/klines";
import type { BookDepth } from "./feed/binance-book-feed";
import { PriceFeedError } from "./feed/errors";
import type {
  ComposeOptions,
  FeedLogger,
  OnchainPriceProvider,
} from "./feed/compose-price";
import { buildServer } from "./http/server";
import type { ExecDeps, MetricsDeps, SignDeps } from "./http/server";
import type { AccountStore } from "./store/account-store";
import type { CompetitionStore } from "./store/competition-store";

/** Configuration de l'application assemblée. */
export interface AppConfig {
  /** Capital de départ des comptes paper (défaut domaine si omis). */
  readonly startingEquity?: number;
  /**
   * Feed « markets » CoinGecko (top N coins en un appel : prix + %24h + nom).
   * Mode privilégié (watchlist dynamique, route `/markets`). Si absent, on
   * retombe sur le couple `feed` + `symbols` (mapping CEX explicite).
   */
  readonly markets?: MarketsFeedConfig;
  /** Feed CEX par mapping explicite (legacy / tests). Requis si `markets` absent. */
  readonly feed?: CexFeedConfig;
  /** Symboles cotés par le feed CEX legacy. Requis si `markets` absent. */
  readonly symbols?: readonly string[];
  /** Récupération JSON injectée (réel `fetch` en prod, faux en test). */
  readonly fetchJson: FetchJson;
  /** Persistance des comptes (in-memory par défaut, SQLite en prod). */
  readonly accountStore?: AccountStore;
  /** Persistance des compétitions (in-memory par défaut, SQLite en prod). */
  readonly competitionStore?: CompetitionStore;
  /** Source de prix on-chain optionnelle (compose avec le CEX si fournie). */
  readonly onchainPrices?: OnchainPriceProvider;
  /** Paramètres de composition CEX/on-chain (défaut si omis). */
  readonly compose?: ComposeOptions;
  /** Journal du feed (replis de prix) — sinon silencieux. */
  readonly feedLogger?: FeedLogger;
  /** Signature Xaman (routes /sign/*) — absente si XUMM non configuré. */
  readonly sign?: SignDeps;
  /** Moteur d'exécution Live (/exec/plan, /sign/live-offer) — absent si quote non configuré. */
  readonly exec?: ExecDeps;
  /** Métriques d'attribution (route /metrics) — absente si indexeur non câblé. */
  readonly metrics?: MetricsDeps;
  /** Carnet CEX réel (route /book) — absent si feed depth non câblé. */
  readonly getBookDepth?: (symbol: string, limit: number) => Promise<BookDepth>;
}

/** Composition par défaut : CEX référence, divergence on-chain tolérée à 5 %. */
const DEFAULT_COMPOSE: ComposeOptions = { maxDivergence: 0.05, prefer: "cex" };

/** TTL du cache d'historique OHLC : borne les appels CoinGecko (rate-limit). */
const HISTORY_TTL_MS = 60_000;

/** Logger par défaut : un repli de prix ne doit jamais être avalé silencieusement. */
const DEFAULT_FEED_LOGGER: FeedLogger = {
  warn: (message) => console.warn(`[feed] ${message}`),
};

/** Application assemblée : serveur + cache + rafraîchisseur de prix. */
export interface App {
  readonly app: FastifyInstance;
  readonly cache: PriceCache;
  /** Rafraîchit le cache depuis le feed CEX (à planifier périodiquement). */
  readonly refreshPrices: () => Promise<void>;
}

/**
 * Assemble l'application : instancie les services, le cache de prix, branche
 * `getPrices` sur l'instantané du cache, et expose un rafraîchisseur. Aucun
 * effet de bord (pas d'écoute réseau, pas de timer) → testable.
 */
export function createApp(config: AppConfig): App {
  const paper = new PaperService(config.startingEquity, config.accountStore);
  const competition = new CompetitionService(config.competitionStore);
  const cache = new PriceCache();

  // Cache d'historique (TTL court) : dédoublonne les appels CoinGecko et borne
  // le rate-limit. On garde la promesse (les requêtes concurrentes la partagent) ;
  // une promesse rejetée est retirée pour permettre une nouvelle tentative.
  const historyCache = new Map<string, { at: number; data: Promise<Candle[]> }>();
  const getHistory = (
    symbol: string,
    interval: string,
    limit: number,
  ): Promise<Candle[]> => {
    if (!isKlineInterval(interval)) {
      return Promise.reject(new PriceFeedError(`Intervalle non supporté: ${interval}`));
    }
    const key = `${symbol}:${interval}:${String(limit)}`;
    const now = Date.now();
    const hit = historyCache.get(key);
    if (hit !== undefined && now - hit.at < HISTORY_TTL_MS) {
      return hit.data;
    }
    const data = fetchKlines(symbol, interval, limit, config.fetchJson);
    historyCache.set(key, { at: now, data });
    data.catch(() => historyCache.delete(key));
    return data;
  };

  // Lignes de marché (watchlist) du dernier rafraîchissement en mode `markets`.
  let marketRows: readonly MarketRow[] = [];

  const app = buildServer({
    paper,
    competition,
    getPrices: () => cache.current(),
    getMarkets: config.markets !== undefined ? () => marketRows : undefined,
    getHistory,
    getBookDepth: config.getBookDepth,
    sign: config.sign,
    exec: config.exec,
    metrics: config.metrics,
  });

  const compose = config.compose ?? DEFAULT_COMPOSE;
  const feedLogger = config.feedLogger ?? DEFAULT_FEED_LOGGER;

  // Compose la PriceMap (CEX + on-chain optionnel) et la publie dans le cache.
  // Renvoie la map composée pour réaligner d'autres vues (ex. prix des markets).
  const publishPrices = async (
    cexPrices: PriceMap,
    symbols: readonly string[],
  ): Promise<PriceMap> => {
    const prices = await composePriceMap(
      cexPrices,
      symbols,
      compose,
      config.onchainPrices,
      feedLogger,
    );
    cache.set(prices);
    return prices;
  };

  const refreshPrices = async (): Promise<void> => {
    if (config.markets !== undefined) {
      const rows = await fetchMarkets(config.markets, config.fetchJson);
      const symbols = rows.map((row) => row.symbol);
      const cexPrices = Object.fromEntries(rows.map((row) => [row.symbol, row.price]));
      const prices = await publishPrices(cexPrices, symbols);
      // Aligne le prix affiché des markets sur le prix composé (cohérent avec getPrices).
      marketRows = rows.map((row) => ({ ...row, price: prices[row.symbol] ?? row.price }));
      return;
    }
    if (config.feed === undefined || config.symbols === undefined) {
      throw new Error("createApp: fournir 'markets' ou ('feed' + 'symbols')");
    }
    // Mode legacy : mapping CEX explicite (non-régression, couvert par les tests).
    const cexPrices = await fetchCexPrices(config.feed, config.symbols, config.fetchJson);
    await publishPrices(cexPrices, config.symbols);
  };

  return { app, cache, refreshPrices };
}
