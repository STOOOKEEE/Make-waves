import { describe, it, expect } from "vitest";
import { buildServer } from "../src/http/server";
import type { ServerDeps } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import { AgentService } from "../src/services/agent-service";
import { MandateService } from "../src/services/mandate-service";
import { InMemoryAgentStore } from "../src/store/agent-store";
import { InMemoryMandateStore } from "../src/store/mandate-store";
import type { MandateXamanApi } from "../src/services/mandate-service";

/** Faux Xaman : tout payload est créé instantanément, le callback signe immédiatement. */
const fakeXaman: MandateXamanApi = {
  async createSignRequest() {
    return { uuid: "u", signUrl: "s", qrPng: "q" };
  },
  async getPayloadStatus() {
    return { meta: { signed: true } };
  },
};

function depsWith(services: {
  agent: AgentService;
  mandate: MandateService;
}): ServerDeps {
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
  capitalMax: 1000,
  perteMaxJour: 50,
  maxTradesPerDay: 10,
  maxLeverage: 3,
  pairesAutorisees: ["BTC"],
  style: "momentum" as const,
  validUntil: Date.now() + 86_400_000,
});

/**
 * E2E du flux agent côté API : créer un agent, lui signer un mandat, puis tuer
 * l'agent pour vérifier la révocation automatique du mandat actif. Couvre la
 * chaîne complète via HTTP (Fastify `inject`), pas via les services directs —
 * c'est la même surface qu'un front ou un tool MCP appellera.
 */
describe("E2E agent flow", () => {
  it("createAgent → signMandate → agent opérationnel", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const agentSvc = new AgentService(agents, mandates);
    const mandateSvc = new MandateService(mandates, fakeXaman);
    const app = buildServer(depsWith({ agent: agentSvc, mandate: mandateSvc }));

    // 1. Création de l'agent (status=active par défaut).
    const createAgent = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { userId: "u1", name: "tide-momentum-v1", type: "external" },
    });
    expect(createAgent.statusCode).toBe(201);
    const agentId = createAgent.json().id;
    expect(createAgent.json().status).toBe("active");

    // 2. Création d'un mandat en status=pending.
    const createMandate = await app.inject({
      method: "POST",
      url: "/api/mandates",
      payload: validMandate(agentId),
    });
    expect(createMandate.statusCode).toBe(201);
    const mandateId = createMandate.json().id;
    expect(createMandate.json().status).toBe("pending");

    // 3. Callback Xaman : le mandat devient active, l'agent est opérationnel.
    const sign = await app.inject({
      method: "POST",
      url: "/api/sign/mandate-callback",
      payload: { mandateId, signature: "fake-sig" },
    });
    expect(sign.statusCode).toBe(200);
    expect(sign.json().status).toBe("active");
    expect(sign.json().signature).toBe("fake-sig");

    // 4. L'agent reste actif et a un mandat actif courant.
    const active = await mandateSvc.getActiveForAgent(agentId);
    expect(active).not.toBeNull();
    expect(active?.id).toBe(mandateId);

    await app.close();
  });

  it("kill switch révoque le mandat actif et diffuse agent_killed", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const agentSvc = new AgentService(agents, mandates);
    const mandateSvc = new MandateService(mandates, fakeXaman);
    const app = buildServer(depsWith({ agent: agentSvc, mandate: mandateSvc }));

    // Mise en place : agent + mandat signé (active).
    const createAgent = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { userId: "u1", name: "tide-kill-test", type: "external" },
    });
    const agentId = createAgent.json().id;
    const createMandate = await app.inject({
      method: "POST",
      url: "/api/mandates",
      payload: validMandate(agentId),
    });
    const mandateId = createMandate.json().id;
    await app.inject({
      method: "POST",
      url: "/api/sign/mandate-callback",
      payload: { mandateId, signature: "fake-sig" },
    });

    // Kill : l'agent passe à status=stopped ET son mandat actif est révoqué.
    const kill = await app.inject({
      method: "POST",
      url: `/api/agents/${agentId}/kill`,
    });
    expect(kill.statusCode).toBe(200);
    expect(kill.json().status).toBe("stopped");

    // Plus de mandat actif courant.
    const active = await mandateSvc.getActiveForAgent(agentId);
    expect(active).toBeNull();

    // Le mandat existe toujours dans le store, mais en status=revoked
    // (l'audit LLM doit pouvoir tracer « mandat actif tué à T »).
    const allMandates = await mandateSvc.listByAgent(agentId);
    expect(allMandates).toHaveLength(1);
    const [first] = allMandates;
    expect(first).toBeDefined();
    expect(first?.status).toBe("revoked");

    await app.close();
  });
});