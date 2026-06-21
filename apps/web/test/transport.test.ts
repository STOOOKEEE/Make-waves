import { describe, it, expect } from "vitest";
import { createFetchTransport, type FetchLike } from "../src/lib/transport";

function spyFetch(status: number, body: unknown): {
  fetchLike: FetchLike;
  calls: { url: string; init: { method: string; body?: string } }[];
} {
  const calls: { url: string; init: { method: string; body?: string } }[] = [];
  const fetchLike: FetchLike = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve({ status, json: () => Promise.resolve(body) });
  };
  return { fetchLike, calls };
}

describe("createFetchTransport", () => {
  it("préfixe l'URL, sérialise le corps et retourne status + body", async () => {
    const { fetchLike, calls } = spyFetch(201, { ok: true });
    const transport = createFetchTransport("http://api", fetchLike);
    const res = await transport({
      path: "/accounts",
      method: "POST",
      body: { userId: "a" },
    });
    expect(res).toEqual({ status: 201, body: { ok: true } });
    expect(calls[0]?.url).toBe("http://api/accounts");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe(JSON.stringify({ userId: "a" }));
  });

  it("n'envoie pas de corps pour une requête GET", async () => {
    const { fetchLike, calls } = spyFetch(200, { RLUSD: 1000 });
    const transport = createFetchTransport("http://api", fetchLike);
    const res = await transport({ path: "/accounts/a/balances", method: "GET" });
    expect(res.body).toEqual({ RLUSD: 1000 });
    expect(calls[0]?.init.body).toBeUndefined();
  });
});
