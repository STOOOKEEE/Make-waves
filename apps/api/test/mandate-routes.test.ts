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

const validMandate = (agentId: string) => ({
  agentId,
  userId: "u1",
  capitalMax: 100,
  perteMaxJour: 10,
  maxTradesPerDay: 5,
  maxLeverage: 3,
  pairesAutorisees: ["BTC", "ETH"],
  style: "momentum" as const,
  validUntil: Date.now() + 86_400_000,
});

describe("mandate routes", () => {
  it("POST /api/mandates crée un mandat en status=pending (201)", async () => {
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
    const agentId = created.json().id;

    const res = await app.inject({
      method: "POST",
      url: "/api/mandates",
      payload: validMandate(agentId),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe("pending");
    expect(body.agentId).toBe(agentId);
    expect(body.signature).toBeNull();
    expect(body.signedAt).toBeNull();

    await app.close();
  });

  it("POST /api/sign/mandate-callback passe un mandat pending → active", async () => {
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
    const agentId = created.json().id;
    const mandateRes = await app.inject({
      method: "POST",
      url: "/api/mandates",
      payload: validMandate(agentId),
    });
    const mandateId = mandateRes.json().id;

    const res = await app.inject({
      method: "POST",
      url: "/api/sign/mandate-callback",
      payload: { mandateId, signature: "ABC123" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("active");
    expect(res.json().signature).toBe("ABC123");

    await app.close();
  });

  it("callback sur un mandat inexistant → 400", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const agentSvc = new AgentService(agents, mandates);
    const mandateSvc = new MandateService(mandates, fakeXaman);
    const app = buildServer(depsWith({ agent: agentSvc, mandate: mandateSvc }));

    const res = await app.inject({
      method: "POST",
      url: "/api/sign/mandate-callback",
      payload: { mandateId: randomUUID(), signature: "x" },
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it("callback sur un mandat déjà actif → 400", async () => {
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
    const agentId = created.json().id;
    const mandateRes = await app.inject({
      method: "POST",
      url: "/api/mandates",
      payload: validMandate(agentId),
    });
    const mandateId = mandateRes.json().id;

    await app.inject({
      method: "POST",
      url: "/api/sign/mandate-callback",
      payload: { mandateId, signature: "x" },
    });
    // Deuxième callback : le mandat est déjà active.
    const second = await app.inject({
      method: "POST",
      url: "/api/sign/mandate-callback",
      payload: { mandateId, signature: "y" },
    });
    expect(second.statusCode).toBe(400);

    await app.close();
  });

  it("rejette un body invalide (400) sur /api/mandates", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const agentSvc = new AgentService(agents, mandates);
    const mandateSvc = new MandateService(mandates, fakeXaman);
    const app = buildServer(depsWith({ agent: agentSvc, mandate: mandateSvc }));

    const res = await app.inject({
      method: "POST",
      url: "/api/mandates",
      payload: { agentId: "not-a-uuid" },
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it("rejette un style invalide (400)", async () => {
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
    const agentId = created.json().id;

    const res = await app.inject({
      method: "POST",
      url: "/api/mandates",
      payload: { ...validMandate(agentId), style: "scalping" },
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it("accepte style=null", async () => {
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
    const agentId = created.json().id;

    const res = await app.inject({
      method: "POST",
      url: "/api/mandates",
      payload: { ...validMandate(agentId), style: null },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().style).toBeNull();

    await app.close();
  });

  it("les routes mandates n'existent pas sans mandateService (404)", async () => {
    const app = buildServer({
      paper: new PaperService(1000),
      competition: new CompetitionService(),
      getPrices: () => ({}),
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/mandates",
      payload: validMandate(randomUUID()),
    });
    expect(res.statusCode).toBe(404);

    await app.close();
  });
});