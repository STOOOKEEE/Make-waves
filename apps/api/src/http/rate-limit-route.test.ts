import { describe, expect, it } from "vitest";
import { buildServer } from "./server";
import { AuthService } from "../auth/auth-service";
import { InMemoryChallengeStore } from "../auth/challenge-store";
import { PaperService } from "../services/paper-service";
import { CompetitionService } from "../services/competition-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryCompetitionStore } from "../store/competition-store";

function build() {
  const service = new AuthService({
    secret: "s".repeat(40),
    ttlSeconds: 3600,
    challenges: new InMemoryChallengeStore(300_000),
  });
  return buildServer({
    paper: new PaperService(undefined, new InMemoryAccountStore()),
    competition: new CompetitionService(new InMemoryCompetitionStore()),
    getPrices: () => ({ XRP: 0.5 }),
    auth: { service, resolvers: { agentOwner: async () => null, mandateOwner: async () => null } },
    rateLimit: { global: { max: 5, windowMs: 60_000 }, strict: { max: 2, windowMs: 60_000 } },
  });
}

describe("rate limiting (F7)", () => {
  it("429 après la borne globale", async () => {
    const app = build();
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) {
      codes.push((await app.inject({ method: "GET", url: "/leaderboard" })).statusCode);
    }
    expect(codes).toContain(429);
    await app.close();
  });

  it("borne stricte plus basse sur /auth/*", async () => {
    const app = build();
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) {
      codes.push(
        (await app.inject({ method: "POST", url: "/auth/challenge", payload: { address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh" } })).statusCode,
      );
    }
    // strict max = 2 → les 2 premières passent, les suivantes sont 429.
    expect(codes[0]).not.toBe(429);
    expect(codes[3]).toBe(429);
    await app.close();
  });
});
