import type { FastifyInstance } from "fastify";
import { PaperService } from "./services/paper-service";
import { CompetitionService } from "./services/competition-service";
import { PriceCache } from "./feed/price-cache";
import { fetchCexPrices } from "./feed/cex-price-feed";
import type { CexFeedConfig, FetchJson } from "./feed/cex-price-feed";
import { composePriceMap } from "./feed/compose-price";
import type {
  ComposeOptions,
  FeedLogger,
  OnchainPriceProvider,
} from "./feed/compose-price";
import { buildServer } from "./http/server";
import type { MetricsDeps, SignDeps } from "./http/server";
import type { AccountStore } from "./store/account-store";
import type { CompetitionStore } from "./store/competition-store";

/** Configuration de l'application assemblée. */
export interface AppConfig {
  /** Capital de départ des comptes paper (défaut domaine si omis). */
  readonly startingEquity?: number;
  readonly feed: CexFeedConfig;
  readonly symbols: readonly string[];
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
  /** Métriques d'attribution (route /metrics) — absente si indexeur non câblé. */
  readonly metrics?: MetricsDeps;
}

/** Composition par défaut : CEX référence, divergence on-chain tolérée à 5 %. */
const DEFAULT_COMPOSE: ComposeOptions = { maxDivergence: 0.05, prefer: "cex" };

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

  const app = buildServer({
    paper,
    competition,
    getPrices: () => cache.current(),
    sign: config.sign,
    metrics: config.metrics,
  });

  const refreshPrices = async (): Promise<void> => {
    const cexPrices = await fetchCexPrices(
      config.feed,
      config.symbols,
      config.fetchJson,
    );
    // Sans source on-chain, la composition renvoie le CEX restreint à `symbols`
    // (non-régression : `fetchCexPrices` produit déjà exactement ces symboles).
    const prices = await composePriceMap(
      cexPrices,
      config.symbols,
      config.compose ?? DEFAULT_COMPOSE,
      config.onchainPrices,
      config.feedLogger ?? DEFAULT_FEED_LOGGER,
    );
    cache.set(prices);
  };

  return { app, cache, refreshPrices };
}
