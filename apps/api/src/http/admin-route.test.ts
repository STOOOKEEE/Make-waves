import { describe, expect, it } from "vitest";
import { buildServer } from "./server";
import { AdminService } from "../services/admin-service";
import { PaperService } from "../services/paper-service";
import { CompetitionService } from "../services/competition-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryAgentStore } from "../store/agent-store";
import { InMemoryMandateStore } from "../store/mandate-store";
import { InMemoryAgentActionsStore } from "../store/agent-actions-store";
import { InMemoryCompetitionStore } from "../store/competition-store";

const ADMIN_TOKEN = "secret";

function buildAdminServer(actions = new InMemoryAgentActionsStore()) {
  const accounts = new InMemoryAccountStore();
  const paper = new PaperService(undefined, accounts);
  paper.openAccount("visitor");
  const service = new AdminService({
    paper,
    agents: new InMemoryAgentStore(),
    mandates: new InMemoryMandateStore(),
    actions,
    prizePoolAddress: null,
    operatorUserIds: new Set<string>(),
  });
  return buildServer({
    paper,
    competition: new CompetitionService(new InMemoryCompetitionStore()),
    getPrices: () => ({ XRP: 0.5 }),
    agentActionsStore: actions,
    admin: { token: ADMIN_TOKEN, service },
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

describe("GET /admin/agent-actions", () => {
  const seed = new InMemoryAgentActionsStore();
  seed.record({
    id: "a1",
    agentId: "agent-1",
    userId: "u1",
    toolName: "open_position",
    toolParams: '{"leverage":10}',
    result: null,
    error: "RISK_LIMIT: leverage 10 > max 3",
    idempotencyKey: null,
    executedAt: 1,
  });

  it("401 sans token", async () => {
    const app = buildAdminServer(seed);
    const res = await app.inject({
      method: "GET",
      url: "/admin/agent-actions?agentId=agent-1",
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("400 sans agentId", async () => {
    const app = buildAdminServer(seed);
    const res = await app.inject({
      method: "GET",
      url: "/admin/agent-actions",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("400 si limit hors [1, 200]", async () => {
    const app = buildAdminServer(seed);
    const res = await app.inject({
      method: "GET",
      url: "/admin/agent-actions?agentId=agent-1&limit=999",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("200 + log de l'agent avec le bon token", async () => {
    const app = buildAdminServer(seed);
    const res = await app.inject({
      method: "GET",
      url: "/admin/agent-actions?agentId=agent-1",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].toolName).toBe("open_position");
    expect(body[0].error).toContain("RISK_LIMIT");
    await app.close();
  });
});
