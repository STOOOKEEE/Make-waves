import { describe, expect, it } from "vitest";
import { buildServer } from "./server";
import { AuthService } from "../auth/auth-service";
import { InMemoryChallengeStore } from "../auth/challenge-store";
import type { AuthzResolvers } from "../auth/guard";
import { PaperService } from "../services/paper-service";
import { CompetitionService } from "../services/competition-service";
import { AgentService } from "../services/agent-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryCompetitionStore } from "../store/competition-store";
import { InMemoryAgentStore } from "../store/agent-store";
import { InMemoryMandateStore } from "../store/mandate-store";

const NO_RESOLVERS: AuthzResolvers = {
  agentOwner: async () => null,
  mandateOwner: async () => null,
};

function build() {
  const service = new AuthService({
    secret: "test-secret",
    ttlSeconds: 3600,
    challenges: new InMemoryChallengeStore(300_000),
  });
  const app = buildServer({
    paper: new PaperService(undefined, new InMemoryAccountStore()),
    competition: new CompetitionService(new InMemoryCompetitionStore()),
    getPrices: () => ({ XRP: 0.5 }),
    agentService: new AgentService(new InMemoryAgentStore(), new InMemoryMandateStore()),
    auth: { service, resolvers: NO_RESOLVERS },
  });
  return app;
}

describe("GET /api/agents/events (SSE, F3)", () => {
  it("401 sans token (le flux ne s'ouvre pas)", async () => {
    const app = build();
    const res = await app.inject({ method: "GET", url: "/api/agents/events" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("401 avec un token invalide en query", async () => {
    const app = build();
    const res = await app.inject({ method: "GET", url: "/api/agents/events?token=pas-un-jwt" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
