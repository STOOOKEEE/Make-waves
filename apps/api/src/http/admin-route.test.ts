import { describe, expect, it, vi } from "vitest";
import { buildAdminServer as buildPrivateAdminServer, buildServer } from "./server";
import { AdminService } from "../services/admin-service";
import { PaperService } from "../services/paper-service";
import { CompetitionService } from "../services/competition-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryAgentStore } from "../store/agent-store";
import { InMemoryMandateStore } from "../store/mandate-store";
import { InMemoryAgentActionsStore } from "../store/agent-actions-store";
import { InMemoryCompetitionStore } from "../store/competition-store";
import { arenaSimulationUserId } from "../simulation/arena-ids";
import type { PaperWalletAdminService } from "../services/paper-wallet-admin-service";
import type { CompetitionDefinition } from "../store/competition-store";
import { AuthService } from "../auth/auth-service";
import { InMemoryChallengeStore } from "../auth/challenge-store";

const ADMIN_TOKEN = "secret";

function buildAdminServer(walletAdmin?: PaperWalletAdminService) {
  const accounts = new InMemoryAccountStore();
  const paper = new PaperService(undefined, accounts);
  paper.openAccount("visitor");
  paper.openAccount(arenaSimulationUserId(0));
  const service = new AdminService({
    paper,
    agents: new InMemoryAgentStore(),
    mandates: new InMemoryMandateStore(),
    actions: new InMemoryAgentActionsStore(),
    prizePoolAddress: null,
    operatorUserIds: new Set<string>(),
  });
  return buildServer({
    paper,
    competition: new CompetitionService(new InMemoryCompetitionStore()),
    getPrices: () => ({ XRP: 0.5 }),
    admin: { token: ADMIN_TOKEN, service, ...(walletAdmin === undefined ? {} : { walletAdmin }) },
  });
}

