import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";
import { TideApiError, type TideClient } from "@tide/client";

beforeEach(() => {
  localStorage.clear();
});

function fakeClient(overrides: Partial<TideClient> = {}): TideClient {
  return {
    setToken: vi.fn(),
    authChallenge: vi.fn().mockResolvedValue({ nonce: "n", message: "msg" }),
    authVerifyGem: vi.fn().mockResolvedValue({ token: "jwt-gem", address: "rX" }),
    authVerifyXaman: vi.fn().mockResolvedValue({ token: "jwt-xaman", address: "rX" }),
    ...overrides,
  } as unknown as TideClient;
}

function sessionToken(subject: string, expiresAt: number): string {
  const encode = (value: object): string =>
    globalThis
      .btoa(JSON.stringify(value))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: subject, exp: expiresAt })}.signature`;
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

describe("useAuth", () => {
  it("réutilise la même identité Paper après reconstruction de l'app", async () => {
    const create = vi.fn().mockResolvedValue({
      token: "jwt-paper",
      userId: "paper:persistent-user",
    });
    const firstClient = fakeClient({ authPaper: create });
    expect(await useAuth(firstClient).ensurePaperSession()).toBe("paper:persistent-user");

    const unexpectedCreate = vi.fn();
    const refresh = vi.fn().mockResolvedValue({
      token: "jwt-paper-next",
      userId: "paper:persistent-user",
    });
    const reloadedClient = fakeClient({ authPaper: unexpectedCreate, authRefreshPaper: refresh });
    expect(await useAuth(reloadedClient).ensurePaperSession()).toBe("paper:persistent-user");
    expect(unexpectedCreate).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
    expect(reloadedClient.setToken).toHaveBeenCalledWith("jwt-paper-next");
  });

  it("déduplique la création Paper entre deux composables du même client", async () => {
    const pending = deferred<{ token: string; userId: string }>();
    const create = vi.fn().mockReturnValue(pending.promise);
    const client = fakeClient({ authPaper: create });

    const first = useAuth(client).ensurePaperSession();
    const second = useAuth(client).ensurePaperSession();
    expect(create).toHaveBeenCalledOnce();
    pending.resolve({ token: "jwt-shared", userId: "paper:shared" });

    await expect(first).resolves.toBe("paper:shared");
    await expect(second).resolves.toBe("paper:shared");
    expect(localStorage.getItem("tide.paperUserId")).toBe("paper:shared");
  });

  it("ne remplace pas un JWT wallet par une création Paper tardive", async () => {
    const pending = deferred<{ token: string; userId: string }>();
    const client = fakeClient({
      authPaper: vi.fn().mockReturnValue(pending.promise),
    });
    const auth = useAuth(client);

    const paper = auth.ensurePaperSession();
    await useAuth(client).loginXaman("uuid-wallet", "rX");
    pending.resolve({ token: "jwt-paper-late", userId: "paper:late" });
    await expect(paper).resolves.toBe("paper:late");

    expect(client.setToken).toHaveBeenLastCalledWith("jwt-xaman");
    expect(localStorage.getItem("tide.sessionToken")).toBe("jwt-xaman");
    expect(localStorage.getItem("tide.paperSessionToken")).toBe("jwt-paper-late");
  });

  it("remplace une session Paper que le serveur refuse comme invalide", async () => {
    localStorage.setItem("tide.paperUserId", "paper:obsolete");
    localStorage.setItem("tide.paperSessionToken", "jwt-obsolete");
    const create = vi.fn().mockResolvedValue({
      token: "jwt-paper-new",
      userId: "paper:new-user",
    });
    const client = fakeClient({
      authRefreshPaper: vi.fn().mockRejectedValue(
        new TideApiError(401, "session Paper invalide"),
      ),
      authPaper: create,
    });

    expect(await useAuth(client).ensurePaperSession()).toBe("paper:new-user");
    expect(create).toHaveBeenCalledOnce();
    expect(localStorage.getItem("tide.paperUserId")).toBe("paper:new-user");
    expect(localStorage.getItem("tide.paperSessionToken")).toBe("jwt-paper-new");
  });

  it("conserve la session Paper sur une panne non authentification", async () => {
    localStorage.setItem("tide.paperUserId", "paper:persistent-user");
    localStorage.setItem("tide.paperSessionToken", "jwt-paper");
    const create = vi.fn();
    const client = fakeClient({
      authRefreshPaper: vi.fn().mockRejectedValue(new Error("offline")),
      authPaper: create,
    });

    await expect(useAuth(client).ensurePaperSession()).rejects.toThrow("offline");
    expect(create).not.toHaveBeenCalled();
    expect(localStorage.getItem("tide.paperUserId")).toBe("paper:persistent-user");
  });

  it("réaligne l'identité Paper locale sur le JWT renouvelé par le serveur", async () => {
    localStorage.setItem("tide.paperUserId", "paper:stale-local-id");
    localStorage.setItem("tide.paperSessionToken", "jwt-valid-other-id");
    const client = fakeClient({
      authRefreshPaper: vi.fn().mockResolvedValue({
        token: "jwt-refreshed",
        userId: "paper:trusted-server-id",
      }),
    });

    expect(await useAuth(client).ensurePaperSession()).toBe("paper:trusted-server-id");
    expect(localStorage.getItem("tide.paperUserId")).toBe("paper:trusted-server-id");
    expect(localStorage.getItem("tide.paperSessionToken")).toBe("jwt-refreshed");
  });

  it("loginXaman vérifie l'uuid, pose et persiste le token", async () => {
    const client = fakeClient();
    const auth = useAuth(client);

    await auth.loginXaman("uuid-1");

    expect(client.authVerifyXaman).toHaveBeenCalledWith("uuid-1");
    expect(client.setToken).toHaveBeenCalledWith("jwt-xaman");
    expect(localStorage.getItem("tide.sessionToken")).toBe("jwt-xaman");
  });

  it("loginGem enchaîne challenge → signature → verify avec la bonne preuve", async () => {
    const client = fakeClient();
    const auth = useAuth(client);
    const sign = vi.fn().mockResolvedValue({ signature: "sig", publicKey: "pub" });

    await auth.loginGem("rX", sign);

    expect(client.authChallenge).toHaveBeenCalledWith("rX");
    expect(sign).toHaveBeenCalledWith("msg");
    expect(client.authVerifyGem).toHaveBeenCalledWith({
      address: "rX",
      nonce: "n",
      signature: "sig",
      publicKey: "pub",
    });
    expect(client.setToken).toHaveBeenCalledWith("jwt-gem");
    expect(localStorage.getItem("tide.sessionToken")).toBe("jwt-gem");
  });

  it("restore ne restaure le wallet que si le JWT est valide et porte la même adresse", () => {
    const token = sessionToken("rX", Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem("tide.sessionToken", token);
    const client = fakeClient();
    expect(useAuth(client).restore("rX")).toBe("wallet");
    expect(client.setToken).toHaveBeenCalledWith(token);
  });

  it("accepte un JWT encore valide même si son TTL est inférieur à 30 secondes", () => {
    const token = sessionToken("rX", Math.floor(Date.now() / 1000) + 10);
    localStorage.setItem("tide.sessionToken", token);
    const client = fakeClient();

    expect(useAuth(client).restore("rX")).toBe("wallet");
    expect(client.setToken).toHaveBeenCalledWith(token);
  });

  it("restore écarte un JWT wallet expiré et retombe sur la session Paper", () => {
    const expired = sessionToken("rX", Math.floor(Date.now() / 1000) - 1);
    localStorage.setItem("tide.sessionToken", expired);
    localStorage.setItem("tide.paperSessionToken", "jwt-paper");
    const client = fakeClient();

    expect(useAuth(client).restore("rX")).toBe("paper");
    expect(localStorage.getItem("tide.sessionToken")).toBeNull();
    expect(client.setToken).toHaveBeenCalledWith("jwt-paper");
  });

  it("restore refuse un JWT valide appartenant à un autre wallet", () => {
    const other = sessionToken("rOther", Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem("tide.sessionToken", other);
    const client = fakeClient();

    expect(useAuth(client).restore("rX")).toBe("none");
    expect(localStorage.getItem("tide.sessionToken")).toBeNull();
    expect(client.setToken).toHaveBeenCalledWith(null);
  });

  it("clear purge le token et le retire du client", () => {
    localStorage.setItem("tide.sessionToken", "jwt-old");
    const client = fakeClient();
    useAuth(client).clear();
    expect(localStorage.getItem("tide.sessionToken")).toBeNull();
    expect(client.setToken).toHaveBeenCalledWith(null);
  });

  it("logoutAll oublie les sessions wallet et Paper du navigateur", () => {
    localStorage.setItem("tide.sessionToken", "jwt-wallet");
    localStorage.setItem("tide.paperSessionToken", "jwt-paper");
    localStorage.setItem("tide.paperUserId", "paper:old-account");
    const client = fakeClient();

    useAuth(client).logoutAll();

    expect(localStorage.getItem("tide.sessionToken")).toBeNull();
    expect(localStorage.getItem("tide.paperSessionToken")).toBeNull();
    expect(localStorage.getItem("tide.paperUserId")).toBeNull();
    expect(client.setToken).toHaveBeenCalledWith(null);
  });

  it("logoutAll empêche une création Paper tardive de reconnecter le navigateur", async () => {
    const pending = deferred<{ token: string; userId: string }>();
    const client = fakeClient({ authPaper: vi.fn().mockReturnValue(pending.promise) });
    const auth = useAuth(client);
    const creation = auth.ensurePaperSession();

    auth.logoutAll();
    pending.resolve({ token: "jwt-too-late", userId: "paper:too-late" });

    await expect(creation).rejects.toThrow("session interrompue");
    expect(localStorage.getItem("tide.paperSessionToken")).toBeNull();
    expect(localStorage.getItem("tide.paperUserId")).toBeNull();
    expect(client.setToken).toHaveBeenLastCalledWith(null);
  });
});
