import "dotenv/config"; // charge apps/api/.env (clés XUMM, etc.) dans process.env
import { connectXrplClient, XrplNftIssuer } from "@tide/xrpl";
import type { XrplClient } from "@tide/xrpl";
import { buildAgentChatCtxFactory } from "./agent/chat-context";
import { createApp } from "./app";
import * as env from "./config/env";
import type { FetchJson } from "./feed/cex-price-feed";
import type { FeedLogger, OnchainPriceProvider } from "./feed/compose-price";
import { PriceFeedError } from "./feed/errors";
import { AmmOnchainPriceProvider } from "./feed/onchain-price";
import { fetchBinanceBookDepth } from "./feed/binance-book-feed";
import { fetchGateBookDepth } from "./feed/gate-book-feed";
import { fetchGeckoTerminalHistory } from "./feed/geckoterminal-history";
import type { GeckoTerminalToken } from "./feed/geckoterminal-history";
import { fetchHyperliquidBookDepth } from "./feed/hyperliquid-book-feed";
import { isKlineInterval } from "./feed/klines";
import type { SymbolPoolMap } from "./feed/onchain-price";
import type { ExecDeps, MetricsDeps, SignDeps } from "./http/server";
import { DEFAULT_LIVE_QUOTE } from "./exec/plan-live";
import { AttributionIndexer } from "./indexer/indexer";
import { AgentChatService } from "./services/agent-chat-service";
import { AgentService } from "./services/agent-service";
import { MandateService } from "./services/mandate-service";
import type { MandateXamanApi } from "./services/mandate-service";
import { PaperService } from "./services/paper-service";
import { SqliteAgentStore } from "./store/sqlite-agent-store";
import { SqliteMandateStore } from "./store/sqlite-mandate-store";
import { SqliteBadgeStore } from "./store/sqlite-badge-store";
import { SqliteAgentActionsStore } from "./store/sqlite-agent-actions-store";
import { seedDemoAccounts } from "./seed/accounts";
import { seedCompetitions } from "./seed/competitions";
import { SqliteAccountStore } from "./store/sqlite-account-store";
import { SqliteAttributionStore } from "./store/attribution-store";
import { SqliteCompetitionStore } from "./store/sqlite-competition-store";
import { openDatabase } from "./store/sqlite";
import { migrateAgentTables } from "./store/migrations/2026-07-05-agent-tables";
import { migrateBadgeTables } from "./store/migrations/2026-07-13-badge-tables";
import { createXamanApi } from "./xaman/sdk";

// Entrypoint du serveur. Assemble l'app testée (`createApp`) avec le vrai monde :
// `fetch`, variables d'environnement, écoute réseau, rafraîchissement périodique
// du feed et synchronisation de l'indexeur. La logique est testée ailleurs ; ce
// fichier n'est que du câblage runtime. Chaque intégration on-chain (feed AMM,
// indexeur, signature Xaman) est OPTIONNELLE et activée par sa configuration :
// sans elle, l'API tourne en mode off-chain pur (comportement par défaut).

const DEFAULT_VS_CURRENCY = "usd";
/** Devise de référence du volume indexé : doit correspondre à `vsCurrency` du feed. */
const REFERENCE_CURRENCY = DEFAULT_VS_CURRENCY;
const PRICE_REFRESH_MS = 30_000;
const INDEXER_SYNC_MS = 15_000;
// Feed « markets » CoinGecko : top N coins par capitalisation en UN appel (prix +
// %24h + nom), sans mapping manuel par coin. La PriceMap couvre donc ces N coins
// (watchlist dynamique + actifs tradables en Paper ; un actif coté ne casse pas
// l'équité). 250 = max d'un appel CoinGecko. ATTENTION : un volume indexé dont la
// devise n'est PAS dans ce top est normalisé à 0 (cf. risque tracé F4).
const MARKETS_PER_PAGE = 250;

/** Tokens DEX dont on connaît une source GeckoTerminal publique. */
const DEX_HISTORY_TOKENS: Readonly<Record<string, GeckoTerminalToken>> = {
  RAIN: {
    network: "arbitrum",
    address: "0x25118290e6a5f4139381d072181157035864099d",
  },
};

/** Journal runtime (replis de prix, trous d'indexation) — jamais avalés. */
const logger: FeedLogger = {
  warn: (message) => console.warn(`[runtime] ${message}`),
};

const fetchJson: FetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new PriceFeedError(`CEX HTTP ${String(response.status)}`);
  }
  return response.json();
};

