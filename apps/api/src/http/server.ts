import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { PriceMap } from "@tide/core";
import type { PaperService } from "../services/paper-service";
import type { CompetitionService } from "../services/competition-service";
import { statusForError } from "./errors";
import { parseCompetition, parseOrder, parseUserId } from "./parse";

/** Dépendances injectées (testable : on passe des fakes en test). */
export interface ServerDeps {
  readonly paper: PaperService;
  readonly competition: CompetitionService;
  /** Carte de prix courante (sera câblée au feed de prix off-chain). */
  readonly getPrices: () => PriceMap;
}

/**
 * Construit le serveur HTTP (Fastify) qui expose les services. Aucune écoute
 * réseau ici : `buildServer` retourne l'instance, testable via `inject()`.
 */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    const status = statusForError(error);
    // On ne fuit jamais le détail d'une erreur interne (500).
    const message =
      status === 500
        ? "Erreur interne"
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

  return app;
}
