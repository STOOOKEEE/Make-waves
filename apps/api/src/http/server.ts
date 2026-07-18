import Fastify from "fastify";
import { timingSafeEqual } from "node:crypto";
import cors from "@fastify/cors";
import { createRateLimiter } from "./rate-limiter";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PriceMap } from "@tide/core";
import { agentBroadcaster } from "../sse/agent-broadcast";
import type { AgentEvent } from "../sse/agent-broadcast";
import { makeEventFilter } from "../sse/event-filter";
import type { BookDepth } from "../feed/binance-book-feed";
import type { AttributionMetrics } from "@tide/xrpl";
import type { Candle } from "../feed/klines";
import type { MarketRow } from "../feed/coingecko-markets";
import type { PaperService } from "../services/paper-service";
import type { CompetitionService } from "../services/competition-service";
import type { CompetitionPaymentService } from "../services/competition-payment-service";
import type { AgentService } from "../services/agent-service";
import type { MandateService } from "../services/mandate-service";
import type { AgentXrplAccountService } from "../services/agent-xrpl-account-service";
import type { AgentActionsStore } from "../store/agent-actions-store";
import type { XamanPayloadApi } from "../xaman/sign-request";
import type { AgentChatService } from "../services/agent-chat-service";
import type { Agent, McpContext } from "@tide/mcp";
import {
  createConnectSignRequest,
  createSignRequest,
  getPayloadStatus,
} from "../xaman/sign-request";
import { planLiveOffer } from "../exec/plan-live";
import type { OnchainExecReader } from "../exec/plan-live";
import type { LiveQuote } from "../exec/plan-live";
import { statusForError } from "./errors";
import {
  parseBuyInRequest,
  parseClaimBadge,
  parseCompetition,
  parseCompetitionJoin,
  parseConfirmBadge,
  parseCreateAgent,
  parseCreateMandate,
  parseLiveOfferRequest,
  parseOpenPosition,
  parseOrder,
  parseWeeklyRewardWeek,
  parseProvisionLiveAccount,
  parseSignMandateCallback,
  parseUpdateAgent,
  parseUserId,
} from "./parse";
import type { BadgeService } from "../services/badge-service";
import {
  WeeklyRewardUnavailableError,
  type WeeklyRewardService,
} from "../services/weekly-reward-service";
import { badgeByCode } from "../badges/catalog";
import { WEEKLY_TRADE_SVG } from "../badges/weekly-trade-svg";
import { FIRST_TRADE_SVG } from "../badges/first-trade-svg";
import { FIRST_COMPETITION_SVG, TEN_TRADES_SVG } from "../badges/catalog-badge-svg";
import { authorize } from "../auth/guard";
import type { AuthzResolvers } from "../auth/guard";
import type { AuthService } from "../auth/auth-service";
import { XamanNotConfiguredError } from "../auth/auth-service";
import type { AdminService } from "../services/admin-service";
import { isArenaSimulationUserId, isTechnicalTestUserId } from "../simulation/arena-ids";
import type { TestnetE2ERunner } from "../simulation/testnet-e2e-runner";
import type { FirstTradeRewardService } from "../services/first-trade-reward-service";
import type { PaperWalletAdminService } from "../services/paper-wallet-admin-service";
import {
  CompetitionPaymentUnavailableError,
  CompetitionScoringUnavailableError,
} from "../services/errors";

/**
 * Signature non-custodiale via Xaman. Le `sourceTag` (attribution Tide) et le
 * `prizePoolAddress` (destination des buy-ins) vivent ici, côté serveur : le
 * client ne les fournit jamais. Optionnel → sans clés XUMM, les routes /sign/*
 * ne sont pas exposées (le câblage runtime décide).
 */
export interface SignDeps {
  readonly api: XamanPayloadApi;
  readonly sourceTag: number;
  readonly prizePoolAddress: string;
}

/**
 * Moteur d'exécution des swaps Live (best execution + bornage du slippage). Le
 * `sourceTag` (attribution) et le quote (issuer du token de cotation) vivent ici,
 * côté serveur. Optionnel : sans quote configuré, le Live n'est pas exposé.
 * Alimente `/exec/plan` (GemWallet, signature côté extension) et — si Xaman est
 * aussi configuré — `/sign/live-offer` (payload Xaman).
 */
export interface ExecDeps {
  readonly sourceTag: number;
  readonly quote: LiveQuote;
  /** Lecteur de prix on-chain (AMM + carnet). Absent → prix CEX de repli. */
  readonly onchain?: OnchainExecReader;
}

/** Lecture des métriques d'attribution (le `SqliteAttributionStore` la satisfait). */
export interface MetricsReader {
  metrics(sourceTag: number): AttributionMetrics;
}

/** Exposition des métriques du hackathon. Optionnel → /metrics absent sans indexeur. */
export interface MetricsDeps {
  readonly store: MetricsReader;
  readonly sourceTag: number;
}