const postJson = async (url: string, body: unknown): Promise<unknown> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new PriceFeedError(`HTTP POST ${String(response.status)}`);
  }
  return response.json();
};

function fetchBookDepth(symbol: string, limit: number) {
  if (symbol.toUpperCase() === "HYPE") {
    return fetchHyperliquidBookDepth(symbol, limit, postJson);
  }
  return fetchBinanceBookDepth(symbol, limit, fetchJson).catch(() =>
    fetchGateBookDepth(symbol, limit, fetchJson),
  );
}

function fetchDexHistory(symbol: string, interval: string, limit: number) {
  if (!isKlineInterval(interval)) {
    return undefined;
  }
  const token = DEX_HISTORY_TOKENS[symbol.toUpperCase()];
  if (token === undefined) {
    return undefined;
  }
  return fetchGeckoTerminalHistory(token, interval, limit, fetchJson);
}

/** Source de prix on-chain : seulement si un client ET des pools sont configurés. */
function buildOnchainProvider(
  xrpl: XrplClient | undefined,
  pools: SymbolPoolMap,
): OnchainPriceProvider | undefined {
  if (xrpl === undefined || Object.keys(pools).length === 0) {
    return undefined;
  }
  return new AmmOnchainPriceProvider(xrpl, pools);
}

/** Configuration de l'indexeur d'attribution (client + SourceTag + comptes + store). */
interface IndexerSetup {
  readonly accounts: readonly string[];
  readonly sourceTag: number;
  readonly store: SqliteAttributionStore;
}

/**
 * Réunit la config de l'indexeur. Renvoie `undefined` si l'indexeur n'est pas
 * demandé (pas de nœud, ou aucun compte à scanner). En revanche, des comptes
 * fournis **sans** SourceTag = config cassée (on indexerait sans pouvoir
 * attribuer) → on **lève**, symétriquement à la signature Xaman. Le store est
 * créé ici (avant `createApp`, pour exposer `/metrics`) ; l'indexeur lui-même est
 * instancié après, une fois le cache de prix disponible.
 */
function buildIndexerSetup(
  xrpl: XrplClient | undefined,
  sourceTag: number | undefined,
): IndexerSetup | undefined {
  if (xrpl === undefined) {
    return undefined;
  }
  const accounts = env.readIndexedAccounts();
  if (accounts === undefined) {
    return undefined; // pas de comptes à scanner → indexeur non demandé
  }
  if (sourceTag === undefined) {
    throw new Error(
      "Indexeur configuré (XRPL_WSS_URL + TIDE_INDEXED_ACCOUNTS) mais TIDE_SOURCE_TAG manquant",
    );
  }
  return {
    accounts,
    sourceTag,
    store: new SqliteAttributionStore(env.readAttributionDbPath()),
  };
}

/**
 * Dépendances de signature Xaman si les clés XUMM sont présentes. Une config
 * partielle (clés sans SourceTag ou sans prize pool) lève : on ne sert pas de
 * route de signature qui produirait des tx non attribuées ou sans destination.
 */
function buildSignDeps(sourceTag: number | undefined): SignDeps | undefined {
  const credentials = env.readXamanCredentials();
  if (credentials === undefined) {
    return undefined;
  }
  if (sourceTag === undefined) {
    throw new Error("XUMM configuré mais TIDE_SOURCE_TAG manquant (attribution requise)");
  }
  const prizePoolAddress = env.readPrizePoolAddress();
  if (prizePoolAddress === undefined) {
    throw new Error("XUMM configuré mais TIDE_PRIZE_POOL_ADDRESS manquant");
  }
  return {
    api: createXamanApi(credentials.apiKey, credentials.apiSecret),
    sourceTag,
    prizePoolAddress,
  };
}

/**
 * Moteur d'exécution Live. Quote par défaut = RLUSD mainnet (le token de cotation
 * du produit) ; `TIDE_RLUSD_ISSUER` permet de surcharger l'issuer (autre émetteur,
 * testnet). Dans les deux cas, le moteur n'est activé que si un SourceTag est
 * présent (sinon on signerait des swaps non attribués) :
 * - issuer SURCHARGÉ sans SourceTag = config explicitement cassée → on lève ;
 * - défaut sans SourceTag = mode off-chain pur assumé → Live simplement désactivé.
 * Le quote par défaut est l'issuer RLUSD **mainnet** : hors mainnet sans issuer
 * explicite, on lèverait des swaps contre un émetteur inexistant → on lève.
 * Le moteur tourne sans Xaman : `/exec/plan` (GemWallet) reste exposé ;
 * `/sign/live-offer` n'apparaît qu'avec Xaman.
 */
