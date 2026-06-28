import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { PriceMap } from "@tide/core";
import type { AttributionMetrics } from "@tide/xrpl";
import type { PaperService } from "../services/paper-service";
import type { CompetitionService } from "../services/competition-service";
import type { XamanPayloadApi } from "../xaman/sign-request";
import {
  createBuyInSignRequest,
  createLiveOfferSignRequest,
} from "../xaman/sign-request";
import { statusForError } from "./errors";
import {
  parseBuyInRequest,
  parseCompetition,
  parseLiveOfferRequest,
  parseOrder,
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
  /** Signature Xaman (routes /sign/*) — absente si XUMM non configuré. */
  readonly sign?: SignDeps;
  /** Métriques d'attribution (route /metrics) — absente si indexeur non câblé. */
  readonly metrics?: MetricsDeps;
}

/**
 * Construit le serveur HTTP (Fastify) qui expose les services. Aucune écoute
 * réseau ici : `buildServer` retourne l'instance, testable via `inject()`.
 */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: false });

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

  app.get<{ Params: { userId: string } }>(
    "/accounts/:userId/balances",
    (request) => deps.paper.balancesOf(request.params.userId),
  );

  app.get<{ Params: { userId: string } }>(
    "/accounts/:userId/orders",
    (request) => deps.paper.ordersOf(request.params.userId),
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

  app.get("/leaderboard", () => deps.paper.leaderboard(deps.getPrices()));

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
  if (deps.metrics !== undefined) {
    const { store, sourceTag } = deps.metrics;
    app.get("/metrics", () => store.metrics(sourceTag));
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

  app.post("/sign/live-offer", async (request, reply) => {
    const { account, gives, wants } = parseLiveOfferRequest(request.body);
    const signRequest = await createLiveOfferSignRequest(api, {
      account,
      gives,
      wants,
      sourceTag,
    });
    reply.code(201);
    return signRequest;
  });
}
