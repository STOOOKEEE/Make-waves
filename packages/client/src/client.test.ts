import { describe, expect, it } from "vitest";
import { TideClient } from "./client";
import type { ApiRequest, ApiResponse } from "./transport";

describe("TideClient.adminOverview", () => {
  it("appelle GET /admin/overview avec le header x-admin-token", async () => {
    let seen: ApiRequest | undefined;
    const transport = async (req: ApiRequest): Promise<ApiResponse> => {
      seen = req;
      return {
        status: 200,
        body: {
          totals: {
            users: 0,
            bySegment: { operator: 0, frontend: 0, agent: 0 },
            agents: { total: 0, active: 0, paused: 0, stopped: 0 },
            wallets: 0,
          },
          users: [],
          agents: [],
          wallets: [],
        },
      };
    };
    const client = new TideClient(transport);

    const overview = await client.adminOverview("secret");

    expect(seen?.path).toBe("/admin/overview");
    expect(seen?.method).toBe("GET");
    expect(seen?.headers).toEqual({ "x-admin-token": "secret" });
    expect(overview.totals.users).toBe(0);
  });
});

describe("TideClient — authentification", () => {
  function capture(): { seen: ApiRequest | undefined; transport: (r: ApiRequest) => Promise<ApiResponse> } {
    const box: { seen: ApiRequest | undefined } = { seen: undefined };
    const transport = async (req: ApiRequest): Promise<ApiResponse> => {
      box.seen = req;
      return { status: 200, body: { nonce: "n", message: "m", token: "jwt", address: "rX" } };
    };
    return { get seen() { return box.seen; }, transport };
  }

  it("attache Authorization: Bearer une fois le token posé", async () => {
    const cap = capture();
    const client = new TideClient(cap.transport);
    client.setToken("jwt-123");
    await client.prices();
    expect(cap.seen?.headers?.authorization).toBe("Bearer jwt-123");
  });

  it("n'attache aucun Authorization sans token", async () => {
    const cap = capture();
    const client = new TideClient(cap.transport);
    await client.prices();
    expect(cap.seen?.headers?.authorization).toBeUndefined();
  });

  it("authChallenge poste l'adresse sur /auth/challenge", async () => {
    const cap = capture();
    const client = new TideClient(cap.transport);
    const res = await client.authChallenge("rX");
    expect(cap.seen?.path).toBe("/auth/challenge");
    expect(cap.seen?.method).toBe("POST");
    expect(cap.seen?.body).toEqual({ address: "rX" });
    expect(res.nonce).toBe("n");
  });

  it("authVerifyGem poste la preuve et renvoie le token", async () => {
    const cap = capture();
    const client = new TideClient(cap.transport);
    const res = await client.authVerifyGem({ address: "rX", nonce: "n", signature: "s", publicKey: "p" });
    expect(cap.seen?.path).toBe("/auth/verify");
    expect(cap.seen?.body).toEqual({ wallet: "gem", address: "rX", nonce: "n", signature: "s", publicKey: "p" });
    expect(res.token).toBe("jwt");
    expect(res.address).toBe("rX");
  });

  it("authVerifyXaman poste l'uuid", async () => {
    const cap = capture();
    const client = new TideClient(cap.transport);
    await client.authVerifyXaman("uuid-1");
    expect(cap.seen?.body).toEqual({ wallet: "xaman", uuid: "uuid-1" });
  });
});
