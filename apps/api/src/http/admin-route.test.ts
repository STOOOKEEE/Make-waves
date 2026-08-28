import { describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAdminServer as buildPrivateAdminServer, buildServer } from "./server";
import { AdminService } from "../services/admin-service";
import { PaperService } from "../services/paper-service";
import { CompetitionService } from "../services/competition-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryAgentStore } from "../store/agent-store";
import { InMemoryMandateStore } from "../store/mandate-store";
import { InMemoryAgentActionsStore } from "../store/agent-actions-store";
import { InMemoryCompetitionStore } from "../store/competition-store";
import type { PaperWalletAdminService } from "../services/paper-wallet-admin-service";
import type { PortfolioManagerService } from "../services/portfolio-manager-service";
import type { ManagedExternalWalletService } from "../services/managed-external-wallet-service";
import type { CompetitionDefinition } from "../store/competition-store";
import { AuthService } from "../auth/auth-service";
import { InMemoryChallengeStore } from "../auth/challenge-store";

const ADMIN_TOKEN = "secret";

function buildAdminServer(walletAdmin?: PaperWalletAdminService) {
  const accounts = new InMemoryAccountStore();
  const paper = new PaperService(undefined, accounts);
  paper.openAccount("visitor");
  paper.openAccount("sim:arena:001");
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
  it("sert le build admin sur le port privé sans exposer les routes produit", async () => {
    const uiDir = await mkdtemp(join(tmpdir(), "tide-admin-ui-"));
    await mkdir(join(uiDir, "assets"));
    await writeFile(join(uiDir, "index.html"), "<!doctype html><title>Tide Admin</title>");
    await writeFile(join(uiDir, "assets", "admin.js"), "export const ready = true;");

    const paper = new PaperService(undefined, new InMemoryAccountStore());
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
      adminUiDir: uiDir,
    });

    try {
      const page = await app.inject({ method: "GET", url: "/" });
      const asset = await app.inject({ method: "GET", url: "/assets/admin.js" });
      const productRoute = await app.inject({ method: "GET", url: "/leaderboard" });

      expect(page.statusCode).toBe(200);
      expect(page.headers["content-type"]).toContain("text/html");
      expect(page.headers["cache-control"]).toBe("no-store");
      expect(page.body).toContain("Tide Admin");
      expect(asset.statusCode).toBe(200);
      expect(asset.headers["content-type"]).toContain("text/javascript");
      expect(productRoute.statusCode).toBe(404);
    } finally {
      await app.close();
      await rm(uiDir, { recursive: true, force: true });
    }
  });

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

  it("garde le coffre de seeds sur le serveur privé et ne renvoie jamais la seed", async () => {
    const paper = new PaperService(undefined, new InMemoryAccountStore());
    const service = new AdminService({
      paper,
      agents: new InMemoryAgentStore(),
      mandates: new InMemoryMandateStore(),
      actions: new InMemoryAgentActionsStore(),
      prizePoolAddress: null,
      operatorUserIds: new Set<string>(),
    });
    const list = vi.fn(async () => []);
    const importSeed = vi.fn(async (label: string) => ({
      address: "rManaged",
      label,
      createdAt: 1,
      paperTrades: 0,
      badges: [],
    }));
    const recordPaperTrade = vi.fn(async () => ({
      address: "rManaged",
      label: "Managed",
      createdAt: 1,
      paperTrades: 1,
      badges: [],
    }));
    const claimBadge = vi.fn(async () => ({
      address: "rManaged",
      badgeCode: "first_trade",
      nftTokenId: "NFT",
      sellOfferId: "OFFER",
      claimHash: "CLAIM",
    }));
    const remove = vi.fn(async () => ({ deleted: true as const }));
    const managedWalletAdmin = {
      list,
      importSeed,
      recordPaperTrade,
      claimBadge,
      remove,
    } as unknown as ManagedExternalWalletService;
    const app = buildPrivateAdminServer({
      paper,
      competition: new CompetitionService(new InMemoryCompetitionStore()),
      getPrices: () => ({ XRP: 0.5 }),
      admin: { token: ADMIN_TOKEN, service },
      managedWalletAdmin,
    });

    expect((await app.inject({ method: "GET", url: "/admin/managed-wallets" })).statusCode)
      .toBe(401);
    const seed = "sPrivateNeverEchoed";
    const imported = await app.inject({
      method: "POST",
      url: "/admin/managed-wallets",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: { label: "Managed", seed },
    });
    expect(imported.statusCode).toBe(201);
    expect(imported.body).not.toContain(seed);
    expect(importSeed).toHaveBeenCalledWith("Managed", seed);

    expect((await app.inject({
      method: "POST",
      url: "/admin/managed-wallets/rManaged/trades",
      headers: { "x-admin-token": ADMIN_TOKEN },
    })).statusCode).toBe(200);
    expect((await app.inject({
      method: "POST",
      url: "/admin/managed-wallets/rManaged/badges/first_trade/claim",
      headers: { "x-admin-token": ADMIN_TOKEN },
    })).statusCode).toBe(200);
    expect((await app.inject({
      method: "DELETE",
      url: "/admin/managed-wallets/rManaged",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: { confirmation: "rManaged" },
    })).statusCode).toBe(200);
    expect(recordPaperTrade).toHaveBeenCalledWith("rManaged");
    expect(claimBadge).toHaveBeenCalledWith("rManaged", "first_trade");
    expect(remove).toHaveBeenCalledWith("rManaged", "rManaged");
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
    expect(body).not.toHaveProperty("simulation");
    await app.close();
  });

  it("supprime un compte Paper vierge avec token et confirmation exacte", async () => {
    const app = buildAdminServer();
    const rejected = await app.inject({
      method: "POST",
      url: "/admin/users/delete-inactive",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: { userIds: ["visitor"], confirmation: "wrong" },
    });
    expect(rejected.statusCode).toBe(409);

    const accepted = await app.inject({
      method: "POST",
      url: "/admin/users/delete-inactive",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: {
        userIds: ["visitor"],
        confirmation: "DELETE 1 INACTIVE PAPER ACCOUNTS",
      },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({ deleted: 1, walletRowsDeleted: 0 });

    const overview = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(overview.json().totals.users).toBe(0);
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
  it("garde la planification et l'exécution du portfolio manager derrière le token admin", async () => {
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
    const plan = {
      id: "plan-1",
      managerAgentId: "manager",
      createdAt: 1,
      status: "prepared" as const,
      llmCalls: 0 as const,
      confirmation: "EXECUTE 1 DIVERSIFIED PAPER TRADES",
      trades: [],
    };
    const prepare = vi.fn(async () => plan);
    const execute = vi.fn(async () => ({
      planId: plan.id,
      requested: 1,
      succeeded: 1,
      failed: 0,
      results: [],
    }));
    const portfolioManager = {
      status: vi.fn(async () => ({ enabled: true, preparedPlan: null })),
      prepare,
      execute,
    } as unknown as PortfolioManagerService;
    const app = buildPrivateAdminServer({
      paper,
      competition: new CompetitionService(new InMemoryCompetitionStore()),
      getPrices: () => ({ XRP: 0.5 }),
      admin: { token: ADMIN_TOKEN, service, portfolioManager },
    });

    const unauthorized = await app.inject({
      method: "POST",
      url: "/admin/portfolio-manager/plan",
      payload: { userIds: ["visitor"] },
    });
    expect(unauthorized.statusCode).toBe(401);

    const prepared = await app.inject({
      method: "POST",
      url: "/admin/portfolio-manager/plan",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: { userIds: ["visitor"] },
    });
    expect(prepared.statusCode).toBe(200);
    expect(prepare).toHaveBeenCalledWith(["visitor"], "standard");

    const executed = await app.inject({
      method: "POST",
      url: "/admin/portfolio-manager/execute",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: { planId: plan.id, confirmation: plan.confirmation },
    });
    expect(executed.statusCode).toBe(200);
    expect(execute).toHaveBeenCalledWith(plan.id, plan.confirmation);
    await app.close();
  });

  it("ne publie aucun endpoint de création ou de financement en lot", async () => {
    const app = buildAdminServer({ status: vi.fn() } as unknown as PaperWalletAdminService);
    for (const action of ["provision", "create-for-users", "fund-for-users", "setup", "nfts"]) {
      const response = await app.inject({
        method: "POST",
        url: `/admin/wallets/${action}`,
        headers: { "x-admin-token": ADMIN_TOKEN },
        payload: { count: 2, userIds: ["paper:u1", "paper:u2"] },
      });
      expect(response.statusCode).toBe(404);
    }
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

describe("GET /admin/agent-actions", () => {
  function buildWithActions() {
    const actions = new InMemoryAgentActionsStore();
    const paper = new PaperService(undefined, new InMemoryAccountStore());
    paper.openAccount("visitor");
    const service = new AdminService({
      paper,
      agents: new InMemoryAgentStore(),
      mandates: new InMemoryMandateStore(),
      actions,
      prizePoolAddress: null,
      operatorUserIds: new Set<string>(),
    });
    const app = buildServer({
      paper,
      competition: new CompetitionService(new InMemoryCompetitionStore()),
      getPrices: () => ({ XRP: 0.5 }),
      admin: { token: ADMIN_TOKEN, service },
    });
    return { app, actions };
  }

  async function seed(actions: InMemoryAgentActionsStore, count: number) {
    for (let i = 0; i < count; i += 1) {
      await actions.record({
        id: `a${i}`,
        agentId: "agent-1",
        userId: "visitor",
        toolName: "place_order",
        toolParams: "{}",
        result: "{}",
        error: null,
        idempotencyKey: null,
        executedAt: 1_700_000_000_000 + i,
      });
    }
  }

  it("401 sans token, sans révéler l'existence de l'agent", async () => {
    const { app } = buildWithActions();
    const res = await app.inject({ method: "GET", url: "/admin/agent-actions?agentId=agent-1" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("400 si agentId manque ou est vide", async () => {
    const { app } = buildWithActions();
    const headers = { "x-admin-token": ADMIN_TOKEN };
    expect((await app.inject({ method: "GET", url: "/admin/agent-actions", headers })).statusCode).toBe(400);
    expect(
      (await app.inject({ method: "GET", url: "/admin/agent-actions?agentId=%20", headers })).statusCode,
    ).toBe(400);
    await app.close();
  });

  it("400 si limit est hors de [1, 200] ou non entier", async () => {
    const { app } = buildWithActions();
    const headers = { "x-admin-token": ADMIN_TOKEN };
    for (const limit of ["0", "201", "abc"]) {
      const res = await app.inject({
        method: "GET",
        url: `/admin/agent-actions?agentId=agent-1&limit=${limit}`,
        headers,
      });
      expect(res.statusCode).toBe(400);
    }
    await app.close();
  });

  it("200 + le log complet de l'agent avec le bon token", async () => {
    const { app, actions } = buildWithActions();
    await seed(actions, 3);
    const res = await app.inject({
      method: "GET",
      url: "/admin/agent-actions?agentId=agent-1",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(3);
    expect(body[0].toolName).toBe("place_order");
    await app.close();
  });

  it("respecte limit", async () => {
    const { app, actions } = buildWithActions();
    await seed(actions, 5);
    const res = await app.inject({
      method: "GET",
      url: "/admin/agent-actions?agentId=agent-1&limit=2",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(res.json()).toHaveLength(2);
    await app.close();
  });
});