/** Dépendances injectées (testable : on passe des fakes en test). */
export interface ServerDeps {
  readonly paper: PaperService;
  readonly competition: CompetitionService;
  /** Tickets XRP réels : construction serveur + vérification ledger validé. */
  readonly competitionPayments?: Pick<
    CompetitionPaymentService,
    "entryPayment" | "verifyEntry" | "winnerPayout"
  >;
  /** Equity Live réelle, absente tant que l'indexation PnL wallet n'est pas prête. */
  readonly getLiveCompetitionEquity?: (userId: string) => number;
  /** Carte de prix courante (sera câblée au feed de prix off-chain). */
  readonly getPrices: () => PriceMap;
  /** Lignes de marché pour la watchlist (top N coins). Absent → /markets non monté. */
  readonly getMarkets?: () => readonly MarketRow[];
  /** Historique OHLC réel (Binance klines). Absent → /history non monté. */
  readonly getHistory?: (
    symbol: string,
    interval: string,
    limit: number,
  ) => Promise<Candle[]>;
  /** Carnet CEX réel. Absent → /book non monté. */
  readonly getBookDepth?: (symbol: string, limit: number) => Promise<BookDepth>;
  /** Signature Xaman (routes /sign/*) — absente si XUMM non configuré. */
  readonly sign?: SignDeps;
  /** Moteur d'exécution Live (/exec/plan, /sign/live-offer) — absent si quote non configuré. */
  readonly exec?: ExecDeps;
  /** Métriques d'attribution (route /metrics) — absente si indexeur non câblé. */
  readonly metrics?: MetricsDeps;
  /** Service de gestion des agents (routes /api/agents/*) — absent si pas câblé. */
  readonly agentService?: AgentService;
  /** Service de gestion des mandats (routes /api/mandates, /api/sign/mandate-callback) — absent si pas câblé. */
  readonly mandateService?: MandateService;
  /** Service de provision/révocation du compte XRPL Live d'un agent (Tâche 21) — absent si pas câblé. */
  readonly agentXrplAccountService?: AgentXrplAccountService;
  /** Store d'actions d'agent (route /api/agent-actions) — absent si pas câblé. */
  readonly agentActionsStore?: AgentActionsStore;
  /** Service de chat agent (route /api/agent-chat/stream) — absent si pas câblé. */
  readonly agentChatService?: AgentChatService;
  /**
   * Fabrique du `McpContext` runtime pour le chat agent (câblée par `main.ts`
   * sur les vrais backends). Absente → repli sur le stub throw-loud
   * `buildAgentChatCtx`. Peut lever (agent stoppé / mandat absent) : la route
   * capture et renvoie 400 avant d'ouvrir le flux SSE.
   */
  readonly agentChatCtx?: (agentId: string, userId: string) => Promise<McpContext>;
  /** Service de badges (routes /accounts/:id/badges, /badges/:code/claim) — absent si pas d'issuer NFT. */
  readonly badgeService?: BadgeService;
  /** Une carte/NFT par semaine avec au moins un trade Paper. */
  readonly weeklyRewards?: WeeklyRewardService;
  /** Wallet Testnet + badge custodial remis automatiquement au premier trade. */
  readonly firstTradeRewards?: FirstTradeRewardService;
  /** Console admin (route /admin/overview) — absente si TIDE_ADMIN_TOKEN non configuré. */
  readonly admin?: {
    readonly token: string;
    readonly service: AdminService;
    readonly testnetE2E?: TestnetE2ERunner;
    readonly walletAdmin?: PaperWalletAdminService;
  };
  /**
   * Authentification : garde global (Sign-In with XRPL) + routes /auth/*. Absente
   * → API non protégée (tests unitaires / legacy). En prod, `main.ts` la câble
   * toujours (secret de session requis au boot).
   */
  readonly auth?: { readonly service: AuthService; readonly resolvers: AuthzResolvers };
  /** Origine(s) CORS autorisée(s) (F6). Absente → reflète toute origine (dev). */
  readonly corsOrigin?: string | string[];
  /** Base publique des URL de métadonnées NFT (F8) — jamais le header Host. */
  readonly publicBaseUrl?: string;
  /** Image IPFS du badge First Trade. */
  readonly firstTradeImageUri?: string;
  /** Limites de débit (F7). Absente → pas de rate-limit (tests/legacy). */
  readonly rateLimit?: {
    readonly global: { readonly max: number; readonly windowMs: number };
    readonly strict: { readonly max: number; readonly windowMs: number };
  };
}

/**
 * Erreur uniforme renvoyée par tout stub `ctx` du chat agent tant que le
 * câblage runtime complet n'est pas branché. Garantit qu'un LLM qui appelle
 * `place_order` / `open_position` / `join_competition` / etc. NE reçoit
 * JAMAIS un shape de succès (`{ orderId: "stub" }`) — la convention maison
 * « ne jamais avaler un succès silencieux » (cf. ~/.claude/CLAUDE.md).
 * L'erreur remonte à Claude comme `tool_result is_error=true`, l'agent peut
 * s'auto-corriger, l'utilisateur voit un message honnête.
 */
function throwAgentChatNotWired(): never {
  throw new Error("agent chat not wired — runtime ctx missing");
}

/**
 * Construit un `McpContext` stub pour la route `/api/agent-chat/stream` —
 * chaque backend (`paper`, `trading`, `perp`, `competitions`, `actions`,
 * `priceFeed`) lève `agent chat not wired — runtime ctx missing` au premier
 * appel. Le câblage runtime (Tâche câblage) remplacera ce stub par les vrais
 * adapters `@tide/api`. D'ici là, seul l'agent LLM qui tente une action est
 * refusé explicitement — les reads passent par le throw via le même chemin.
 */
function buildAgentChatCtx(agentId: string, userId: string): McpContext {
  const now = Date.now();
  const agent: Agent = {
    id: agentId,
    userId,
    name: "stub",
    type: "external",
    status: "active",
    hasLiveAccount: false,
    createdAt: now,
    updatedAt: now,
  };
  return {
    agent,
    userId,
    mandate: null,
    priceFeed: {
      priceOf: async () => throwAgentChatNotWired(),
      markets: async () => throwAgentChatNotWired(),
      history: async () => throwAgentChatNotWired(),
      orderbook: async () => throwAgentChatNotWired(),
    },
    paper: {
      getBalance: async () => throwAgentChatNotWired(),
      getPortfolio: async () => throwAgentChatNotWired(),
      listPositions: async () => throwAgentChatNotWired(),
      getLeaderboard: async () => throwAgentChatNotWired(),
    },
    trading: {
      placeOrder: async () => throwAgentChatNotWired(),
      placeLiveOrder: async () => throwAgentChatNotWired(),
      cancelOrder: async () => throwAgentChatNotWired(),
      getOpenOrders: async () => throwAgentChatNotWired(),
    },
    perp: {
      openPosition: async () => throwAgentChatNotWired(),
      closePosition: async () => throwAgentChatNotWired(),
    },
    competitions: {
      list: async () => throwAgentChatNotWired(),
      get: async () => throwAgentChatNotWired(),
      join: async () => throwAgentChatNotWired(),
      getLeaderboard: async () => throwAgentChatNotWired(),
    },
    actions: {
      record: async () => throwAgentChatNotWired(),
      findByIdempotencyKey: async () => throwAgentChatNotWired(),
      listByAgent: async () => throwAgentChatNotWired(),
      countToday: async () => throwAgentChatNotWired(),
    },
    config: {
      mode: "paper",
      sourceTag: null,
      availablePairs: [],
    },
  };
}

/**
 * Ouvre un flux SSE : pose le CORS puis hijack la socket. Le plugin
 * `@fastify/cors` écrit l'en-tête `Access-Control-Allow-Origin` via un hook
 * Fastify, mais `reply.hijack()` court-circuite l'écriture gérée par Fastify →
 * sans miroir explicite de l'Origin ici, une réponse SSE cross-origin (front
 * Vite → API :3000) est bloquée par le navigateur. On reflète donc l'Origin
 * (comportement de `origin: true`) directement sur `reply.raw` avant hijack.
 */