function buildExecDeps(
  sourceTag: number | undefined,
  network: env.XrplNetwork,
  xrpl: XrplClient | undefined,
): ExecDeps | undefined {
  // Lecteur de prix on-chain (AMM + carnet) si un nœud est câblé — le
  // `XrplClient` satisfait `OnchainExecReader`. Absent → plan sur prix CEX.
  const onchain = xrpl !== undefined ? { onchain: xrpl } : {};
  const override = env.readLiveQuote();
  if (override !== undefined) {
    if (sourceTag === undefined) {
      throw new Error("TIDE_RLUSD_ISSUER configuré mais TIDE_SOURCE_TAG manquant (attribution requise)");
    }
    return { sourceTag, quote: override, ...onchain };
  }
  if (sourceTag === undefined) {
    return undefined;
  }
  if (network !== "mainnet") {
    throw new Error(
      `Live activé sur ${network} sans TIDE_RLUSD_ISSUER : le quote par défaut est l'émetteur RLUSD mainnet (inexistant hors mainnet). Fournir TIDE_RLUSD_ISSUER.`,
    );
  }
  return { sourceTag, quote: DEFAULT_LIVE_QUOTE, ...onchain };
}

/**
 * Service de chat agent (Tâche 27). Activé dès que `TIDE_LLM_API_KEY` est
 * présent — la clé n'est jamais journalisée. Le `McpContext` runtime est câblé
 * par `buildAgentChatCtxFactory` (backends réels), plus de ctx stub.
 */
function buildAgentChatService(): AgentChatService | undefined {
  const apiKey = env.readLlmApiKey();
  if (apiKey === undefined) {
    return undefined;
  }
  const baseUrl = env.readLlmBaseUrl();
  return new AgentChatService({
    apiKey,
    model: env.readLlmModel(),
    ...(baseUrl !== undefined ? { baseUrl } : {}),
  });
}

/** Démarre la synchronisation périodique de l'indexeur (premier sync au boot). */
function startIndexerSync(indexer: AttributionIndexer): void {
  const run = (): void => {
    void indexer.sync().then(
      (result) => {
        if (result.recorded > 0) {
          console.log(
            `[indexer] ${String(result.recorded)} tx attribuées (curseur ${String(result.cursor)})`,
          );
        }
      },
      (error: unknown) => {
        console.error("[indexer] sync échoué:", error);
      },
    );
  };
  run();
  const timer = setInterval(run, INDEXER_SYNC_MS);
  timer.unref();
}

