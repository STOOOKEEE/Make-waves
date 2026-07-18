import { describe, expect, it } from "vitest";
import { authorize } from "./guard";
import type { AuthzRequest, AuthzResolvers } from "./guard";

const ME = "rMe111111111111111111111111111";
const OTHER = "rOther2222222222222222222222222";

const AGENTS: Record<string, string> = { "agent-mine": ME, "agent-other": OTHER };
const MANDATES: Record<string, string> = { "mandate-mine": ME, "mandate-other": OTHER };

const resolvers: AuthzResolvers = {
  agentOwner: async (id) => AGENTS[id] ?? null,
  mandateOwner: async (id) => MANDATES[id] ?? null,
};

function req(overrides: Partial<AuthzRequest>): AuthzRequest {
  return {
    method: "GET",
    routeUrl: "/",
    params: {},
    query: {},
    body: undefined,
    tokenAddress: ME,
    ...overrides,
  };
}

describe("authorize — routes publiques", () => {
  it("laisse passer une route publique sans token", async () => {
    const d = await authorize(
      req({ method: "GET", routeUrl: "/leaderboard", tokenAddress: null }),
      resolvers,
    );
    expect(d.ok).toBe(true);
  });

  it("laisse passer /sign/connect et /sign/status (handshake de login)", async () => {
    expect(
      (await authorize(req({ method: "POST", routeUrl: "/sign/connect", tokenAddress: null }), resolvers)).ok,
    ).toBe(true);
    expect(
      (await authorize(req({ method: "GET", routeUrl: "/sign/status/:uuid", tokenAddress: null }), resolvers)).ok,
    ).toBe(true);
  });

  it("laisse créer une session Paper anonyme sans token", async () => {
    const d = await authorize(
      req({ method: "POST", routeUrl: "/auth/paper", tokenAddress: null }),
      resolvers,
    );
    expect(d.ok).toBe(true);
  });

  it("laisse passer les préflights OPTIONS", async () => {
    const d = await authorize(req({ method: "OPTIONS", routeUrl: "/accounts/:userId/orders", tokenAddress: null }), resolvers);
    expect(d.ok).toBe(true);
  });

  it("laisse le provisioning au garde dédié du handler admin", async () => {
    const d = await authorize(
      req({ method: "POST", routeUrl: "/admin/wallets/provision", tokenAddress: null }),
      resolvers,
    );
    expect(d.ok).toBe(true);
    expect((await authorize(
      req({ method: "POST", routeUrl: "/admin/wallets/fund-for-users", tokenAddress: null }),
      resolvers,
    )).ok).toBe(true);
    expect((await authorize(
      req({ method: "POST", routeUrl: "/admin/wallets/nfts", tokenAddress: null }),
      resolvers,
    )).ok).toBe(true);
  });
});

describe("authorize — token requis", () => {
  it("401 sur une route protégée sans token", async () => {
    const d = await authorize(
      req({ method: "GET", routeUrl: "/accounts/:userId/orders", params: { userId: ME }, tokenAddress: null }),
      resolvers,
    );
    expect(d).toEqual({ ok: false, status: 401, error: expect.any(String) });
  });
});

describe("authorize — propriété par :userId", () => {
  it("200 si :userId == token", async () => {
    const d = await authorize(
      req({ routeUrl: "/accounts/:userId/orders", params: { userId: ME } }),
      resolvers,
    );
    expect(d.ok).toBe(true);
  });

  it("403 si :userId != token", async () => {
    const d = await authorize(
      req({ routeUrl: "/accounts/:userId/orders", params: { userId: OTHER } }),
      resolvers,
    );
    expect(d).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });
});

