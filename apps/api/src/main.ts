import "dotenv/config"; // charge apps/api/.env (clés XUMM, etc.) dans process.env
import { connectXrplClient, XrplCustodialWalletGateway, XrplNftIssuer } from "@tide/xrpl";
import type { XrplClient } from "@tide/xrpl";
import { isValidClassicAddress } from "xrpl";
import { buildAgentChatCtxFactory } from "./agent/chat-context";
import { AuthService } from "./auth/auth-service";
import { InMemoryChallengeStore } from "./auth/challenge-store";
import { SupabaseIdentityVerifier } from "./auth/external-auth";
import type { AuthzResolvers } from "./auth/guard";
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
import { buildAdminServer, type ExecDeps, type MetricsDeps, type SignDeps } from "./http/server";
import { DEFAULT_LIVE_QUOTE } from "./exec/plan-live";
import { AttributionIndexer } from "./indexer/indexer";
import { AgentChatService } from "./services/agent-chat-service";
import { AgentService } from "./services/agent-service";
import { MandateService } from "./services/mandate-service";
import type { MandateXamanApi } from "./services/mandate-service";
import { PaperService } from "./services/paper-service";
import { PaperWalletService } from "./services/paper-wallet-service";
import { WeeklyRewardService } from "./services/weekly-reward-service";
import { FirstTradeRewardService } from "./services/first-trade-reward-service";
import { GiveawayService } from "./services/giveaway-service";
import {
  PaperWalletAdminService,
  XrplPaperWalletAdminGateway,
} from "./services/paper-wallet-admin-service";
import { CompetitionPaymentService } from "./services/competition-payment-service";
import { SqliteAgentStore } from "./store/sqlite-agent-store";
import { SqliteMandateStore } from "./store/sqlite-mandate-store";
import { SqliteBadgeStore } from "./store/sqlite-badge-store";
import { SqlitePaperWalletStore } from "./store/sqlite-paper-wallet-store";
import { SqlitePaperRewardWalletStore } from "./store/sqlite-paper-reward-wallet-store";
import { SqliteWeeklyRewardStore } from "./store/sqlite-weekly-reward-store";
import { SqlitePaperBadgeRewardStore } from "./store/sqlite-paper-badge-reward-store";
import { SqliteAgentActionsStore } from "./store/sqlite-agent-actions-store";
import { SqliteAccountStore } from "./store/sqlite-account-store";
import { SqliteAttributionStore } from "./store/attribution-store";
import { SqliteCompetitionStore } from "./store/sqlite-competition-store";
import { SqliteExternalIdentityStore } from "./store/sqlite-external-identity-store";
import { openDatabase } from "./store/sqlite";
import { migrateAgentTables } from "./store/migrations/2026-07-05-agent-tables";
import { migrateBadgeTables } from "./store/migrations/2026-07-13-badge-tables";
import { migratePaperWalletRewardTables } from "./store/migrations/2026-07-16-paper-wallet-rewards";
import { removeLegacyDemoAccounts } from "./store/migrations/2026-07-18-remove-demo-data";
import { migrateExternalIdentityTables } from "./store/migrations/2026-07-22-external-identities";
import { migrateWalletDeleteColumns } from "./store/migrations/2026-08-27-wallet-delete";
import { migrateWalletLinkTables } from "./store/migrations/2026-08-27-wallet-links";
import { migrateManagedExternalWalletTables } from "./store/migrations/2026-08-28-managed-external-wallets";
import { migrateGiveawayTables } from "./store/migrations/2026-09-11-giveaway";
import { SqliteWalletLinkStore } from "./store/sqlite-wallet-link-store";
import { SqliteManagedExternalWalletStore } from "./store/sqlite-managed-external-wallet-store";
import { SqliteGiveawayStore } from "./store/sqlite-giveaway-store";
import {
  createFirstTradeExternalGuard,
  createFirstTradeManagedGuard,
} from "./services/first-trade-external-guard";
import { earnedCodes } from "./badges/merit";
import { createXamanApi } from "./xaman/sdk";
import { ArenaSimulationService } from "./simulation/arena-simulation-service";
import { isTechnicalTestUserId } from "./simulation/arena-ids";

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
// Rate limiting (F7) : borne globale généreuse par IP (usage normal jamais
// atteint) + borne stricte sur /auth/* (brute-force de challenge/signature).
const ONE_MINUTE_MS = 60_000;
const RATE_LIMIT = {
  global: { max: 300, windowMs: ONE_MINUTE_MS },
  strict: { max: 15, windowMs: ONE_MINUTE_MS },
} as const;
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
 * du produit) ; `TIDE_RLUSD_ISSUER` permet de surcharger l'issuer. Dans les deux
 * cas, le moteur n'est activé que si un SourceTag est
 * présent (sinon on signerait des swaps non attribués) :
 * - issuer SURCHARGÉ sans SourceTag = config explicitement cassée → on lève ;
 * - défaut sans SourceTag = mode off-chain pur assumé → Live simplement désactivé.
 * Le moteur tourne sans Xaman : `/exec/plan` (GemWallet) reste exposé ;
 * `/sign/live-offer` n'apparaît qu'avec Xaman.
 */