describe("GET /admin/overview", () => {
  it("monte uniquement les routes opérateur sur le serveur privé", async () => {
    const paper = new PaperService(undefined, new InMemoryAccountStore());
    paper.openAccount("visitor");
    const service = new AdminService({
      paper,
      agents: new InMemoryAgentStore(),
      mandates: new InMemoryMandateStore(),
      actions: new InMemoryAgentActionsStore(),
      prizePoolAddress: null,
      operatorUserIds: new Set<string>(),
    });
    const app = buildPrivateAdminServer({
      paper,
      competition: new CompetitionService(new InMemoryCompetitionStore()),
      getPrices: () => ({ XRP: 0.5 }),
      admin: { token: ADMIN_TOKEN, service },
      corsOrigin: "http://127.0.0.1:5173",
    });

    const overview = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    const publicRoute = await app.inject({ method: "GET", url: "/leaderboard" });

    expect(overview.statusCode).toBe(200);
    expect(publicRoute.statusCode).toBe(404);
    await app.close();
  });

  it("401 sans token", async () => {
    const app = buildAdminServer();
    const res = await app.inject({ method: "GET", url: "/admin/overview" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("401 avec mauvais token", async () => {
    const app = buildAdminServer();
    const res = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { "x-admin-token": "wrong" },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("200 + payload avec le bon token", async () => {
    const app = buildAdminServer();
    const res = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totals.users).toBe(1);
    expect(body.users[0].segment).toBe("frontend");
    expect(body.simulation.enabled).toBe(false);
    await app.close();
  });

  it("exclut les profils de simulation du leaderboard public", async () => {
    const app = buildAdminServer();
    const res = await app.inject({ method: "GET", url: "/leaderboard" });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((entry: { userId: string }) => entry.userId)).toEqual(["visitor"]);
    await app.close();
  });

  it("404 si la console n'est pas montée (deps.admin absent)", async () => {
    const app = buildServer({
      paper: new PaperService(undefined, new InMemoryAccountStore()),
      competition: new CompetitionService(new InMemoryCompetitionStore()),
      getPrices: () => ({ XRP: 0.5 }),
    });
    const res = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("conserve le 404 public avec le garde JWT de production", async () => {
    const app = buildServer({
      paper: new PaperService(undefined, new InMemoryAccountStore()),
      competition: new CompetitionService(new InMemoryCompetitionStore()),
      getPrices: () => ({ XRP: 0.5 }),
      auth: {
        service: new AuthService({
          secret: "test-session-secret-long-enough",
          ttlSeconds: 3600,
          challenges: new InMemoryChallengeStore(60_000),
        }),
        resolvers: {
          agentOwner: async () => null,
          mandateOwner: async () => null,
        },
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });

    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe("admin wallet operations", () => {
  it("provisionne un lot Mainnet uniquement avec le token admin", async () => {
    const provision = vi.fn(async (count: number) => ({
      network: "mainnet" as const,
      requested: count,
      funded: count,
      wallets: [],
    }));
    const walletAdmin = {
      status: vi.fn(),
      provision,
      grantBadge: vi.fn(),
      startReclaimOne: vi.fn(),
      startReclaimAll: vi.fn(),
    } as unknown as PaperWalletAdminService;
    const app = buildAdminServer(walletAdmin);

    const unauthorized = await app.inject({
      method: "POST",
      url: "/admin/wallets/provision",
      payload: { count: 2 },
    });
    expect(unauthorized.statusCode).toBe(401);

    const accepted = await app.inject({
      method: "POST",
      url: "/admin/wallets/provision",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: { count: 2 },
    });
    expect(accepted.statusCode).toBe(201);
    expect(accepted.json()).toMatchObject({ network: "mainnet", requested: 2, funded: 2 });
    expect(provision).toHaveBeenCalledWith(2);
    await app.close();
  });

  it("garde la récupération globale par token et confirmation serveur", async () => {
    const startReclaimAll = vi.fn(async () => ({
      enabled: true,
      id: "job-1",
      state: "running" as const,
      total: 2,
      completed: 0,
      failed: 0,
      destination: "rIssuer",
      startedAt: 1,
      finishedAt: null,
      results: [],
    }));
    const walletAdmin = {
      status: vi.fn(),
      grantBadge: vi.fn(),
      startReclaimOne: vi.fn(),
      startReclaimAll,
    } as unknown as PaperWalletAdminService;
    const app = buildAdminServer(walletAdmin);

    const unauthorized = await app.inject({
      method: "POST",
      url: "/admin/wallets/reclaim-all",
      payload: { confirmation: "DELETE ALL MAINNET WALLETS" },
    });
    expect(unauthorized.statusCode).toBe(401);

    const accepted = await app.inject({
      method: "POST",
      url: "/admin/wallets/reclaim-all",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: { confirmation: "DELETE ALL MAINNET WALLETS" },
    });
    expect(accepted.statusCode).toBe(202);
    expect(startReclaimAll).toHaveBeenCalledWith("DELETE ALL MAINNET WALLETS");
    await app.close();
  });
});

describe("admin competition operations", () => {
  const DEFINITION: CompetitionDefinition = {
    id: "real-cup",
    nameEn: "Real cup",
    nameFr: "Coupe réelle",
    descriptionEn: "Verified XRP entries only",
    descriptionFr: "Entrées XRP vérifiées uniquement",
    mode: "paper",
    buyIn: 0.01,
    rakeRatio: 0,
    payoutWeights: [1],
    startsAt: 1_000,
    endsAt: 2_000,
  };

  it("crée seulement avec le token admin et impose winner-takes-all", async () => {
    const app = buildAdminServer();
    const unauthorized = await app.inject({
      method: "POST",
      url: "/admin/competitions",
      payload: DEFINITION,
    });
    expect(unauthorized.statusCode).toBe(401);

    const created = await app.inject({
      method: "POST",
      url: "/admin/competitions",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: { ...DEFINITION, rakeRatio: 0.5, payoutWeights: [0.5, 0.5] },
    });
    expect(created.statusCode).toBe(201);
    const detail = await app.inject({ method: "GET", url: "/competitions/real-cup" });
    expect(detail.json()).toMatchObject({ rakeRatio: 0, payoutWeights: [1], pot: 0 });
    await app.close();
  });

  it("reconstruit le même payout multisig après refresh sans recalculer le gagnant", async () => {
    let now = 1_500;
    const accounts = new InMemoryAccountStore();
    const paper = new PaperService(undefined, accounts);
    paper.openAccount("alice");
    const competition = new CompetitionService(
      new InMemoryCompetitionStore(),
      () => now,
      () => true,
    );
    competition.create(DEFINITION);
    competition.join(DEFINITION.id, {
      userId: "alice",
      walletAddress: "rAlice",
      paymentTxHash: "A".repeat(64),
      entryEquity: 10_000,
    });
    now = 2_001;
    const adminService = new AdminService({
      paper,
      agents: new InMemoryAgentStore(),
      mandates: new InMemoryMandateStore(),
      actions: new InMemoryAgentActionsStore(),
      prizePoolAddress: "rPool",
      operatorUserIds: new Set<string>(),
    });
    const winnerPayout = vi.fn(() => ({
      TransactionType: "Payment" as const,
      Account: "rPool",
      Destination: "rAlice",
      Amount: "10000",
    }));
    const app = buildServer({
      paper,
      competition,
      getPrices: () => ({ XRP: 0.5 }),
      admin: { token: ADMIN_TOKEN, service: adminService },
      competitionPayments: {
        entryPayment: vi.fn(),
        verifyEntry: vi.fn(),
        winnerPayout,
      },
    });
    const close = () => app.inject({
      method: "POST",
      url: "/admin/competitions/real-cup/close",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    const first = await close();
    const second = await close();
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({
      pot: 0.01,
      winner: { userId: "alice", walletAddress: "rAlice" },
      payoutTx: { Destination: "rAlice", Amount: "10000" },
    });
    expect(winnerPayout).toHaveBeenCalledTimes(2);
    await app.close();
  });
});