async function main(): Promise<void> {
  // Connexion SQLite partagée par les deux stores (persistance sur disque).
  const db = openDatabase(env.readDbPath());
  migrateAgentTables(db);
  migrateBadgeTables(db);

  // Client XRPL partagé (feed on-chain + indexeur), si un nœud est configuré.
  const wsUrl = env.readOnchainWsUrl();
  const xrpl = wsUrl !== undefined ? connectXrplClient(wsUrl) : undefined;

  const network = env.readXrplNetwork();
  const sourceTag = env.readSourceTag();
  const onchainPrices = buildOnchainProvider(xrpl, env.readOnchainPools() ?? {});
  const indexerSetup = buildIndexerSetup(xrpl, sourceTag);
  const sign = buildSignDeps(sourceTag);
  const exec = buildExecDeps(sourceTag, network, xrpl);
  const agentChatService = buildAgentChatService();
  const metrics: MetricsDeps | undefined =
    indexerSetup !== undefined
      ? { store: indexerSetup.store, sourceTag: indexerSetup.sourceTag }
      : undefined;

  // Badges NFT : store SQLite (toujours) + issuer (mint serveur) seulement si un
  // seed issuer + un nœud XRPL + un SourceTag sont configurés (sinon OFF ; les
  // métadonnées statiques /nft-metadata restent servies dans tous les cas).
  const badgeStore = new SqliteBadgeStore(db);
  const issuerSeed = env.readNftIssuerSeed();
  const nftIssuer =
    issuerSeed !== undefined && wsUrl !== undefined && sourceTag !== undefined
      ? new XrplNftIssuer({ serverUrl: wsUrl, issuerSeed, sourceTag })
      : undefined;

  // Compétitions de démo (idempotent) : le front fusionne leur état live avec
  // son catalogue de présentation. Sans seed, la liste serait vide au premier boot.
  const competitionStore = new SqliteCompetitionStore(db);
  seedCompetitions(competitionStore);

  // Comptes de démo (idempotent) : peuplent le classement de vraies entrées
  // variées dès le premier lancement (équités calculées au prix réel du feed).
  const accountStore = new SqliteAccountStore(db);
  seedDemoAccounts(new PaperService(undefined, accountStore), accountStore);

  // Agents & mandats (AI Agent) : montés systématiquement — le serveur MCP et la
  // vue AgentView consomment ces routes (`/api/agents`, `/api/mandates`,
  // `/api/agent-actions`). La signature de mandat passe par le callback Xaman
  // (`/api/sign/mandate-callback`) ; MandateService n'appelle jamais l'API Xaman
  // directement → on injecte un stub throw-loud plutôt qu'un faux client silencieux.
  const agentStore = new SqliteAgentStore(db);
  const mandateStore = new SqliteMandateStore(db);
  const agentActionsStore = new SqliteAgentActionsStore(db);
  const mandateXaman: MandateXamanApi = {
    createSignRequest() {
      throw new Error(
        "mandate Xaman signing not wired — le mandat est signé via /api/sign/mandate-callback",
      );
    },
    getPayloadStatus() {
      throw new Error(
        "mandate Xaman status not wired — le mandat est signé via /api/sign/mandate-callback",
      );
    },
  };
  const agentService = new AgentService(agentStore, mandateStore);
  const mandateService = new MandateService(mandateStore, mandateXaman);

  // Fabrique du contexte de chat agent : backends = adapters HTTP pointés sur
  // ce serveur (self), agent/mandat/actions = stores locaux. Le port est lu ici
  // (avant l'écoute) pour construire l'URL de boucle locale. Câblée seulement
  // si le chat est activé (clé LLM présente).
  const port = env.readPort();
  const agentChatCtx =
    agentChatService === undefined
      ? undefined
      : buildAgentChatCtxFactory(
          `http://127.0.0.1:${String(port)}`,
          { agents: agentStore, mandates: mandateStore, actions: agentActionsStore },
          sourceTag,
        );

  const { app, cache, refreshPrices } = createApp({
    markets: {
      baseUrl: env.readCexBaseUrl(),
      vsCurrency: DEFAULT_VS_CURRENCY,
      perPage: MARKETS_PER_PAGE,
    },
    fetchJson,
    accountStore,
    competitionStore,
    onchainPrices,
    getBookDepth: fetchBookDepth,
    getDexHistory: fetchDexHistory,
    sign,
    exec,
    metrics,
    agentChatService,
    agentService,
    mandateService,
    agentActionsStore,
    agentChatCtx,
    nftIssuer,
    badgeStore,
    sourceTag,
    metadataBaseUrl: env.readPublicBaseUrl(),
  });

  // Premier remplissage du cache (on ne bloque pas le démarrage si le CEX échoue).
  await refreshPrices().catch((error: unknown) => {
    console.error("[feed] premier rafraîchissement échoué:", error);
  });
  const priceTimer = setInterval(() => {
    void refreshPrices().catch((error: unknown) => {
      console.error("[feed] rafraîchissement échoué:", error);
    });
  }, PRICE_REFRESH_MS);
  priceTimer.unref();

  // L'indexeur a besoin du cache de prix (normalisation du volume) → après createApp.
  if (indexerSetup !== undefined && xrpl !== undefined) {
    const indexer = new AttributionIndexer(
      {
        client: xrpl,
        recorder: indexerSetup.store,
        getPrices: () => cache.current(),
        logger,
      },
      {
        accounts: indexerSetup.accounts,
        sourceTag: indexerSetup.sourceTag,
        referenceCurrency: REFERENCE_CURRENCY,
      },
    );
    startIndexerSync(indexer);
  }

  await app.listen({ port, host: "0.0.0.0" });
  console.log(
    `Tide API à l'écoute sur :${String(port)} ` +
      `[on-chain:${onchainPrices !== undefined ? "on" : "off"} ` +
      `indexeur:${indexerSetup !== undefined ? "on" : "off"} ` +
      `xaman:${sign !== undefined ? "on" : "off"} ` +
      `live:${exec !== undefined ? "on" : "off"} ` +
      `chat:${agentChatService !== undefined ? "on" : "off"}]`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