function buildExecDeps(
  sourceTag: number | undefined,
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
  migratePaperWalletRewardTables(db);
  migrateExternalIdentityTables(db);
  migrateWalletDeleteColumns(db);
  migrateWalletLinkTables(db);
  migrateManagedExternalWalletTables(db);
  migrateGiveawayTables(db);

  // Client XRPL partagé (feed on-chain + indexeur), si un nœud est configuré.
  const wsUrl = env.readOnchainWsUrl();
  const xrpl = wsUrl !== undefined ? connectXrplClient(wsUrl) : undefined;

  env.readXrplNetwork();
  const publicAdminToken = env.readAdminToken();
  const privateAdminRuntime = env.readPrivateAdminRuntimeConfig();
  const sourceTag = env.readSourceTag();
  const onchainPrices = buildOnchainProvider(xrpl, env.readOnchainPools() ?? {});
  const indexerSetup = buildIndexerSetup(xrpl, sourceTag);
  const sign = buildSignDeps(sourceTag);
  const exec = buildExecDeps(sourceTag, xrpl);
  const agentChatService = buildAgentChatService();
  const metrics: MetricsDeps | undefined =
    indexerSetup !== undefined
      ? { store: indexerSetup.store, sourceTag: indexerSetup.sourceTag }
      : undefined;

  // Badges NFT : store SQLite (toujours) + issuer (mint serveur) seulement si un
  // seed issuer + un nœud XRPL + un SourceTag sont configurés (sinon OFF ; les
  // métadonnées statiques /nft-metadata restent servies dans tous les cas).
  const badgeStore = new SqliteBadgeStore(db);
  const walletLinks = new SqliteWalletLinkStore(db);
  const managedExternalWalletStore = new SqliteManagedExternalWalletStore(db);
  const issuerSeed = env.readNftIssuerSeed();
  const nftIssuer =
    issuerSeed !== undefined && wsUrl !== undefined && sourceTag !== undefined
      ? new XrplNftIssuer({ serverUrl: wsUrl, issuerSeed, sourceTag })
      : undefined;
  const paperWalletRuntime = env.readPaperWalletRuntimeConfig();
  const firstTradeImageUri = env.readFirstTradeImageUri();
  const paperWalletStore = new SqlitePaperWalletStore(db);
  const paperRewardWalletStore = new SqlitePaperRewardWalletStore(db);
  const paperRewardRuntime =
    paperWalletRuntime === undefined
      ? undefined
      : (() => {
          const issuer = new XrplNftIssuer({
            serverUrl: paperWalletRuntime.serverUrl,
            issuerSeed: paperWalletRuntime.issuerSeed,
            sourceTag: paperWalletRuntime.sourceTag,
          });
          const gateway = new XrplCustodialWalletGateway({
            serverUrl: paperWalletRuntime.serverUrl,
            funderSeed: paperWalletRuntime.funderSeed,
            sourceTag: paperWalletRuntime.sourceTag,
          });
          const recovery = paperWalletRuntime.recoveryAddress;
          if (issuer.issuerAddress === gateway.funderAddress) {
            throw new Error("Le funder et l'issuer Paper Mainnet doivent être deux comptes distincts");
          }
          if (
            recovery === undefined ||
            recovery === issuer.issuerAddress ||
            recovery === gateway.funderAddress
          ) {
            throw new Error(
              "L'adresse de récupération Mainnet doit être distincte du funder et de l'issuer",
            );
          }
          const wallets = new PaperWalletService({
            store: paperWalletStore,
            rewardStore: paperRewardWalletStore,
            gateway,
            masterKeyHex: paperWalletRuntime.masterKeyHex,
            masterKeyId: paperWalletRuntime.masterKeyId,
            network: paperWalletRuntime.network,
            maxFundedWallets: paperWalletRuntime.maxFundedWallets,
            maxFundedWalletsPerDay: paperWalletRuntime.maxFundedWalletsPerDay,
          });
          return { gateway, issuer, wallets };
        })();
  const paperBadgeRewardStore = new SqlitePaperBadgeRewardStore(db);
  const weeklyRewards =
    paperRewardRuntime === undefined
      ? undefined
      : new WeeklyRewardService({
          store: new SqliteWeeklyRewardStore(db),
          wallets: paperRewardRuntime.wallets,
          issuer: paperRewardRuntime.issuer,
          gateway: paperRewardRuntime.gateway,
          metadataBaseUrl: env.readPublicBaseUrl(),
        });
  const firstTradeRewards =
    paperRewardRuntime === undefined
      ? undefined
      : new FirstTradeRewardService({
          store: paperBadgeRewardStore,
          wallets: paperRewardRuntime.wallets,
          issuer: paperRewardRuntime.issuer,
          gateway: paperRewardRuntime.gateway,
          managedClaimGuard: createFirstTradeManagedGuard({
            links: walletLinks,
            badgeClaims: badgeStore,
          }),
          metadataBaseUrl: env.readPublicBaseUrl(),
          network: "mainnet",
        });
  const paperWalletAdminGateway =
    paperWalletRuntime === undefined || paperRewardRuntime === undefined
      ? undefined
      : new XrplPaperWalletAdminGateway(
          paperWalletRuntime.serverUrl,
          paperWalletRuntime.sourceTag,
        );
  // Aucune compétition injectée : une base neuve reste vide jusqu'à la création
  // explicite d'une compétition réelle depuis la console locale.
  const competitionStore = new SqliteCompetitionStore(db);
  const prizePoolAddress = env.readPrizePoolAddress();
  const competitionPaymentsServerUrl = wsUrl ?? paperWalletRuntime?.serverUrl;
  const competitionPaymentsSourceTag = sourceTag ?? paperWalletRuntime?.sourceTag;
  const competitionPayments =
    competitionPaymentsServerUrl !== undefined &&
    competitionPaymentsSourceTag !== undefined &&
    prizePoolAddress !== undefined
      ? new CompetitionPaymentService({
          serverUrl: competitionPaymentsServerUrl,
          sourceTag: competitionPaymentsSourceTag,
          prizePoolAddress,
        })
      : undefined;

  // Aucun faux compte : le leaderboard ne contient que les comptes réellement
  // créés par des sessions utilisateur (profils de charge exclus à l'affichage).
  const accountStore = new SqliteAccountStore(db);
  removeLegacyDemoAccounts(db);
  const paper = new PaperService(undefined, accountStore);
  const arenaSimulation = new ArenaSimulationService(
    paper,
    env.readArenaSimulationConfig(),
  );
  const giveaway = new GiveawayService({
    store: new SqliteGiveawayStore(db),
    resolveIdentity: async (userId) => {
      const paperWallet =
        userId.startsWith("paper:") && paperRewardRuntime !== undefined
          ? await paperRewardRuntime.wallets.get(userId)
          : null;
      let hasFirstTrade = false;
      try {
        hasFirstTrade = paper.tradeCountOf(userId) > 0;
      } catch {
        // Un wallet externe peut ne pas encore avoir de compte Paper.
      }
      return {
        walletAddress: paperWallet?.address ?? (isValidClassicAddress(userId) ? userId : null),
        hasFirstTrade,
      };
    },
  });

  const paperWalletAdmin =
    paperWalletAdminGateway === undefined ||
    paperWalletRuntime === undefined ||
    paperRewardRuntime === undefined
      ? undefined
      : new PaperWalletAdminService({
          store: paperWalletStore,
          rewardStore: paperRewardWalletStore,
          rewards: paperBadgeRewardStore,
          wallets: paperRewardRuntime.wallets,
          provisioner: paperRewardRuntime.wallets,
          firstTradeRewards,
          ensurePaperAccount: (userId) => { paper.ensureAccount(userId); },
          paperUserActivity: (userId) => {
            if (isTechnicalTestUserId(userId)) return { exists: false, hasTraded: false };
            try {
              return {
                exists: true,
                hasTraded: paper.tradeCountOf(userId) > 0,
              };
            } catch {
              return { exists: false, hasTraded: false };
            }
          },
          badgeEligibility: (userId, badgeCode) => {
            try {
              const competitionCount = competitionStore
                .list()
                .filter((competition) => competitionStore.hasParticipant(competition.id, userId))
                .length;
              return earnedCodes({
                fillCount: paper.tradeCountOf(userId),
                competitionCount,
              }).includes(badgeCode);
            } catch {
              return false;
            }
          },
          issuer: paperRewardRuntime.issuer,
          recoveryAddress: paperWalletRuntime.recoveryAddress,
          network: "mainnet",
          gateway: paperWalletAdminGateway,
          metadataBaseUrl: env.readPublicBaseUrl(),
        });

  // Agents & mandats (AI Agent) : montés systématiquement — le serveur MCP et la
  // vue AgentView consomment ces routes (`/api/agents`, `/api/mandates`,
  // `/api/agent-actions`). La signature de mandat passe par le callback Xaman
  // (`/api/sign/mandate-callback`) ; MandateService n'appelle jamais l'API Xaman
  // directement → on injecte un stub throw-loud plutôt qu'un faux client silencieux.
  const agentStore = new SqliteAgentStore(db);
  const mandateStore = new SqliteMandateStore(db);
  const agentActionsStore = new SqliteAgentActionsStore(db);
  // Vérification de signature du mandat (F2). Pour un mandat Live (fonds réels),
  // `getPayloadStatus` doit prouver que le wallet propriétaire a signé — on adapte
  // l'API Xaman réelle (si XUMM câblé) au shape attendu ; sans XUMM, la vérif lève
  // → un mandat Live ne peut pas s'activer (fail-closed, conforme à la règle
  // « pas de Live agent avant F2 »). La création du payload de mandat n'est pas
  // encore câblée (le front active en Paper via signature simulée).
  const mandateXaman: MandateXamanApi = {
    createSignRequest() {
      throw new Error(
        "mandate Xaman signing not wired — le mandat est signé via /api/sign/mandate-callback",
      );
    },
    getPayloadStatus:
      sign !== undefined
        ? async (uuid) => {
            const status = await sign.api.get(uuid);
            return {
              meta: {
                signed: status?.signed ?? false,
                ...(status?.account !== null && status?.account !== undefined
                  ? { address: status.account }
                  : {}),
              },
            };
          }
        : () => {
            throw new Error(
              "mandate Xaman status not wired — signature Live non vérifiable sans XUMM",
            );
          },
  };
  const agentService = new AgentService(agentStore, mandateStore);
  const mandateService = new MandateService(mandateStore, mandateXaman, async (agentId) => {
    const agent = await agentStore.get(agentId);
    return agent?.hasLiveAccount ?? false;
  });

  // Authentification (Sign-In with XRPL) : obligatoire — l'API garde des fonds,
  // aucun démarrage sans secret de session. L'auth Xaman réutilise l'API XUMM si
  // câblée ; le garde résout la propriété agent/mandat via les stores locaux.
  const CHALLENGE_TTL_MS = 5 * 60_000;
  const externalAuthConfig = env.readExternalAuthConfig();
  const authService = new AuthService({
    secret: env.readSessionSecret(),
    ttlSeconds: env.readSessionTtlSeconds(),
    challenges: new InMemoryChallengeStore(CHALLENGE_TTL_MS),
    walletLinks,
    ...(sign !== undefined ? { xaman: sign.api } : {}),
    ...(externalAuthConfig !== undefined
      ? {
          external: {
            verifier: new SupabaseIdentityVerifier({
              baseUrl: externalAuthConfig.supabaseUrl,
              publishableKey: externalAuthConfig.publishableKey,
            }),
            identities: new SqliteExternalIdentityStore(db),
          },
        }
      : {}),
  });
  const authResolvers: AuthzResolvers = {
    agentOwner: async (id) => (await agentStore.get(id))?.userId ?? null,
    mandateOwner: async (id) => (await mandateStore.get(id))?.userId ?? null,
  };

  // Fabrique du contexte de chat agent : backends = adapters HTTP pointés sur
  // ce serveur (self), agent/mandat/actions = stores locaux. Le port est lu ici
  // (avant l'écoute) pour construire l'URL de boucle locale. Câblée seulement
  // si le chat est activé (clé LLM présente). Les appels self-HTTP portent un JWT
  // du user propriétaire → ils passent le garde d'autorisation.
  const port = env.readPort();
  const agentChatCtx =
    agentChatService === undefined
      ? undefined
      : buildAgentChatCtxFactory(
          `http://127.0.0.1:${String(port)}`,
          { agents: agentStore, mandates: mandateStore, actions: agentActionsStore },
          sourceTag,
          (userId) => authService.issueToken(userId),
        );

  // Option B : le claim First Trade sur wallet connecté est disponible dès que
  // le funnel Paper Mainnet est câblé ; la garde anti-farming l'encadre.
  const firstTradeExternalGuard =
    firstTradeRewards === undefined
      ? undefined
      : createFirstTradeExternalGuard({
          links: walletLinks,
          firstTradeRows: paperBadgeRewardStore,
          badgeClaims: badgeStore,
        });
  // Le runtime Paper possède déjà l'issuer dédié du programme First Trade.
  // On le réutilise pour les claims sur wallet externe si aucun issuer badge
  // générique n'est configuré ; sinon l'installation historique garde la
  // priorité. Même logique pour le SourceTag.
  const badgeIssuer = nftIssuer ?? paperRewardRuntime?.issuer;
  const badgeSourceTag = sourceTag ?? paperWalletRuntime?.sourceTag;
  const { app, cache, refreshPrices, privateAdmin } = createApp({
    markets: {
      baseUrl: env.readCexBaseUrl(),
      vsCurrency: DEFAULT_VS_CURRENCY,
      perPage: MARKETS_PER_PAGE,
    },
    fetchJson,
    accountStore,
    paper,
    competitionStore,
    competitionPayments,
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
    nftIssuer: badgeIssuer,
    badgeStore,
    weeklyRewards,
    firstTradeRewards,
    giveaway,
    ...(firstTradeExternalGuard !== undefined
      ? { firstTradeExternalGuard }
      : {}),
    paperWallets: paperRewardRuntime?.wallets,
    sourceTag: badgeSourceTag,
    metadataBaseUrl: env.readPublicBaseUrl(),
    firstTradeImageUri,
    ...(publicAdminToken !== undefined || privateAdminRuntime !== undefined
      ? { adminToken: publicAdminToken ?? privateAdminRuntime?.token }
      : {}),
    exposeAdminOnPublicServer: publicAdminToken !== undefined,
    operatorUserIds: env.readOperatorUserIds(),
    paperWalletStore,
    paperRewardWalletStore,
    simulation: arenaSimulation,
    paperWalletAdmin,
    ...(privateAdminRuntime !== undefined &&
    paperWalletRuntime !== undefined &&
    paperWalletAdminGateway !== undefined
      ? {
          managedExternalWallets: {
            store: managedExternalWalletStore,
            masterKeyHex: paperWalletRuntime.masterKeyHex,
            masterKeyId: paperWalletRuntime.masterKeyId,
            gateway: paperWalletAdminGateway,
          },
        }
      : {}),
    paperWalletNftInventory: paperWalletAdminGateway,
    agentStore,
    mandateStore,
    prizePoolAddress,
    auth: { service: authService, resolvers: authResolvers },
    corsOrigin: env.readCorsOrigin(),
    rateLimit: RATE_LIMIT,
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

  // Banc de charge explicite, Paper-only et OFF sans TIDE_SIMULATION_USERS.
  // Les profils sont exclus des rangs, badges et métriques d'utilisateurs.
  arenaSimulation.start(() => cache.current());

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

  if (privateAdminRuntime !== undefined) {
    if (privateAdmin === undefined) {
      throw new Error("Serveur admin privé demandé mais dépendances admin indisponibles");
    }
    const adminApp = buildAdminServer({
      ...privateAdmin,
      corsOrigin: ["http://127.0.0.1:5173", "http://localhost:5173"],
    });
    await adminApp.listen({ port: privateAdminRuntime.port, host: "0.0.0.0" });
    console.log(`Console admin privée à l'écoute sur :${String(privateAdminRuntime.port)}`);
  }

  await app.listen({ port, host: "0.0.0.0" });
  console.log(
    `Tide API à l'écoute sur :${String(port)} ` +
      `[on-chain:${onchainPrices !== undefined ? "on" : "off"} ` +
      `indexeur:${indexerSetup !== undefined ? "on" : "off"} ` +
      `xaman:${sign !== undefined ? "on" : "off"} ` +
      `live:${exec !== undefined ? "on" : "off"} ` +
      `chat:${agentChatService !== undefined ? "on" : "off"} ` +
      `arena:${arenaSimulation.status().enabled ? String(arenaSimulation.status().configuredUsers) : "off"}]`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
