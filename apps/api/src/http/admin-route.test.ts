import { describe, expect, it, vi } from "vitest";
import { buildServer } from "./server";
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
});

describe("admin wallet operations", () => {
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
      payload: { confirmation: "DELETE ALL TESTNET WALLETS" },
    });
    expect(unauthorized.statusCode).toBe(401);

    const accepted = await app.inject({
      method: "POST",
      url: "/admin/wallets/reclaim-all",
      headers: { "x-admin-token": ADMIN_TOKEN },
      payload: { confirmation: "DELETE ALL TESTNET WALLETS" },
    });
    expect(accepted.statusCode).toBe(202);
    expect(startReclaimAll).toHaveBeenCalledWith("DELETE ALL TESTNET WALLETS");
    await app.close();
  });
});
