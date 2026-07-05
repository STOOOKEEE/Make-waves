import Fastify from "fastify";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import type { PriceMap } from "@tide/core";
import type { BookDepth } from "../feed/binance-book-feed";
import type { AttributionMetrics } from "@tide/xrpl";
import type { Candle } from "../feed/klines";
import type { MarketRow } from "../feed/coingecko-markets";
import type { PaperService } from "../services/paper-service";
import type { CompetitionService } from "../services/competition-service";
import type { AgentService } from "../services/agent-service";
import type { MandateService } from "../services/mandate-service";
import type { XamanPayloadApi } from "../xaman/sign-request";
import {
  createBuyInSignRequest,
  createConnectSignRequest,
  createSignRequest,
  getPayloadStatus,
} from "../xaman/sign-request";
import { planLiveOffer } from "../exec/plan-live";
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
  parseSignMandateCallback,
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

  // Liste des marchés (top N coins : symbole, nom, prix, %24h) pour la watchlist.
  if (deps.getMarkets !== undefined) {
    const getMarkets = deps.getMarkets;
    app.get("/markets", () => getMarkets());
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
  }

  if (deps.agentService !== undefined && deps.mandateService !== undefined) {
    const mandateSvc = deps.mandateService;
    app.post("/api/mandates", async (request, reply) => {
      const body = parseCreateMandate(request.body);
      const mandate = await mandateSvc.create(body);
      reply.code(201);
      return mandate;
    });

    app.post("/api/sign/mandate-callback", async (request) => {
      const body = parseSignMandateCallback(request.body);
      return mandateSvc.onSignCallback(body);
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
      { getPrices, sourceTag: exec.sourceTag, quote: exec.quote },
      parseLiveOfferRequest(body),
    );

  app.post("/exec/plan", (request, reply) => {
    const plan = planFor(request.body);
    reply.code(201);
    return plan;
  });

  if (xamanApi !== undefined) {
    app.post("/sign/live-offer", async (request, reply) => {
      const plan = planFor(request.body);
      const signRequest = await createSignRequest(xamanApi, plan.offer);
      reply.code(201);
      return signRequest;
    });
  }
}
