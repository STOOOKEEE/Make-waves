import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { buildServer } from "../src/http/server";
import type { ServerDeps } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import { AgentService } from "../src/services/agent-service";
import { MandateService } from "../src/services/mandate-service";
import { AgentXrplAccountService } from "../src/services/agent-xrpl-account-service";
import { InMemoryAgentStore } from "../src/store/agent-store";
import { InMemoryMandateStore } from "../src/store/mandate-store";
import { InMemoryAgentXrplKeysStore } from "../src/store/agent-xrpl-keys-store";
import type { MandateXamanApi } from "../src/services/mandate-service";

const MASTER_KEY = "a".repeat(64);
const MASTER_KEY_ID = "v1";

const fakeXaman: MandateXamanApi = {
  async createSignRequest() {
    return { uuid: "u", signUrl: "s", qrPng: "q" };
  },
  async getPayloadStatus() {
    return { meta: { signed: true } };
  },
};

interface Harness {
  app: ReturnType<typeof buildServer>;
  agentSvc: AgentService;
  liveSvc: AgentXrplAccountService;
  agents: InMemoryAgentStore;
  keys: InMemoryAgentXrplKeysStore;
}

function makeHarness(): Harness {
  const agents = new InMemoryAgentStore();
  const mandates = new InMemoryMandateStore();
  const keys = new InMemoryAgentXrplKeysStore();
  const agentSvc = new AgentService(agents, mandates);
  const liveSvc = new AgentXrplAccountService({
    keys,
    agents,
    masterKeyHex: MASTER_KEY,
    masterKeyId: MASTER_KEY_ID,
  });
  const deps: ServerDeps = {
    paper: new PaperService(1000),
    competition: new CompetitionService(),
    getPrices: () => ({}),
    agentService: agentSvc,
    mandateService: new MandateService(mandates, fakeXaman),
    agentXrplAccountService: liveSvc,
  };
  return { app: buildServer(deps), agentSvc, liveSvc, agents, keys };
}

async function createAgent(app: ReturnType<typeof buildServer>, userId: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/agents",
    payload: { userId, name: "tide-bot", type: "external" },
  });
  expect(res.statusCode).toBe(201);
  return res.json().id as string;
}

describe("agent live-account routes", () => {
  let h: Harness;

  beforeEach(() => {
    h = makeHarness();
  });

  it("POST /api/agents/:id/live-account génère un compte (200, adresse XRPL)", async () => {
    const agentId = await createAgent(h.app, "u1");

    const res = await h.app.inject({
      method: "POST",
      url: `/api/agents/${agentId}/live-account`,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/);
    expect(body.publicKey).toBe(body.address);

    // Persistance vérifiée côté store.
    const stored = await h.keys.get(agentId);
    expect(stored).not.toBeNull();
    expect((await h.agents.get(agentId))?.hasLiveAccount).toBe(true);

    await h.app.close();
  });

  it("POST avec seed renvoie 501 (import hors scope v1)", async () => {
    const agentId = await createAgent(h.app, "u1");

    const res = await h.app.inject({
      method: "POST",
      url: `/api/agents/${agentId}/live-account`,
      payload: { seed: "sEdTM1uX8pu2do5XPTGTWWxQALfq9Z8W" },
    });
    expect(res.statusCode).toBe(501);
    expect(res.json()).toEqual({ error: "Seed import not implemented in v1" });

    // Aucun compte créé en base (501 = pas d'effet de bord).
    expect(await h.keys.get(agentId)).toBeNull();
    expect((await h.agents.get(agentId))?.hasLiveAccount).toBe(false);

    await h.app.close();
  });

  it("POST sur agent inconnu renvoie 404", async () => {
    const res = await h.app.inject({
      method: "POST",
      url: `/api/agents/${randomUUID()}/live-account`,
      payload: {},
    });
    expect(res.statusCode).toBe(404);

    await h.app.close();
  });

  it("DELETE /api/agents/:id/live-account révoque la clé (200, idempotent)", async () => {
    const agentId = await createAgent(h.app, "u1");
    await h.app.inject({
      method: "POST",
      url: `/api/agents/${agentId}/live-account`,
      payload: {},
    });
    expect(await h.keys.get(agentId)).not.toBeNull();

    const del = await h.app.inject({
      method: "DELETE",
      url: `/api/agents/${agentId}/live-account`,
    });
    expect(del.statusCode).toBe(200);
    expect(del.json()).toEqual({ revoked: true });
    expect(await h.keys.get(agentId)).toBeNull();
    expect((await h.agents.get(agentId))?.hasLiveAccount).toBe(false);

    // 2e appel : no-op (service idempotent).
    const del2 = await h.app.inject({
      method: "DELETE",
      url: `/api/agents/${agentId}/live-account`,
    });
    expect(del2.statusCode).toBe(200);
    expect(del2.json()).toEqual({ revoked: true });

    await h.app.close();
  });

  it("rejette un seed non-string (400)", async () => {
    const agentId = await createAgent(h.app, "u1");

    const res = await h.app.inject({
      method: "POST",
      url: `/api/agents/${agentId}/live-account`,
      payload: { seed: 42 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/seed.*string/);

    await h.app.close();
  });

  it("rejette un body invalide (tableau, 400)", async () => {
    const agentId = await createAgent(h.app, "u1");

    const res = await h.app.inject({
      method: "POST",
      url: `/api/agents/${agentId}/live-account`,
      payload: [1, 2, 3],
    });
    expect(res.statusCode).toBe(400);

    await h.app.close();
  });

  it("les routes live-account n'existent pas sans service (404)", async () => {
    const app = buildServer({
      paper: new PaperService(1000),
      competition: new CompetitionService(),
      getPrices: () => ({}),
    });

    const post = await app.inject({
      method: "POST",
      url: `/api/agents/${randomUUID()}/live-account`,
      payload: {},
    });
    expect(post.statusCode).toBe(404);

    const del = await app.inject({
      method: "DELETE",
      url: `/api/agents/${randomUUID()}/live-account`,
    });
    expect(del.statusCode).toBe(404);

    await app.close();
  });
});
