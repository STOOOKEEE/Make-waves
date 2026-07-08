import Fastify from "fastify";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import type { PriceMap } from "@tide/core";
import { agentBroadcaster } from "../sse/agent-broadcast";
import type { BookDepth } from "../feed/binance-book-feed";
import type { AttributionMetrics } from "@tide/xrpl";
import type { Candle } from "../feed/klines";
import type { MarketRow } from "../feed/coingecko-markets";
import type { PaperService } from "../services/paper-service";
import type { CompetitionService } from "../services/competition-service";
import type { AgentService } from "../services/agent-service";
import type { MandateService } from "../services/mandate-service";
import type { AgentXrplAccountService } from "../services/agent-xrpl-account-service";
import type { AgentActionsStore } from "../store/agent-actions-store";
import type { XamanPayloadApi } from "../xaman/sign-request";
import type { AgentChatService } from "../services/agent-chat-service";
import type { Agent, McpContext } from "@tide/mcp";
import {
  createBuyInSignRequest,
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
  parseCompetition,
  parseCreateAgent,
  parseCreateMandate,
  parseLiveOfferRequest,
  parseOpenPosition,
  parseOrder,
  parseProvisionLiveAccount,
  parseSignMandateCallback,
  parseUpdateAgent,
  parseUserId,
} from "./parse";

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
 * Construit le serveur HTTP (Fastify) qui expose les services. Aucune écoute
 * réseau ici : `buildServer` retourne l'instance, testable via `inject()`.
 */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: false });

  // CORS : le front (Vite, port distinct) appelle l'API en cross-origin. Sans
  // ça, le navigateur bloque toutes les requêtes. `origin: true` reflète l'origine
  // de l'appelant (suffisant pour la démo ; à restreindre en prod réelle).
  void app.register(cors, { origin: true });

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
    (request, reply) => {
      const order = parseOrder(request.body);
      const fill = deps.paper.placeOrder(request.params.userId, order);
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
    (request, reply) => {
      const input = parseOpenPosition(request.body);
      const position = deps.paper.openPosition(request.params.userId, input);
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

  app.get("/leaderboard", () => deps.paper.leaderboard(deps.getPrices()));

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

  app.post("/competitions", (request, reply) => {
    const competition = parseCompetition(request.body);
    deps.competition.create(competition);
    reply.code(201);
    return { id: competition.id };
  });

  app.post<{ Params: { id: string } }>(
    "/competitions/:id/join",
    (request) => {
      const { userId } = parseUserId(request.body, "join");
      deps.competition.join(request.params.id, userId);
      return { competitionId: request.params.id, userId };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/competitions/:id/participants",
    (request) => deps.competition.participants(request.params.id),
  );

  app.post<{ Params: { id: string } }>(
    "/competitions/:id/close",
    (request) => {
      const prices = deps.getPrices();
      return deps.competition.close(request.params.id, (userId) =>
        deps.paper.equityOf(userId, prices),
      );
    },
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
    // Header `text/event-stream`, hijack pour prendre la main sur la socket,
    // ping commentaire toutes les 30 s pour garder la connexion ouverte
    // (les proxies coupent au-delà de ~60 s d'inactivité).
    app.get("/api/agents/events", (_req, reply) => {
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.hijack();

      const send = (event: unknown) => {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };
      const handler = (event: unknown) => send(event);
      agentBroadcaster.on("event", handler);

      // Keep-alive : commentaire SSE (`:`) — les navigateurs l'ignorent mais
      // ça empêche les proxies de couper la connexion sur inactivité.
      const interval = setInterval(() => reply.raw.write(": ping\n\n"), 30_000);

      // Le client a fermé la connexion : on libère le listener et le timer
      // sinon l'EventEmitter accumule des handlers et le process ne sort pas.
      _req.raw.on("close", () => {
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
      // Le câblage runtime complet (paper/trading/perp/competitions réel) n'est
      // pas encore branché — chaque méthode du `ctx` throw loud si un outil
      // est appelé. C'est volontaire : un LLM qui appelle `place_order` ne
      // doit JAMAIS voir un `{ orderId: "stub" }` (silently swallowed success).
      // Lève `agent chat not wired — runtime ctx missing` côté tool, que
      // `AgentChatService.executeTool` capture en `{ isError: true, message }`
      // et remonte à Claude comme `tool_result is_error=true` → l'agent peut
      // s'auto-corriger (« run-time pas câblé »), l'utilisateur voit une
      // erreur honnête au lieu d'un faux succès.
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.hijack();
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
          ctx: buildAgentChatCtx(agentId, userId),
        })) {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } finally {
        reply.raw.end();
      }
    });
  }

  return app;
}

/**
 * Routes de signature non-custodiale. Le corps client ne porte que ses propres
 * paramètres (compte, montants) ; le serveur injecte le `sourceTag` et la
 * destination du prize pool. Une entrée malformée lève `BadRequestError` (400)
 * avant tout appel réseau ; un refus de Xaman lève `XamanError` (502).
 */
function registerSignRoutes(app: FastifyInstance, sign: SignDeps): void {
  const { api, sourceTag, prizePoolAddress } = sign;

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

  app.post("/sign/buy-in", async (request, reply) => {
    const { account, amount, competitionId } = parseBuyInRequest(request.body);
    const signRequest = await createBuyInSignRequest(api, {
      account,
      destination: prizePoolAddress,
      amount,
      sourceTag,
      competitionId,
    });
    reply.code(201);
    return signRequest;
  });
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