function startEventStream(request: FastifyRequest, reply: FastifyReply): void {
  const origin = request.headers.origin;
  if (typeof origin === "string") {
    reply.raw.setHeader("Access-Control-Allow-Origin", origin);
    reply.raw.setHeader("Vary", "Origin");
  }
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.hijack();
  // Flush immédiat : sans ça Node retient les en-têtes jusqu'au 1er `write`
  // (un event ou le ping 30 s) → l'EventSource/le fetch du navigateur reste en
  // attente d'ouverture, et l'en-tête CORS n'est envoyé que trop tard.
  reply.raw.flushHeaders();
}

/** Base publique par défaut des URL de métadonnées NFT (dev / tests). */
const DEFAULT_PUBLIC_BASE_URL = "http://localhost:3000";

/**
 * Construit le serveur HTTP (Fastify) qui expose les services. Aucune écoute
 * réseau ici : `buildServer` retourne l'instance, testable via `inject()`.
 */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: false });

  /** Découple le fill Paper immédiat du funding Testnet (lent et optionnel). */
  const registerPaperTrade = async (userId: string): Promise<void> => {
    // Les profils du banc de charge ne reçoivent ni wallet XRPL ni récompense :
    // ils n'existent que pour exercer le moteur Paper local.
    if (isArenaSimulationUserId(userId)) return;
    const rewards = deps.weeklyRewards;
    if (rewards !== undefined) {
      try {
        await rewards.recordTrade(userId);
      } catch (error) {
        console.error("[weekly-rewards] qualification échouée:", error);
      }
      void rewards.provisionWallet(userId).catch((error: unknown) => {
        console.error("[weekly-rewards] provision wallet échouée:", error);
      });
    }
    // Appelé à chaque fill : le store rend la récompense idempotente et permet
    // de reprendre un `offer_pending` après un redémarrage sans remint.
    if (deps.firstTradeRewards !== undefined) {
      void deps.firstTradeRewards.recordFirstTrade(userId).catch((error: unknown) => {
        console.error("[first-trade-reward] remise échouée:", error);
      });
    }
  };

  // CORS (F6) : le front (port/domaine distinct) appelle l'API en cross-origin.
  // En prod, `deps.corsOrigin` restreint aux origines du front (env) ; absent →
  // reflète toute origine (dev/démo).
  void app.register(cors, { origin: deps.corsOrigin ?? true });

  // Rate limiting (F7) : borne globale par IP + borne stricte sur /auth/* (brute-
  // force de challenge/signature). Montée seulement si configurée (main.ts) → les
  // tests ne sont pas limités. Hook onRequest (avant tout traitement).
  if (deps.rateLimit !== undefined) {
    const rl = deps.rateLimit;
    const globalLimiter = createRateLimiter(rl.global.max, rl.global.windowMs);
    const strictLimiter = createRateLimiter(rl.strict.max, rl.strict.windowMs);
    app.addHook("onRequest", async (request, reply) => {
      const url = request.routeOptions.url ?? request.url;
      const strict = url.startsWith("/auth/");
      const limiter = strict ? strictLimiter : globalLimiter;
      const key = `${strict ? "strict" : "global"}:${request.ip}`;
      if (!limiter.hit(key)) {
        return reply.code(429).send({ error: "trop de requêtes" });
      }
    });
  }

  // Tolère un corps JSON vide : certains POST n'ont pas de body (/sign/connect,
  // /competitions/:id/close) mais un client peut quand même poser le content-type
  // application/json → le parser par défaut échouerait sur un body vide.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      const text = typeof body === "string" ? body : body.toString("utf8");
      if (text === "") {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(text));
      } catch (error) {
        done(error instanceof Error ? error : new Error("JSON invalide"), undefined);
      }
    },
  );

  app.setErrorHandler((error, _request, reply) => {
    const status = statusForError(error);
    // On ne relaie le message au client que pour les fautes client (4xx). Toute
    // erreur 5xx — bug interne (500) OU panne d'un service amont (502 : feed de
    // prix, Xaman) — renvoie un libellé générique : ni le détail interne ni celui
    // de l'infra amont ne doit fuiter vers un client externe.
    const message =
      status >= 500
        ? status === 502
          ? "Service amont indisponible"
          : "Erreur interne"
        : error instanceof Error
          ? error.message
          : "Erreur";
    void reply.status(status).send({ error: message });
  });

  // Authentification (Sign-In with XRPL) : pose le garde global + les routes
  // /auth/* si câblée. Absente en test/legacy → API non protégée.
  if (deps.auth !== undefined) {
    registerAuth(app, deps.auth);
  }

  app.post("/accounts", (request, reply) => {
    const { userId } = parseUserId(request.body, "openAccount");
    deps.paper.openAccount(userId);
    reply.code(201);
    return { userId };
  });

  app.post("/accounts/ensure", (request) => {
    const { userId } = parseUserId(request.body, "ensureAccount");
    const created = deps.paper.ensureAccount(userId);
    return { userId, created };
  });

  app.get<{ Params: { userId: string } }>(
    "/accounts/:userId/balances",
    (request) => deps.paper.balancesOf(request.params.userId),
  );

  app.get<{ Params: { userId: string } }>(
    "/accounts/:userId/orders",
    (request) => deps.paper.ordersOf(request.params.userId),
  );

  app.get<{ Params: { userId: string } }>(
    "/accounts/:userId/portfolio",
    (request) =>
      deps.paper.portfolioOf(request.params.userId, deps.getPrices()),
  );

  app.post<{ Params: { userId: string } }>(
    "/accounts/:userId/orders",
    async (request, reply) => {
      const order = parseOrder(request.body);
      const fill = deps.paper.placeOrder(request.params.userId, order);
      // Le trading Paper reste disponible si XRPL est momentanément indisponible.
      // Un funding ambigu est gelé pour reprise opérateur, jamais retenté en boucle.
      await registerPaperTrade(request.params.userId);
      reply.code(201);
      return fill;
    },
  );

  app.get<{ Params: { userId: string } }>(
    "/accounts/:userId/positions",
    (request) => deps.paper.positionsOf(request.params.userId),
  );

  app.post<{ Params: { userId: string } }>(
    "/accounts/:userId/positions",
    async (request, reply) => {
      const input = parseOpenPosition(request.body);
      const position = deps.paper.openPosition(request.params.userId, input);
      await registerPaperTrade(request.params.userId);
      reply.code(201);
      return position;
    },
  );

  // La fermeture valorise au prix serveur (autoritatif) : le client n'envoie
  // jamais le prix de sortie, seulement l'id de la position.
  app.post<{ Params: { userId: string; positionId: string } }>(
    "/accounts/:userId/positions/:positionId/close",
    (request) =>
      deps.paper.closePosition(
        request.params.userId,
        request.params.positionId,
        deps.getPrices(),
      ),
  );

  app.get("/leaderboard", () =>
    deps.paper.leaderboard(deps.getPrices(), (userId) => !isTechnicalTestUserId(userId)),
  );

  /** Carte de prix courante (instantané du cache off-chain). */
  app.get("/prices", () => deps.getPrices());

  // Prix unitaire pour un symbole (lookup dans le cache /prices). Le MCP server
  // l'appelle pour `get_market(symbol)`.
  app.get<{ Params: { symbol: string } }>("/prices/:symbol", (request, reply) => {
    const symbol = request.params.symbol.toUpperCase();
    const price = deps.getPrices()[symbol];
    if (price === undefined) {
      reply.code(404);
      return { error: `no price for ${symbol}` };
    }
    return { symbol, price, timestamp: Date.now() };
  });

  // Liste des marchés (top N coins : symbole, nom, prix, %24h) pour la watchlist.
  // `limit` optionnel borné à la taille de la liste ; absent → liste complète.
  if (deps.getMarkets !== undefined) {
    const getMarkets = deps.getMarkets;
    app.get<{ Querystring: { limit?: string } }>("/markets", (request) => {
      const rows = getMarkets();
      const parsed = Number(request.query.limit);
      const limit =
        Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, rows.length) : rows.length;
      return rows.slice(0, limit);
    });
  }

  // Config publique pour le client : le SourceTag d'attribution (entier public,
  // pas un secret) et le symbole du token de cotation Live (présent ⇔ Live activable).
  app.get("/config", () => ({
    sourceTag: deps.exec?.sourceTag ?? deps.sign?.sourceTag ?? null,
    quoteSymbol: deps.exec?.quote.symbol ?? null,
  }));

  // Historique OHLC réel (Binance klines) pour le chart. `interval` (15m/1h/...)
  // et `limit` (nombre de bougies, borné côté serveur).
  if (deps.getHistory !== undefined) {
    const getHistory = deps.getHistory;
    app.get<{
      Params: { symbol: string };
      Querystring: { interval?: string; limit?: string };
    }>("/history/:symbol", (request) => {
      const interval = request.query.interval ?? "1h";
      const parsed = Number(request.query.limit);
      const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 300) : 120;
      return getHistory(request.params.symbol, interval, limit);
    });
  }

  if (deps.getBookDepth !== undefined) {
    const getBookDepth = deps.getBookDepth;
    app.get<{
      Params: { symbol: string };
      Querystring: { limit?: string };
    }>("/book/:symbol", (request) => {
      const parsed = Number(request.query.limit);
      const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 20) : 8;
      return getBookDepth(request.params.symbol, limit);
    });
  }

  app.get("/competitions", () => deps.competition.list());

  app.get<{ Params: { id: string } }>(
    "/competitions/:id",
    (request) => deps.competition.get(request.params.id),
  );

  const competitionEquity = (competitionId: string) => {
    const competition = deps.competition.get(competitionId);
    if (competition.mode === "paper") {
      const prices = deps.getPrices();
      return (userId: string) => deps.paper.equityOf(userId, prices);
    }
    if (deps.getLiveCompetitionEquity === undefined) {
      throw new CompetitionScoringUnavailableError("live");
    }
    return deps.getLiveCompetitionEquity;
  };

  app.get<{ Params: { id: string } }>(
    "/competitions/:id/leaderboard",
    (request) =>
      deps.competition.leaderboard(
        request.params.id,
        competitionEquity(request.params.id),
      ),
  );

  // GemWallet : transaction exacte à signer. Montant, pool, tag et memo sont
  // dérivés côté serveur depuis la compétition persistée.
  app.post<{ Params: { id: string } }>(
    "/competitions/:id/entry/tx",
    (request) => {
      const payments = deps.competitionPayments;
      if (payments === undefined) throw new CompetitionPaymentUnavailableError();
      const { account } = parseBuyInRequest(request.body);
      const competition = deps.competition.get(request.params.id);
      if (competition.mode === "paper") deps.paper.ensureAccount(account);
      return payments.entryPayment(account, competition);
    },
  );

  // Xaman : même Payment serveur, présenté dans la modale non-custodiale.
  app.post<{ Params: { id: string } }>(
    "/competitions/:id/entry/xaman",
    async (request, reply) => {
      const payments = deps.competitionPayments;
      if (payments === undefined || deps.sign === undefined) {
        throw new CompetitionPaymentUnavailableError();
      }
      const { account } = parseBuyInRequest(request.body);
      const competition = deps.competition.get(request.params.id);
      if (competition.mode === "paper") deps.paper.ensureAccount(account);
      const signRequest = await createSignRequest(
        deps.sign.api,
        payments.entryPayment(account, competition),
      );
      reply.code(201);
      return signRequest;
    },
  );

  app.post<{ Params: { id: string } }>(
    "/competitions/:id/join",
    async (request) => {
      const payments = deps.competitionPayments;
      if (payments === undefined) throw new CompetitionPaymentUnavailableError();
      const { userId, txHash } = parseCompetitionJoin(request.body);
      const competition = deps.competition.get(request.params.id);
      // L'identité authentifiée est aussi le compte signataire : une session
      // Paper anonyme ne peut pas attribuer le Payment d'un tiers.
      await payments.verifyEntry(txHash, userId, competition);
      const equity = competitionEquity(request.params.id)(userId);
      deps.competition.join(request.params.id, {
        userId,
        walletAddress: userId,
        paymentTxHash: txHash.toUpperCase(),
        entryEquity: equity,
      });
      return { competitionId: request.params.id, userId, txHash: txHash.toUpperCase() };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/competitions/:id/participants",
    (request) => deps.competition.participants(request.params.id),
  );

  if (deps.sign !== undefined) {
    registerSignRoutes(app, deps.sign);
  }
  if (deps.exec !== undefined) {
    registerExecRoutes(app, deps.getPrices, deps.exec, deps.sign?.api);
  }
  if (deps.metrics !== undefined) {
    const { store, sourceTag } = deps.metrics;
    app.get("/metrics", () => store.metrics(sourceTag));
  }

  // Agents & mandats : surfaces agent-on-chain (Task 5). Montés uniquement si
  // les services correspondants sont câblés (idem /metrics, /sign, /exec).
  if (deps.agentService !== undefined) {
    const svc = deps.agentService;
    app.post("/api/agents", async (request, reply) => {
      const body = parseCreateAgent(request.body);
      const agent = await svc.create(body);
      reply.code(201);
      return agent;
    });

    app.get<{ Querystring: { userId?: string } }>(
      "/api/agents",
      async (request, reply) => {
        const userId = request.query.userId;
        if (userId === undefined || userId.trim() === "") {
          reply.code(400);
          return { error: "userId required" };
        }
        return svc.listByUser(userId);
      },
    );

    app.get<{ Params: { id: string } }>("/api/agents/:id", async (request, reply) => {
      const agent = await svc.get(request.params.id);
      if (agent === null) {
        reply.code(404);
        return { error: "not found" };
      }
      return agent;
    });

    app.post<{ Params: { id: string } }>(
      "/api/agents/:id/kill",
      async (request) => svc.kill(request.params.id),
    );

    // Mise à jour partielle (name/type/status). Le service filtre les champs
    // sensibles (id, userId, hasLiveAccount, createdAt/updatedAt).
    app.patch<{ Params: { id: string } }>(
      "/api/agents/:id",
      async (request) => {
        const patch = parseUpdateAgent(request.body);
        return svc.update(request.params.id, patch);
      },
    );

    // Suppression de l'agent (idempotent côté store : no-op si absent).
    app.delete<{ Params: { id: string } }>(
      "/api/agents/:id",
      async (request) => {
        await svc.delete(request.params.id);
        return { deleted: true };
      },
    );

    // Flux SSE des événements agent (`agent_killed`, `agent_action`, etc.).
    // Auto-gardé (route publique côté garde global) : EventSource ne pose pas de
    // header → le token passe en query (`?token=`). Sans token valide (auth
    // câblée) → 401 ; sinon on ne relaie QUE les events des agents du viewer
    // (F3 : plus de fuite cross-user). Header `text/event-stream`, hijack, ping
    // 30 s (les proxies coupent au-delà de ~60 s d'inactivité).
    app.get<{ Querystring: { token?: string } }>("/api/agents/events", (request, reply) => {
      const bearer =
        request.headers.authorization ??
        (request.query.token !== undefined ? `Bearer ${request.query.token}` : undefined);
      const me = deps.auth === undefined ? null : deps.auth.service.verifyToken(bearer);
      if (deps.auth !== undefined && me === null) {
        return reply.code(401).send({ error: "authentification requise" });
      }
      const relayable = makeEventFilter(me, deps.auth?.resolvers);

      startEventStream(request, reply);

      const handler = (event: AgentEvent): void => {
        void relayable(event).then((ok) => {
          if (ok) {
            reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        });
      };
      agentBroadcaster.on("event", handler);

      // Keep-alive : commentaire SSE (`:`) — les navigateurs l'ignorent mais
      // ça empêche les proxies de couper la connexion sur inactivité.
      const interval = setInterval(() => reply.raw.write(": ping\n\n"), 30_000);

      // Le client a fermé la connexion : on libère le listener et le timer
      // sinon l'EventEmitter accumule des handlers et le process ne sort pas.
      request.raw.on("close", () => {
        clearInterval(interval);
        agentBroadcaster.off("event", handler);
      });
    });
  }

  if (deps.agentService !== undefined && deps.mandateService !== undefined) {
    const mandateSvc = deps.mandateService;
    app.post("/api/mandates", async (request, reply) => {
      const body = parseCreateMandate(request.body);
      const mandate = await mandateSvc.create(body);
      reply.code(201);
      return mandate;
    });

    // Liste les mandats d'un agent (tous statuts). `agentId` requis.
    app.get<{ Querystring: { agentId?: string } }>(
      "/api/mandates",
      async (request, reply) => {
        const agentId = request.query.agentId;
        if (agentId === undefined || agentId.trim() === "") {
          reply.code(400);
          return { error: "agentId required" };
        }
        return mandateSvc.listByAgent(agentId);
      },
    );

    app.post("/api/sign/mandate-callback", async (request) => {
      const body = parseSignMandateCallback(request.body);
      return mandateSvc.onSignCallback(body);
    });
  }

  // Historique d'actions d'un agent (lecture-seule, alimenté par le MCP).
  // `agentId` requis ; optionnellement `limit` borné à [1, 200] (défaut 100).
  if (deps.agentActionsStore !== undefined) {
    const actionsStore = deps.agentActionsStore;
    app.get<{ Querystring: { agentId?: string; limit?: string } }>(
      "/api/agent-actions",
      async (request, reply) => {
        const agentId = request.query.agentId;
        if (agentId === undefined || agentId.trim() === "") {
          reply.code(400);
          return { error: "agentId required" };
        }
        const rawLimit = request.query.limit;
        const limit =
          rawLimit === undefined || rawLimit.trim() === ""
            ? 100
            : Math.trunc(Number(rawLimit));
        if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
          reply.code(400);
          return { error: "limit must be an integer in [1, 200]" };
        }
        return actionsStore.listByAgent(agentId, limit);
      },
    );

    // POST /api/agent-actions — enregistre une action agent (le MCP server
    // écrit ici quand un outil s'exécute). Idempotence : si `idempotencyKey` est
    // fourni ET qu'une action existe déjà pour `(userId, idempotencyKey)`, on
    // renvoie l'action existante (200) au lieu d'insérer (201). L'id + executedAt
    // sont générés par le store si absents du body.
    app.post("/api/agent-actions", async (request, reply) => {
      const body = (request.body ?? {}) as {
        agentId?: string;
        userId?: string;
        toolName?: string;
        toolParams?: string;
        result?: string | null;
        error?: string | null;
        idempotencyKey?: string | null;
      };
      if (
        typeof body.agentId !== "string" ||
        typeof body.userId !== "string" ||
        typeof body.toolName !== "string" ||
        typeof body.toolParams !== "string"
      ) {
        reply.code(400);
        return { error: "agentId, userId, toolName, toolParams are required" };
      }
      const action = {
        id: crypto.randomUUID(),
        agentId: body.agentId,
        userId: body.userId,
        toolName: body.toolName,
        toolParams: body.toolParams,
        result: body.result ?? null,
        error: body.error ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
        executedAt: Date.now(),
      };
      await actionsStore.record(action);
      reply.code(201);
      return action;
    });

    // GET /api/agent-actions/idempotency?userId=...&key=... — vérifie si une
    // action avec cette clé d'idempotence existe déjà (pour retry côté MCP).
    app.get<{ Querystring: { userId?: string; key?: string } }>(
      "/api/agent-actions/idempotency",
      async (request, reply) => {
        const userId = request.query.userId;
        const key = request.query.key;
        if (!userId || !key) {
          reply.code(400);
          return { error: "userId and key required" };
        }
        const found = await actionsStore.findByIdempotencyKey(userId, key);
        if (found === null) {
          reply.code(404);
          return { error: "not found" };
        }
        return found;
      },
    );

    // GET /api/agent-actions/count-today?agentId=...&userId=... — compteur
    // journalier pour le guard `enforceRiskLimits` côté MCP (maxTradesPerDay).
    app.get<{ Querystring: { agentId?: string; userId?: string } }>(
      "/api/agent-actions/count-today",
      async (request, reply) => {
        const agentId = request.query.agentId;
        const userId = request.query.userId;
        if (!agentId || !userId) {
          reply.code(400);
          return { error: "agentId and userId required" };
        }
        const count = await actionsStore.countToday(agentId, userId);
        return { count };
      },
    );
  }

  // Provision / révocation du compte XRPL Live d'un agent (Tâche 21).
  // v1 : seul `generate()` (création d'un wallet) est implémenté côté service ;
  // un `seed` dans le body (import d'un wallet existant) renvoie 501.
  // `revoke` est idempotent côté service (no-op si pas de clé / agent inconnu).
  if (deps.agentXrplAccountService !== undefined) {
    const live = deps.agentXrplAccountService;
    app.post<{ Params: { id: string } }>(
      "/api/agents/:id/live-account",
      async (request, reply) => {
        const body = parseProvisionLiveAccount(request.body);
        if (body.seed !== undefined) {
          return reply
            .code(501)
            .send({ error: "Seed import not implemented in v1" });
        }
        return live.generate(request.params.id);
      },
    );

    app.delete<{ Params: { id: string } }>(
      "/api/agents/:id/live-account",
      async (request) => {
        await live.revoke(request.params.id);
        return { revoked: true };
      },
    );
  }

  // Chat agent (Tâche 27) — flux SSE piloté par `AgentChatService.stream(...)`.
  // Le front envoie `{ agentId, userId, mandate, message, history? }` ; le
  // serveur relaie chaque événement (`text_delta` / `tool_result` / `error`
  // / `done`) au front via SSE.
  // L'accès `/api/agent-chat/stream` est monté uniquement si le service est
  // branché (TIDE_LLM_API_KEY configuré ⇒ clé présente ⇒ service instancié
  // au boot).
  if (deps.agentChatService !== undefined) {
    const chat = deps.agentChatService;
    app.post<{
      Body: {
        agentId?: string;
        userId?: string;
        mandate?: unknown;
        message?: string;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
        systemPrompt?: string;
      };
    }>("/api/agent-chat/stream", async (request, reply) => {
      const body = request.body ?? {};
      const agentId = typeof body.agentId === "string" ? body.agentId : "";
      const userId = typeof body.userId === "string" ? body.userId : "";
      const message = typeof body.message === "string" ? body.message : "";
      if (agentId === "" || userId === "" || message === "") {
        reply.code(400);
        return { error: "agentId, userId, message are required" };
      }
      // Contexte d'exécution des outils : la fabrique runtime (`main.ts`)
      // branche les vrais backends (self-HTTP + stores locaux) et valide
      // l'agent + le mandat actif — elle lève si l'agent est stoppé ou sans
      // mandat, on renvoie alors 400 AVANT d'ouvrir le flux SSE. Sans fabrique
      // (pas de câblage), on retombe sur le stub throw-loud : un LLM qui
      // appelle `place_order` ne voit JAMAIS un faux succès.
      let ctx: McpContext;
      try {
        ctx = deps.agentChatCtx
          ? await deps.agentChatCtx(agentId, userId)
          : buildAgentChatCtx(agentId, userId);
      } catch (err) {
        reply.code(400);
        return { error: err instanceof Error ? err.message : "context build failed" };
      }
      startEventStream(request, reply);
      try {
        for await (const event of chat.stream({
          agentId,
          userId,
          mandate: (body.mandate ?? null) as McpContext["mandate"],
          history: body.history,
          message,
          ...(body.systemPrompt !== undefined
            ? { systemPrompt: body.systemPrompt }
            : {}),
          ctx,
        })) {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } finally {
        reply.raw.end();
      }
    });
  }

  // Métadonnées NFT des badges (statique, non gated) : résolues par les wallets.
  app.get<{ Params: { code: string } }>("/nft-metadata/:code", (request, reply) => {
    const badge = badgeByCode(request.params.code);
    if (badge === undefined) {
      reply.code(404);
      return { error: "unknown badge" };
    }
    // F8 : l'URL de l'image vient de la base publique configurée (jamais du header
    // Host, contrôlable par l'appelant → injection dans les métadonnées NFT).
    const base = deps.publicBaseUrl ?? DEFAULT_PUBLIC_BASE_URL;
    return {
      name: badge.title,
      description: badge.description,
      image:
        badge.code === "first_trade" && deps.firstTradeImageUri !== undefined
          ? deps.firstTradeImageUri
          : `${base}${badge.imageUrl}`,
      attributes: [{ trait_type: "badge", value: badge.code }],
    };
  });

  app.get<{ Params: { week: string } }>("/nft-metadata/weekly/:week", (request) => {
    const week = parseWeeklyRewardWeek(request.params.week);
    const base = deps.publicBaseUrl ?? DEFAULT_PUBLIC_BASE_URL;
    return {
      name: `Tide Weekly Trade Proof · ${week}`,
      description: "One verified week with at least one Paper trade on Tide.",
      image: `${base}/badges/weekly_trade.svg`,
      attributes: [
        { trait_type: "programme", value: "weekly_trade_proof" },
        { trait_type: "week", value: week },
      ],
    };
  });

  app.get("/badges/weekly_trade.svg", (_request, reply) => {
    reply.type("image/svg+xml");
    return WEEKLY_TRADE_SVG;
  });
  app.get("/badges/first_trade.svg", (_request, reply) => {
    reply.type("image/svg+xml");
    return FIRST_TRADE_SVG;
  });
  app.get("/badges/ten_trades.svg", (_request, reply) => {
    reply.type("image/svg+xml");
    return TEN_TRADES_SVG;
  });
  app.get("/badges/first_competition.svg", (_request, reply) => {
    reply.type("image/svg+xml");
    return FIRST_COMPETITION_SVG;
  });

  // Badges + claim NFT — montés seulement si un issuer NFT est configuré.
  if (deps.badgeService !== undefined) {
    const badgeSvc = deps.badgeService;
    app.get<{ Params: { userId: string } }>(
      "/accounts/:userId/badges",
      (request) => badgeSvc.statusFor(request.params.userId),
    );
    app.post<{ Params: { code: string } }>("/badges/:code/claim", (request) => {
      const body = parseClaimBadge(request.body);
      return badgeSvc.claim(body.userId, body.walletAddress, request.params.code);
    });
    app.post<{ Params: { code: string } }>(
      "/badges/:code/claim/confirm",
      async (request, reply) => {
        const body = parseConfirmBadge(request.body);
        await badgeSvc.confirmClaim(body.userId, request.params.code, body.txHash);
        reply.code(200);
        return { ok: true };
      },
    );
  }

  // La liste existe aussi programme OFF (tableau vide) : le front ne dépend pas
  // de la configuration Mainnet. Le claim, lui, échoue explicitement en 503.
  app.get<{ Params: { userId: string } }>(
    "/accounts/:userId/weekly-rewards",
    (request) => deps.weeklyRewards?.list(request.params.userId) ?? [],
  );
  app.get<{ Params: { userId: string } }>(
    "/accounts/:userId/paper-wallet",
    (request) =>
      deps.firstTradeRewards?.status(request.params.userId) ?? {
        walletAddress: null,
        walletStatus: "not_created",
        fundingTxHash: null,
        rewardStatus: "not_earned",
        nftTokenId: null,
        claimTxHash: null,
      },
  );
  app.post<{ Params: { week: string } }>(
    "/weekly-rewards/:week/claim",
    async (request) => {
      const { userId } = parseUserId(request.body, "claimWeeklyReward");
      const rewards = deps.weeklyRewards;
      if (rewards === undefined) throw new WeeklyRewardUnavailableError();
      return rewards.claim(userId, parseWeeklyRewardWeek(request.params.week));
    },
  );

  // Console opérateur locale : montée uniquement si un token est configuré
  // (TIDE_ADMIN_TOKEN). Absente → 404, rien n'est exposé en prod par défaut.
  if (deps.admin !== undefined) {
    const admin = deps.admin;
    app.get("/admin/overview", async (request, reply) => {
      if (!hasAdminToken(request, admin.token)) {
        reply.code(401);
        return { error: "unauthorized" };
      }
      return admin.service.overview(deps.getPrices());
    });
    app.post("/admin/competitions", (request, reply) => {
      if (!hasAdminToken(request, admin.token)) {
        reply.code(401);
        return { error: "unauthorized" };
      }
      const competition = parseCompetition(request.body);
      deps.competition.create(competition);
      reply.code(201);
      return { id: competition.id.trim() };
    });
    app.post<{ Params: { id: string } }>(
      "/admin/competitions/:id/close",
      (request, reply) => {
        if (!hasAdminToken(request, admin.token)) {
          reply.code(401);
          return { error: "unauthorized" };
        }
        const result = deps.competition.isClosed(request.params.id)
          ? deps.competition.settlement(request.params.id)
          : deps.competition.close(
              request.params.id,
              competitionEquity(request.params.id),
            );
        const payments = deps.competitionPayments;
        const payoutTx =
          payments !== undefined && result.winner !== null && result.pot > 0
            ? payments.winnerPayout(
                request.params.id,
                result.winner.walletAddress,
                result.pot,
              )
            : null;
        // Le compte pool est multisig : on prépare la transaction exacte, mais
        // le quorum opérateur doit encore la signer avant soumission.
        return { ...result, payoutTx };
      },
    );
    if (admin.testnetE2E !== undefined) {
      const testnetE2E = admin.testnetE2E;
      app.post("/admin/testnet-e2e/run", async (request, reply) => {
        if (!hasAdminToken(request, admin.token)) {
          reply.code(401);
          return { error: "unauthorized" };
        }
        return testnetE2E.run();
      });
    }
    app.get("/admin/wallet-ops/status", (request, reply) => {
      if (!hasAdminToken(request, admin.token)) {
        reply.code(401);
        return { error: "unauthorized" };
      }
      return admin.walletAdmin?.status() ?? {
        enabled: false,
        id: null,
        state: "idle",
        total: 0,
        completed: 0,
        failed: 0,
        destination: null,
        startedAt: null,
        finishedAt: null,
        results: [],
      };
    });
    if (admin.walletAdmin !== undefined) {
      const walletAdmin = admin.walletAdmin;
      app.post("/admin/wallets/provision", async (request, reply) => {
        if (!hasAdminToken(request, admin.token)) {
          reply.code(401);
          return { error: "unauthorized" };
        }
        try {
          const result = await walletAdmin.provision(readNumberField(request.body, "count"));
          reply.code(201);
          return result;
        } catch (error) {
          reply.code(409);
          return { error: error instanceof Error ? error.message : "provisioning refusé" };
        }
      });
      app.post<{ Params: { userId: string } }>(
        "/admin/wallets/:userId/nfts",
        async (request, reply) => {
          if (!hasAdminToken(request, admin.token)) {
            reply.code(401);
            return { error: "unauthorized" };
          }
          const badgeCode = readStringField(request.body, "badgeCode");
          try {
            return await walletAdmin.grantBadge(request.params.userId, badgeCode);
          } catch (error) {
            reply.code(409);
            return { error: error instanceof Error ? error.message : "distribution NFT refusée" };
          }
        },
      );
      app.post<{ Params: { userId: string } }>(
        "/admin/wallets/:userId/reclaim",
        async (request, reply) => {
          if (!hasAdminToken(request, admin.token)) {
            reply.code(401);
            return { error: "unauthorized" };
          }
          try {
            const status = await walletAdmin.startReclaimOne(
              request.params.userId,
              readStringField(request.body, "confirmation"),
            );
            reply.code(202);
            return status;
          } catch (error) {
            reply.code(409);
            return { error: error instanceof Error ? error.message : "récupération refusée" };
          }
        },
      );
      app.post("/admin/wallets/reclaim-all", async (request, reply) => {
        if (!hasAdminToken(request, admin.token)) {
          reply.code(401);
          return { error: "unauthorized" };
        }
        try {
          const status = await walletAdmin.startReclaimAll(
            readStringField(request.body, "confirmation"),
          );
          reply.code(202);
          return status;
        } catch (error) {
          reply.code(409);
          return { error: error instanceof Error ? error.message : "récupération globale refusée" };
        }
      });
    }
  }

  return app;
}

function hasAdminToken(request: FastifyRequest, expected: string): boolean {
  const provided = request.headers["x-admin-token"];
  if (typeof provided !== "string") return false;
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function readStringField(body: unknown, field: string): string {
  if (typeof body !== "object" || body === null) return "";
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

function readNumberField(body: unknown, field: string): number {
  if (typeof body !== "object" || body === null) return Number.NaN;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "number" ? value : Number.NaN;
}

/** Extrait `address` d'un corps `{address}` (chaîne, sinon vide → rejet en aval). */
function readAddressField(body: unknown): string {
  const rec = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  return typeof rec.address === "string" ? rec.address : "";
}

/**
 * Authentification : garde global (autorisation par route) + routes `/auth/*`.
 * Le garde s'exécute en `preHandler` (après parsing du body → params/query/body
 * disponibles) : route publique OU token JWT valide + règles de propriété. Les
 * routes `/auth/challenge` et `/auth/verify` sont publiques (handshake de login).
 */
function registerAuth(
  app: FastifyInstance,
  auth: { service: AuthService; resolvers: AuthzResolvers },
): void {
  const { service, resolvers } = auth;

  app.addHook("preHandler", async (request, reply) => {
    const decision = await authorize(
      {
        method: request.method,
        routeUrl: request.routeOptions.url ?? "",
        params: request.params as Record<string, string | undefined>,
        query: (request.query ?? {}) as Record<string, unknown>,
        body: request.body,
        tokenAddress: service.verifyToken(request.headers.authorization),
      },
      resolvers,
    );
    if (!decision.ok) {
      return reply.code(decision.status).send({ error: decision.error });
    }
  });

  // Challenge GemWallet : nonce + message à signer. Adresse invalide → 400.
  app.post("/auth/challenge", (request, reply) => {
    try {
      return service.issueChallenge(readAddressField(request.body));
    } catch (err) {
      reply.code(400);
      return { error: err instanceof Error ? err.message : "adresse invalide" };
    }
  });

  // Session Paper anonyme : identité aléatoire + JWT générés côté serveur.
  // Aucun wallet utilisateur n'est requis, mais toutes les routes comptes
  // restent protégées par le même garde de propriété que les comptes Live.
  app.post("/auth/paper", () => service.issuePaperSession());

  // Rotation transparente du JWT Paper : accepte un ancien JWT signe (meme
  // expire) et conserve son `sub`, donc le meme compte apres un refresh navigateur.
  app.post("/auth/paper/refresh", (request, reply) => {
    try {
      return service.refreshPaperSession(request.headers.authorization);
    } catch (err) {
      reply.code(401);
      return { error: err instanceof Error ? err.message : "session Paper invalide" };
    }
  });

  // Vérifie une preuve (Gem ou Xaman) et délivre un JWT de session.
  app.post("/auth/verify", async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (body.wallet === "gem") {
      try {
        const address = service.verifyGem({
          address: typeof body.address === "string" ? body.address : "",
          nonce: typeof body.nonce === "string" ? body.nonce : "",
          signature: typeof body.signature === "string" ? body.signature : "",
          publicKey: typeof body.publicKey === "string" ? body.publicKey : "",
        });
        return { token: service.issueToken(address), address };
      } catch (err) {
        reply.code(401);
        return { error: err instanceof Error ? err.message : "authentification échouée" };
      }
    }
    if (body.wallet === "xaman") {
      try {
        const address = await service.verifyXaman(typeof body.uuid === "string" ? body.uuid : "");
        return { token: service.issueToken(address), address };
      } catch (err) {
        if (err instanceof XamanNotConfiguredError) {
          reply.code(501);
          return { error: err.message };
        }
        reply.code(401);
        return { error: err instanceof Error ? err.message : "authentification échouée" };
      }
    }
    reply.code(400);
    return { error: "wallet invalide (attendu: gem | xaman)" };
  });
}

/**
 * Routes de connexion/signature non-custodiale partagées. Les tickets de
 * compétition sont montés près des routes compétition afin que leur montant
 * soit toujours dérivé de la définition persistée.
 */
function registerSignRoutes(app: FastifyInstance, sign: SignDeps): void {
  const { api } = sign;

  // Connexion de wallet (SignIn) : renvoie un payload à signer ; l'adresse est
  // récupérée ensuite via /sign/status/:uuid une fois l'utilisateur résolu.
  app.post("/sign/connect", async (_request, reply) => {
    const signRequest = await createConnectSignRequest(api);
    reply.code(201);
    return signRequest;
  });

  // Suivi d'un payload (connexion OU swap) : résolu/signé + adresse + txid.
  app.get<{ Params: { uuid: string } }>("/sign/status/:uuid", (request) =>
    getPayloadStatus(api, request.params.uuid),
  );
}

/**
 * Routes du moteur d'exécution Live. À partir d'une intention (base/side/quantité/
 * slippage), le serveur calcule l'`OfferCreate` borné (best execution + slippage),
 * en injectant `sourceTag` et issuer du quote. Deux usages :
 * - `/exec/plan` : renvoie le plan (offer + prix) — signé côté extension (GemWallet).
 * - `/sign/live-offer` : crée le payload Xaman du plan (présent ⇔ Xaman configuré).
 */
function registerExecRoutes(
  app: FastifyInstance,
  getPrices: () => PriceMap,
  exec: ExecDeps,
  xamanApi: XamanPayloadApi | undefined,
): void {
  const planFor = (body: unknown) =>
    planLiveOffer(
      {
        getPrices,
        sourceTag: exec.sourceTag,
        quote: exec.quote,
        ...(exec.onchain !== undefined ? { onchain: exec.onchain } : {}),
      },
      parseLiveOfferRequest(body),
    );

  app.post("/exec/plan", async (request, reply) => {
    const plan = await planFor(request.body);
    reply.code(201);
    return plan;
  });

  if (xamanApi !== undefined) {
    app.post("/sign/live-offer", async (request, reply) => {
      const plan = await planFor(request.body);
      const signRequest = await createSignRequest(xamanApi, plan.offer);
      reply.code(201);
      return signRequest;
    });
  }
}
