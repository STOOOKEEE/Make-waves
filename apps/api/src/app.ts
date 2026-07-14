import type { FastifyInstance } from "fastify";
import type { PriceMap } from "@tide/core";
import { PaperService } from "./services/paper-service";
import { CompetitionService } from "./services/competition-service";
import { BadgeService } from "./services/badge-service";
import type { NftIssuer } from "@tide/xrpl";
import type { BadgeStore } from "./store/badge-store";
import { PriceCache } from "./feed/price-cache";
import { fetchCexPrices } from "./feed/cex-price-feed";
import type { CexFeedConfig, FetchJson } from "./feed/cex-price-feed";
import { fetchMarkets } from "./feed/coingecko-markets";
import type { MarketRow, MarketsFeedConfig } from "./feed/coingecko-markets";
import { composePriceMap } from "./feed/compose-price";
import { fetchKlines, isKlineInterval } from "./feed/klines";
import type { Candle } from "./feed/klines";
import { fetchGateCandles } from "./feed/gate-history";
import { fetchCoinGeckoOhlc } from "./feed/coingecko-ohlc";
import { fetchCoinGeckoHistory } from "./feed/coingecko-history";
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
import type { AgentActionsStore } from "./store/agent-actions-store";
import { AdminService } from "./services/admin-service";
import type { AgentStore } from "./store/agent-store";
import type { MandateStore } from "./store/mandate-store";

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
  /** Service de gestion des agents (routes /api/agents/*) — absent si pas câblé. */
  readonly agentService?: import("./services/agent-service").AgentService;
  /** Service de gestion des mandats (routes /api/mandates, /api/sign/mandate-callback) — absent si pas câblé. */
  readonly mandateService?: import("./services/mandate-service").MandateService;
  /** Store d'actions d'agent (route /api/agent-actions) — absent si pas câblé. */
  readonly agentActionsStore?: AgentActionsStore;
  /** Token de la console admin (route /admin/overview) — absent → route non montée. */
  readonly adminToken?: string;
  /** Comptes classés "operator" dans la console admin (défaut : aucun). */
  readonly operatorUserIds?: readonly string[];
  /** Store des agents — requis avec `adminToken` pour activer la console admin. */
  readonly agentStore?: AgentStore;
  /** Store des mandats — requis avec `adminToken` pour activer la console admin. */
  readonly mandateStore?: MandateStore;
  /** Service de chat agent (route /api/agent-chat/stream) — absent si pas câblé. */
  readonly agentChatService?: import("./services/agent-chat-service").AgentChatService;
  /** Fabrique du `McpContext` runtime du chat agent (backends réels) — absente → stub. */
  readonly agentChatCtx?: (
    agentId: string,
    userId: string,
  ) => Promise<import("@tide/mcp").McpContext>;
  /** Carnet CEX réel (route /book) — absent si feed depth non câblé. */
  readonly getBookDepth?: (symbol: string, limit: number) => Promise<BookDepth>;
  /** Historique DEX réel prioritaire pour les tokens dont la pool est connue. */
  readonly getDexHistory?: (
    symbol: string,
    interval: string,
    limit: number,
  ) => Promise<Candle[]> | undefined;
  /** Issuer NFT des badges (signature serveur) — absent → badges on-chain OFF. */
  readonly nftIssuer?: NftIssuer;
  /** Store des claims de badges (SQLite en prod). Requis avec `nftIssuer`. */
  readonly badgeStore?: BadgeStore;
  /** SourceTag d'attribution des mints. Requis avec `nftIssuer`. */
  readonly sourceTag?: number;
  /** Base publique des URI de métadonnées NFT. */
  readonly metadataBaseUrl?: string;
  /** Adresse du prize pool — affichée en lecture seule dans la console admin. */
  readonly prizePoolAddress?: string;
  /** Authentification (garde global + routes /auth/*). Absente → API non protégée. */
  readonly auth?: import("./http/server").ServerDeps["auth"];
}

/** Composition par défaut : CEX référence, divergence on-chain tolérée à 5 %. */
const DEFAULT_COMPOSE: ComposeOptions = { maxDivergence: 0.05, prefer: "cex" };

/** Base publique par défaut des métadonnées NFT (dev). */
const DEFAULT_METADATA_BASE_URL = "http://localhost:3000";

/** TTL court du cache OHLC : laisse apparaître vite une nouvelle bougie clôturée. */
const HISTORY_TTL_MS = 20_000;

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
  // Badges : montés dès qu'un store est fourni (affichage off-chain gratuit).
  // Le claim ON-CHAIN reste conditionné à l'issuer NFT (+ SourceTag) : sans eux,
  // `claim` renvoie 503, mais le statut/l'affichage marchent (mérite dérivé).
  const badgeService =
    config.badgeStore !== undefined
      ? new BadgeService({
          paper,
          competition,
          store: config.badgeStore,
          ...(config.nftIssuer !== undefined ? { issuer: config.nftIssuer } : {}),
          ...(config.sourceTag !== undefined ? { sourceTag: config.sourceTag } : {}),
          metadataBaseUrl: config.metadataBaseUrl ?? DEFAULT_METADATA_BASE_URL,
        })
      : undefined;
  // Console admin : active seulement si un token ET les stores agents/mandats/actions
  // sont fournis (le reste — comptes paper — est toujours là via `paper`).
  const admin =
    config.adminToken !== undefined &&
    config.agentStore !== undefined &&
    config.mandateStore !== undefined &&
    config.agentActionsStore !== undefined
      ? {
          token: config.adminToken,
          service: new AdminService({
            paper,
            agents: config.agentStore,
            mandates: config.mandateStore,
            actions: config.agentActionsStore,
            prizePoolAddress: config.prizePoolAddress ?? null,
            operatorUserIds: new Set(config.operatorUserIds ?? []),
          }),
        }
      : undefined;

  const cache = new PriceCache();
  // Lignes de marché (watchlist) du dernier rafraîchissement en mode `markets`.
  let marketRows: readonly MarketRow[] = [];

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
    const marketFallbackHistory = (error: unknown): Promise<Candle[]> => {
      const row = marketRows.find((market) => market.symbol === symbol.toUpperCase());
      if (config.markets === undefined || row === undefined) {
        throw error;
      }
      const markets = config.markets;
      const dexHistory = config.getDexHistory?.(symbol, interval, limit);
      const coinGeckoHistory = () =>
        fetchCoinGeckoOhlc(
          markets.baseUrl,
          row.id,
          markets.vsCurrency,
          interval,
          limit,
          config.fetchJson,
        ).catch(() =>
          fetchCoinGeckoHistory(
            markets.baseUrl,
            row.id,
            markets.vsCurrency,
            interval,
            limit,
            config.fetchJson,
          ),
        );
      const gateHistory = () =>
        fetchGateCandles(symbol, interval, limit, config.fetchJson).catch(coinGeckoHistory);
      if (dexHistory === undefined) {
        return gateHistory();
      }
      return dexHistory.then((candles) => candles ?? gateHistory()).catch(gateHistory);
    };
    const data = fetchKlines(symbol, interval, limit, config.fetchJson).catch(marketFallbackHistory);
    historyCache.set(key, { at: now, data });
    data.catch(() => historyCache.delete(key));
    return data;
  };

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
    agentService: config.agentService,
    mandateService: config.mandateService,
    agentActionsStore: config.agentActionsStore,
    agentChatService: config.agentChatService,
    agentChatCtx: config.agentChatCtx,
    badgeService,
    admin,
    auth: config.auth,
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
