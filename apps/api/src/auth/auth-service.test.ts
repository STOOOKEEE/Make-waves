import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { deriveKeypair, sign } from "ripple-keypairs";
import { AuthError, AuthService, XamanNotConfiguredError } from "./auth-service";
import { InMemoryChallengeStore } from "./challenge-store";
import type { XamanPayloadApi } from "../xaman/sign-request";
import { InMemoryExternalIdentityStore } from "../store/external-identity-store";

const ROOT_SEED = "snoPBrXtMeMyMHUVTgbuqAfg1SUTb";
const ROOT_ADDRESS = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const OTHER_ADDRESS = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";
const SECRET = "test-secret";

function makeService(xaman?: XamanPayloadApi): AuthService {
  return new AuthService({
    secret: SECRET,
    ttlSeconds: 3600,
    challenges: new InMemoryChallengeStore(300_000),
    xaman,
  });
}

function signMessage(message: string, privateKey: string): string {
  return sign(Buffer.from(message, "utf8").toString("hex").toUpperCase(), privateKey);
}

describe("AuthService — JWT", () => {
  it("émet un token vérifiable dont le sub est l'adresse", () => {
    const svc = makeService();
    const token = svc.issueToken(ROOT_ADDRESS);
    expect(svc.verifyToken(`Bearer ${token}`)).toBe(ROOT_ADDRESS);
  });

  it("renvoie null pour un header absent ou un token invalide", () => {
    const svc = makeService();
    expect(svc.verifyToken(undefined)).toBeNull();
    expect(svc.verifyToken("Bearer pas-un-jwt")).toBeNull();
    expect(svc.verifyToken(svc.issueToken(ROOT_ADDRESS))).toBeNull(); // sans "Bearer "
  });

  it("rejette un token signé par un autre secret", () => {
    const other = new AuthService({
      secret: "autre-secret",
      ttlSeconds: 3600,
      challenges: new InMemoryChallengeStore(300_000),
    });
    const token = other.issueToken(ROOT_ADDRESS);
    expect(makeService().verifyToken(`Bearer ${token}`)).toBeNull();
  });

  it("renouvelle un JWT Paper expire sans changer son identite", () => {
    const svc = makeService();
    const expired = jwt.sign({}, SECRET, { subject: "paper:legacy-user", expiresIn: -1 });

    const refreshed = svc.refreshPaperSession(`Bearer ${expired}`);

    expect(refreshed.userId).toBe("paper:legacy-user");
    expect(svc.verifyToken(`Bearer ${refreshed.token}`)).toBe("paper:legacy-user");
  });

  it("refuse de renouveler un JWT de wallet Live", () => {
    const svc = makeService();
    expect(() => svc.refreshPaperSession(`Bearer ${svc.issueToken(ROOT_ADDRESS)}`)).toThrow(
      AuthError,
    );
  });
});

describe("AuthService — email/social", () => {
  it("rattache une identité au compte Paper puis le retrouve sans cookie Tide", async () => {
    const identities = new InMemoryExternalIdentityStore();
    const verifier = {
      verify: async () => ({
        issuer: "https://project.supabase.co",
        subject: "subject-1",
        provider: "email",
        email: "alice@example.com",
      }),
    };
    const svc = new AuthService({
      secret: SECRET,
      ttlSeconds: 3600,
      challenges: new InMemoryChallengeStore(300_000),
      external: { verifier, identities },
    });

    const first = await svc.loginExternal("external-access-token-long", "paper:original");
    const returning = await svc.loginExternal("external-access-token-long", null);

    expect(first.userId).toBe("paper:original");
    expect(returning.userId).toBe("paper:original");
    expect(svc.verifyToken(`Bearer ${returning.token}`)).toBe("paper:original");
  });

  it("refuse une nouvelle identité sans session Paper à lier", async () => {
    const svc = new AuthService({
      secret: SECRET,
      ttlSeconds: 3600,
      challenges: new InMemoryChallengeStore(300_000),
      external: {
        verifier: {
          verify: async () => ({
            issuer: "https://project.supabase.co",
            subject: "new-subject",
            provider: "x",
            email: null,
          }),
        },
        identities: new InMemoryExternalIdentityStore(),
      },
    });
    await expect(svc.loginExternal("external-access-token-long", null)).rejects.toThrow(AuthError);
  });
});

describe("AuthService.verifyGem", () => {
  it("valide une signature du challenge par la clé de l'adresse", () => {
    const svc = makeService();
    const { publicKey, privateKey } = deriveKeypair(ROOT_SEED);
    const { nonce, message } = svc.issueChallenge(ROOT_ADDRESS);
    const signature = signMessage(message, privateKey);

    const address = svc.verifyGem({ address: ROOT_ADDRESS, nonce, signature, publicKey });

    expect(address).toBe(ROOT_ADDRESS);
  });

  it("rejette une clé publique qui ne dérive pas l'adresse revendiquée", () => {
    // Attaque : signer un challenge d'une AUTRE adresse avec sa propre clé valide.
    const svc = makeService();
    const { publicKey, privateKey } = deriveKeypair(ROOT_SEED);
    const { nonce, message } = svc.issueChallenge(OTHER_ADDRESS);
    const signature = signMessage(message, privateKey);

    expect(() =>
      svc.verifyGem({ address: OTHER_ADDRESS, nonce, signature, publicKey }),
    ).toThrow(AuthError);
  });

  it("rejette une signature invalide", () => {
    const svc = makeService();
    const { publicKey, privateKey } = deriveKeypair(ROOT_SEED);
    const { nonce } = svc.issueChallenge(ROOT_ADDRESS);
    const signature = signMessage("message-non-challenge", privateKey);

    expect(() =>
      svc.verifyGem({ address: ROOT_ADDRESS, nonce, signature, publicKey }),
    ).toThrow(AuthError);
  });

  it("rejette un nonce déjà consommé (usage unique)", () => {
    const svc = makeService();
    const { publicKey, privateKey } = deriveKeypair(ROOT_SEED);
    const { nonce, message } = svc.issueChallenge(ROOT_ADDRESS);
    const signature = signMessage(message, privateKey);

    svc.verifyGem({ address: ROOT_ADDRESS, nonce, signature, publicKey });
    expect(() =>
      svc.verifyGem({ address: ROOT_ADDRESS, nonce, signature, publicKey }),
    ).toThrow(AuthError);
  });

  it("rejette une adresse mal formée", () => {
    const svc = makeService();
    expect(() =>
      svc.verifyGem({ address: "pas-une-adresse", nonce: "x", signature: "y", publicKey: "z" }),
    ).toThrow(AuthError);
  });
});

describe("AuthService.verifyXaman", () => {
  it("renvoie l'adresse d'un payload signé", async () => {
    const xaman: XamanPayloadApi = {
      create: async () => null,
      get: async () => ({ resolved: true, signed: true, account: ROOT_ADDRESS, txid: null }),
    };
    const address = await makeService(xaman).verifyXaman("uuid-1");
    expect(address).toBe(ROOT_ADDRESS);
  });

  it("rejette un payload non signé", async () => {
    const xaman: XamanPayloadApi = {
      create: async () => null,
      get: async () => ({ resolved: true, signed: false, account: null, txid: null }),
    };
    await expect(makeService(xaman).verifyXaman("uuid-1")).rejects.toThrow(AuthError);
  });

  it("lève XamanNotConfiguredError si Xaman n'est pas câblé", async () => {
    await expect(makeService().verifyXaman("uuid-1")).rejects.toThrow(XamanNotConfiguredError);
  });
});