describe("authorize — propriété par body/query", () => {
  it("création de compte : body.userId doit être soi", async () => {
    expect((await authorize(req({ method: "POST", routeUrl: "/accounts", body: { userId: ME } }), resolvers)).ok).toBe(true);
    expect((await authorize(req({ method: "POST", routeUrl: "/accounts", body: { userId: OTHER } }), resolvers)).ok).toBe(false);
  });

  it("swap/buy-in : body.account doit être soi", async () => {
    expect((await authorize(req({ method: "POST", routeUrl: "/exec/plan", body: { account: ME } }), resolvers)).ok).toBe(true);
    expect((await authorize(req({ method: "POST", routeUrl: "/exec/plan", body: { account: OTHER } }), resolvers)).ok).toBe(false);
  });

  it("ticket de compétition : préparation et confirmation restent liées au wallet authentifié", async () => {
    expect((await authorize(req({ method: "POST", routeUrl: "/competitions/:id/entry/tx", body: { account: ME } }), resolvers)).ok).toBe(true);
    expect((await authorize(req({ method: "POST", routeUrl: "/competitions/:id/entry/xaman", body: { account: OTHER } }), resolvers)).ok).toBe(false);
    expect((await authorize(req({ method: "POST", routeUrl: "/competitions/:id/join", body: { userId: ME, txHash: "A".repeat(64) } }), resolvers)).ok).toBe(true);
    expect((await authorize(req({ method: "POST", routeUrl: "/competitions/:id/join", body: { userId: OTHER, txHash: "A".repeat(64) } }), resolvers)).ok).toBe(false);
  });

  it("claim de badge : body.userId doit être soi", async () => {
    expect((await authorize(req({ method: "POST", routeUrl: "/badges/:code/claim", params: { code: "x" }, body: { userId: OTHER } }), resolvers)).ok).toBe(false);
  });

  it("claim de badge : walletAddress doit aussi être soi (F4 — mint vers l'adresse authentifiée)", async () => {
    expect((await authorize(req({ method: "POST", routeUrl: "/badges/:code/claim", params: { code: "x" }, body: { userId: ME, walletAddress: OTHER } }), resolvers)).ok).toBe(false);
    expect((await authorize(req({ method: "POST", routeUrl: "/badges/:code/claim", params: { code: "x" }, body: { userId: ME, walletAddress: ME } }), resolvers)).ok).toBe(true);
  });
});

describe("authorize — propriété d'agent (via resolver)", () => {
  it("200 sur mon agent, 403 sur celui d'un autre", async () => {
    expect((await authorize(req({ routeUrl: "/api/agents/:id", params: { id: "agent-mine" } }), resolvers)).ok).toBe(true);
    expect((await authorize(req({ method: "POST", routeUrl: "/api/agents/:id/kill", params: { id: "agent-other" } }), resolvers)).ok).toBe(false);
  });

  it("laisse passer un agent inconnu (le handler renverra 404)", async () => {
    const d = await authorize(req({ routeUrl: "/api/agents/:id", params: { id: "inconnu" } }), resolvers);
    expect(d.ok).toBe(true);
  });

  it("liste d'agents : query.userId doit être soi", async () => {
    expect((await authorize(req({ routeUrl: "/api/agents", query: { userId: OTHER } }), resolvers)).ok).toBe(false);
  });

  it("chat agent : body.userId ET l'agent doivent être à soi", async () => {
    expect((await authorize(req({ method: "POST", routeUrl: "/api/agent-chat/stream", body: { userId: ME, agentId: "agent-mine" } }), resolvers)).ok).toBe(true);
    expect((await authorize(req({ method: "POST", routeUrl: "/api/agent-chat/stream", body: { userId: ME, agentId: "agent-other" } }), resolvers)).ok).toBe(false);
  });

  it("création de mandat : body.userId ET l'agent doivent être à soi", async () => {
    expect((await authorize(req({ method: "POST", routeUrl: "/api/mandates", body: { userId: ME, agentId: "agent-mine" } }), resolvers)).ok).toBe(true);
    expect((await authorize(req({ method: "POST", routeUrl: "/api/mandates", body: { userId: ME, agentId: "agent-other" } }), resolvers)).ok).toBe(false);
  });

  it("callback de signature de mandat : le mandat doit être à soi", async () => {
    expect((await authorize(req({ method: "POST", routeUrl: "/api/sign/mandate-callback", body: { mandateId: "mandate-mine" } }), resolvers)).ok).toBe(true);
    expect((await authorize(req({ method: "POST", routeUrl: "/api/sign/mandate-callback", body: { mandateId: "mandate-other" } }), resolvers)).ok).toBe(false);
  });
});

describe("authorize — repli authentifié", () => {
  it("laisse passer une route authentifiée sans règle de propriété", async () => {
    const d = await authorize(req({ method: "POST", routeUrl: "/competitions" }), resolvers);
    expect(d.ok).toBe(true);
  });
});
