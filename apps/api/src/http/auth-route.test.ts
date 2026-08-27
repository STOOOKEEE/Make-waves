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
import { InMemoryExternalIdentityStore } from "../store/external-identity-store";
import { InMemoryWalletLinkStore } from "../store/wallet-link-store";
import type { ExternalIdentityVerifier } from "../auth/external-auth";
import type { XamanPayloadApi } from "../xaman/sign-request";

const ROOT_SEED = "snoPBrXtMeMyMHUVTgbuqAfg1SUTb";
const ME = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const OTHER = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";
const SECRET = "test-secret";

const NO_RESOLVERS: AuthzResolvers = {
  agentOwner: async () => null,
  mandateOwner: async () => null,
};

function buildAuthServer(
  xaman?: XamanPayloadApi,
  walletLinks = new InMemoryWalletLinkStore(),
) {
  const accounts = new InMemoryAccountStore();
  const paper = new PaperService(undefined, accounts);
  paper.openAccount(ME);
  const service = new AuthService({
    secret: SECRET,
    ttlSeconds: 3600,
    challenges: new InMemoryChallengeStore(300_000),
    xaman,
    walletLinks,
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

describe("POST /auth/paper", () => {
  it("crée une identité Paper serveur et un token qui protège son compte", async () => {
    const accounts = new InMemoryAccountStore();
    const paper = new PaperService(undefined, accounts);
    const service = new AuthService({
      secret: SECRET,
      ttlSeconds: 3600,
      challenges: new InMemoryChallengeStore(300_000),
      paperSessionId: () => "paper-session-test",
    });
    const app = buildServer({
      paper,
      competition: new CompetitionService(new InMemoryCompetitionStore()),
      getPrices: () => ({ XRP: 0.5 }),
      auth: { service, resolvers: NO_RESOLVERS },
    });

    const session = await app.inject({ method: "POST", url: "/auth/paper" });
    expect(session.statusCode).toBe(200);
    const { token, userId } = session.json();
    expect(userId).toBe("paper:paper-session-test");

    const ensured = await app.inject({
      method: "POST",
      url: "/accounts/ensure",
      headers: { authorization: `Bearer ${String(token)}` },
      payload: { userId },
    });
    expect(ensured.statusCode).toBe(200);
    expect(ensured.json().created).toBe(true);
    await app.close();
  });

  it("renouvelle la session et conserve le meme compte Paper", async () => {
    const { app, service } = buildAuthServer();
    const token = service.issueToken("paper:persistent-user");
    const refreshed = await app.inject({
      method: "POST",
      url: "/auth/paper/refresh",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().userId).toBe("paper:persistent-user");
    expect(service.verifyToken(`Bearer ${String(refreshed.json().token)}`)).toBe(
      "paper:persistent-user",
    );
    await app.close();
  });
});

describe("POST /auth/external", () => {
  it("lie la première connexion au compte Paper courant puis le retrouve sans cookie local", async () => {
    const verifier: ExternalIdentityVerifier = {
      verify: async () => ({
        issuer: "https://auth.example.test",
        subject: "external-user-1",
        provider: "x",
        email: "trader@example.test",
      }),
    };
    const service = new AuthService({
      secret: SECRET,
      ttlSeconds: 3600,
      challenges: new InMemoryChallengeStore(300_000),
      external: { verifier, identities: new InMemoryExternalIdentityStore() },
    });
    const paper = new PaperService(undefined, new InMemoryAccountStore());
    const app = buildServer({
      paper,
      competition: new CompetitionService(new InMemoryCompetitionStore()),
      getPrices: () => ({ XRP: 0.5 }),
      auth: { service, resolvers: NO_RESOLVERS },
    });
    const currentUserId = "paper:existing-session";
    const first = await app.inject({
      method: "POST",
      url: "/auth/external",
      headers: { authorization: `Bearer ${service.issueToken(currentUserId)}` },
      payload: { accessToken: "a".repeat(32) },
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      userId: currentUserId,
      provider: "x",
      email: "trader@example.test",
    });
    expect(service.verifyToken(`Bearer ${String(first.json().token)}`)).toBe(currentUserId);

    const recovered = await app.inject({
      method: "POST",
      url: "/auth/external",
      payload: { accessToken: "b".repeat(32) },
    });
    expect(recovered.statusCode).toBe(200);
    expect(recovered.json().userId).toBe(currentUserId);
    await app.close();
  });

  it("reste désactivé si le fournisseur d'identité n'est pas configuré", async () => {
    const { app } = buildAuthServer();
    const response = await app.inject({
      method: "POST",
      url: "/auth/external",
      payload: { accessToken: "a".repeat(32) },
    });
    expect(response.statusCode).toBe(501);
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

  it("ne lie le wallet qu'au compte Paper porté par le Bearer courant", async () => {
    const xaman: XamanPayloadApi = {
      create: async () => null,
      get: async () => ({ resolved: true, signed: true, account: ME, txid: null }),
    };
    const links = new InMemoryWalletLinkStore();
    const { app, service } = buildAuthServer(xaman, links);

    const valid = await app.inject({
      method: "POST",
      url: "/auth/verify",
      headers: { authorization: `Bearer ${service.issueToken("paper:owner")}` },
      payload: { wallet: "xaman", uuid: "valid", linkPaperUserId: "paper:owner" },
    });
    expect(valid.statusCode).toBe(200);
    expect(await links.getPaperUserId(ME)).toBe("paper:owner");

    const poisoned = await app.inject({
      method: "POST",
      url: "/auth/verify",
      headers: { authorization: `Bearer ${service.issueToken("paper:other")}` },
      payload: { wallet: "xaman", uuid: "poisoned", linkPaperUserId: "paper:owner" },
    });
    expect(poisoned.statusCode).toBe(200);
    expect(await links.getPaperUserId(ME)).toBe("paper:owner");
    await app.close();
  });

  it("501 quand l'auth Xaman n'est pas configurée", async () => {
    const { app } = buildAuthServer();
    const res = await app.inject({ method: "POST", url: "/auth/verify", payload: { wallet: "xaman", uuid: "u1" } });
    expect(res.statusCode).toBe(501);
    await app.close();
  });
});
