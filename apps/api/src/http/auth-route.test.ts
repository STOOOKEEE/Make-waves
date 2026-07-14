import { describe, expect, it } from "vitest";
import { deriveKeypair, sign } from "ripple-keypairs";
import { buildServer } from "./server";
import { AuthService } from "../auth/auth-service";
import { InMemoryChallengeStore } from "../auth/challenge-store";
import type { AuthzResolvers } from "../auth/guard";
import { PaperService } from "../services/paper-service";
import { CompetitionService } from "../services/competition-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryCompetitionStore } from "../store/competition-store";
import type { XamanPayloadApi } from "../xaman/sign-request";

const ROOT_SEED = "snoPBrXtMeMyMHUVTgbuqAfg1SUTb";
const ME = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const OTHER = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";
const SECRET = "test-secret";

const NO_RESOLVERS: AuthzResolvers = {
  agentOwner: async () => null,
  mandateOwner: async () => null,
};

function buildAuthServer(xaman?: XamanPayloadApi) {
  const accounts = new InMemoryAccountStore();
  const paper = new PaperService(undefined, accounts);
  paper.openAccount(ME);
  const service = new AuthService({
    secret: SECRET,
    ttlSeconds: 3600,
    challenges: new InMemoryChallengeStore(300_000),
    xaman,
  });
  const app = buildServer({
    paper,
    competition: new CompetitionService(new InMemoryCompetitionStore()),
    getPrices: () => ({ XRP: 0.5 }),
    auth: { service, resolvers: NO_RESOLVERS },
  });
  return { app, service };
}

describe("preHandler d'autorisation", () => {
  it("laisse passer une route publique sans token", async () => {
    const { app } = buildAuthServer();
    const res = await app.inject({ method: "GET", url: "/leaderboard" });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("401 sur une route protégée sans token", async () => {
    const { app } = buildAuthServer();
    const res = await app.inject({ method: "GET", url: `/accounts/${ME}/orders` });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("403 quand le token ne correspond pas au :userId", async () => {
    const { app, service } = buildAuthServer();
    const token = service.issueToken(OTHER);
    const res = await app.inject({
      method: "GET",
      url: `/accounts/${ME}/orders`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("200 sur son propre compte avec un token valide", async () => {
    const { app, service } = buildAuthServer();
    const token = service.issueToken(ME);
    const res = await app.inject({
      method: "GET",
      url: `/accounts/${ME}/orders`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});

describe("POST /auth/challenge", () => {
  it("renvoie un nonce + message pour une adresse valide", async () => {
    const { app } = buildAuthServer();
    const res = await app.inject({ method: "POST", url: "/auth/challenge", payload: { address: ME } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.nonce).toBe("string");
    expect(body.message).toContain(ME);
    await app.close();
  });

  it("400 pour une adresse invalide", async () => {
    const { app } = buildAuthServer();
    const res = await app.inject({ method: "POST", url: "/auth/challenge", payload: { address: "nope" } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe("POST /auth/verify — Gem", () => {
  it("délivre un token utilisable pour une preuve GemWallet valide", async () => {
    const { app } = buildAuthServer();
    const { publicKey, privateKey } = deriveKeypair(ROOT_SEED);

    const challenge = await app.inject({ method: "POST", url: "/auth/challenge", payload: { address: ME } });
    const { nonce, message } = challenge.json();
    const signature = sign(Buffer.from(message, "utf8").toString("hex").toUpperCase(), privateKey);

    const verify = await app.inject({
      method: "POST",
      url: "/auth/verify",
      payload: { wallet: "gem", address: ME, nonce, signature, publicKey },
    });
    expect(verify.statusCode).toBe(200);
    const { token, address } = verify.json();
    expect(address).toBe(ME);

    // Le token délivré ouvre bien le compte.
    const ok = await app.inject({
      method: "GET",
      url: `/accounts/${ME}/orders`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(ok.statusCode).toBe(200);
    await app.close();
  });

  it("401 sur une signature invalide", async () => {
    const { app } = buildAuthServer();
    const { publicKey, privateKey } = deriveKeypair(ROOT_SEED);
    const challenge = await app.inject({ method: "POST", url: "/auth/challenge", payload: { address: ME } });
    const { nonce } = challenge.json();
    const signature = sign(Buffer.from("autre", "utf8").toString("hex").toUpperCase(), privateKey);
    const verify = await app.inject({
      method: "POST",
      url: "/auth/verify",
      payload: { wallet: "gem", address: ME, nonce, signature, publicKey },
    });
    expect(verify.statusCode).toBe(401);
    await app.close();
  });
});

describe("POST /auth/verify — Xaman", () => {
  it("délivre un token quand le payload SignIn est signé", async () => {
    const xaman: XamanPayloadApi = {
      create: async () => null,
      get: async () => ({ resolved: true, signed: true, account: ME, txid: null }),
    };
    const { app } = buildAuthServer(xaman);
    const res = await app.inject({ method: "POST", url: "/auth/verify", payload: { wallet: "xaman", uuid: "u1" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().address).toBe(ME);
    await app.close();
  });

  it("501 quand l'auth Xaman n'est pas configurée", async () => {
    const { app } = buildAuthServer();
    const res = await app.inject({ method: "POST", url: "/auth/verify", payload: { wallet: "xaman", uuid: "u1" } });
    expect(res.statusCode).toBe(501);
    await app.close();
  });
});
