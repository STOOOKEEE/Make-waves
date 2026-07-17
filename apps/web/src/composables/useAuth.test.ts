import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";
import type { TideClient } from "@tide/client";

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

  it("restore réinjecte un token persisté dans le client", () => {
    localStorage.setItem("tide.sessionToken", "jwt-old");
    const client = fakeClient();
    useAuth(client).restore();
    expect(client.setToken).toHaveBeenCalledWith("jwt-old");
  });

  it("clear purge le token et le retire du client", () => {
    localStorage.setItem("tide.sessionToken", "jwt-old");
    const client = fakeClient();
    useAuth(client).clear();
    expect(localStorage.getItem("tide.sessionToken")).toBeNull();
    expect(client.setToken).toHaveBeenCalledWith(null);
  });
});
