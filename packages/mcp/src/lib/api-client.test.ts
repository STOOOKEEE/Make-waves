import { afterEach, describe, expect, it, vi } from "vitest";
import { TideApiHttp } from "./api-client";

interface FetchCall {
  readonly url: string;
  readonly headers: Record<string, string>;
}

function stubFetch(): FetchCall[] {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(
    async (url: string, init: { headers: Record<string, string> }) => {
      calls.push({ url, headers: init.headers });
      return {
        ok: true,
        status: 200,
        json: async () => ({ symbol: "XRP", price: 1, change24h: null, volume24h: null, timestamp: 0 }),
        text: async () => "",
      };
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TideApiHttp — authToken", () => {
  it("envoie Authorization: Bearer quand authToken est fourni", async () => {
    const calls = stubFetch();
    const api = new TideApiHttp({ baseUrl: "http://x", userId: "u", agentId: "a", authToken: "jwt-123" });
    await api.getMarket("XRP");
    expect(calls[0]?.headers.authorization).toBe("Bearer jwt-123");
  });

  it("n'envoie pas d'Authorization sans authToken", async () => {
    const calls = stubFetch();
    const api = new TideApiHttp({ baseUrl: "http://x", userId: "u", agentId: "a" });
    await api.getMarket("XRP");
    expect(calls[0]?.headers.authorization).toBeUndefined();
  });
});
