import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildServer } from "../src/http/server";
import type { ServerDeps } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import { AgentService } from "../src/services/agent-service";
import { MandateService } from "../src/services/mandate-service";
import { InMemoryAgentStore } from "../src/store/agent-store";
import { InMemoryMandateStore } from "../src/store/mandate-store";
import type { MandateXamanApi } from "../src/services/mandate-service";

/** Faux Xaman : tout payload est créé instantanément, tout callback est signé. */
const fakeXaman: MandateXamanApi = {
  async createSignRequest() {
    return { uuid: "u", signUrl: "s", qrPng: "q" };
  },
  async getPayloadStatus() {
    return { meta: { signed: true } };
  },
};

function depsWith(services: { agent: AgentService; mandate: MandateService }): ServerDeps {
  return {
    paper: new PaperService(1000),
    competition: new CompetitionService(),
    getPrices: () => ({}),
    agentService: services.agent,
    mandateService: services.mandate,
  };
}

describe("agent routes", () => {
  it("POST /api/agents crée un agent (201)", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const agentSvc = new AgentService(agents, mandates);
    const app = buildServer(depsWith({ agent: agentSvc, mandate: new MandateService(mandates, fakeXaman) }));

    const res = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { userId: "u1", name: "Momentum", type: "external" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Momentum");
    expect(body.userId).toBe("u1");
    expect(body.type).toBe("external");
    expect(body.status).toBe("active");
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);

    await app.close();
  });

  it("GET /api/agents?userId=u1 liste les agents de l'utilisateur", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const agentSvc = new AgentService(agents, mandates);
    const app = buildServer(depsWith({ agent: agentSvc, mandate: new MandateService(mandates, fakeXaman) }));

    await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { userId: "u1", name: "a", type: "external" },
    });
    await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { userId: "u2", name: "b", type: "integrated" },
    });

    const res = await app.inject({ method: "GET", url: "/api/agents?userId=u1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].userId).toBe("u1");

    await app.close();
  });

  it("GET /api/agents sans userId → 400", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const app = buildServer(depsWith({ agent: new AgentService(agents, mandates), mandate: new MandateService(mandates, fakeXaman) }));

    const res = await app.inject({ method: "GET", url: "/api/agents" });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it("GET /api/agents/:id retourne l'agent (200) ou 404", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const agentSvc = new AgentService(agents, mandates);
    const app = buildServer(depsWith({ agent: agentSvc, mandate: new MandateService(mandates, fakeXaman) }));

    const created = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { userId: "u1", name: "a", type: "external" },
    });
    const id = created.json().id;

    const ok = await app.inject({ method: "GET", url: `/api/agents/${id}` });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().id).toBe(id);

    const missing = await app.inject({
      method: "GET",
      url: `/api/agents/${randomUUID()}`,
    });
    expect(missing.statusCode).toBe(404);

    await app.close();
  });

  it("POST /api/agents/:id/kill passe status=stopped et révoque les mandats actifs", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const agentSvc = new AgentService(agents, mandates);
    const mandateSvc = new MandateService(mandates, fakeXaman);
    const app = buildServer(depsWith({ agent: agentSvc, mandate: mandateSvc }));

    const created = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { userId: "u1", name: "a", type: "external" },
    });
    const id = created.json().id;

    // Crée un mandat actif via le service (chemin direct, sans passer par /api/mandates).
    await mandates.create({
      id: randomUUID(),
      agentId: id,
      userId: "u1",
      capitalMax: 100,
      perteMaxJour: 10,
      maxTradesPerDay: 5,
      maxLeverage: 3,
      pairesAutorisees: ["BTC"],
      style: null,
      validUntil: Date.now() + 86_400_000,
      signedAt: Date.now(),
      signature: "x",
      status: "active",
    });

    const res = await app.inject({ method: "POST", url: `/api/agents/${id}/kill` });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("stopped");

    // Le mandat actif doit avoir été révoqué.
    const active = await mandateSvc.getActiveForAgent(id);
    expect(active).toBeNull();

    await app.close();
  });

  it("rejette un corps invalide (400)", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const app = buildServer(depsWith({ agent: new AgentService(agents, mandates), mandate: new MandateService(mandates, fakeXaman) }));

    const res = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { name: "x" },
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it("rejette un type invalide (400)", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const app = buildServer(depsWith({ agent: new AgentService(agents, mandates), mandate: new MandateService(mandates, fakeXaman) }));

    const res = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { userId: "u1", name: "a", type: "rogue" },
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it("les routes agents n'existent pas sans agentService (404)", async () => {
    const app = buildServer({
      paper: new PaperService(1000),
      competition: new CompetitionService(),
      getPrices: () => ({}),
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { userId: "u1", name: "a", type: "external" },
    });
    expect(res.statusCode).toBe(404);

    await app.close();
  });
});