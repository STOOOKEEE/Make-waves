import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TideApiHttp,
  TideApiHttpError,
  httpPriceFeed,
  httpPaperBackend,
  httpTradingBackend,
  httpPerpBackend,
  httpCompetitionBackend,
  httpAgentActionsStore,
} from "../src/lib/api-client";

const ORIGINAL_FETCH = globalThis.fetch;

describe("TideApiHttp", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("builds URLs with query strings and threads X-Tide-User-Id", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ usd: 1, change24h: 0, volume24h: 0 }));
    const api = new TideApiHttp({ baseUrl: "https://api.example/", userId: "u1", agentId: "a1" });
    await api.getMarket("BTC");
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe("https://api.example/prices/BTC");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-tide-user-id"]).toBe("u1");
    expect(headers["x-tide-agent-id"]).toBe("a1");
  });

  it("returns null on 404 for getMarket", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u", agentId: "a" });
    expect(await api.getMarket("XYZ")).toBeNull();
  });

  it("throws TideApiHttpError on 500", async () => {
    fetchMock.mockResolvedValueOnce(new Response("server down", { status: 500 }));
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u", agentId: "a" });
    await expect(api.getMarket("BTC")).rejects.toBeInstanceOf(TideApiHttpError);
  });

  it("traduit l'ordre MCP en MarketOrderInput du domaine (pair/amount/price)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        pair: { base: "BTC", quote: "RLUSD" },
        side: "buy",
        amount: 0.1,
        price: 60000,
        quoteAmount: 6000,
      }),
    );
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u", agentId: "a" });
    await api.placeOrder({
      symbol: "BTC", side: "buy", qty: 0.1, type: "market", price: 60000,
    });
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const [url, init] = call;
    expect(url).toBe("https://x/accounts/u/orders");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      pair: { base: "BTC", quote: "RLUSD" },
      side: "buy",
      amount: 0.1,
      price: 60000,
    });
  });

  it("exige un prix (la route paper valorise au prix fourni)", async () => {
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u", agentId: "a" });
    await expect(
      api.placeOrder({ symbol: "BTC", side: "buy", qty: 0.1, type: "market" }),
    ).rejects.toBeInstanceOf(TideApiHttpError);
  });
});

describe("httpPriceFeed adapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("maps /api/prices/BTC response to { usd, change24h, volume24h }", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      symbol: "BTC", price: 60000, change24h: 1.5, volume24h: 1000, timestamp: 1700000000,
    }));
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u", agentId: "a" });
    const feed = httpPriceFeed(api);
    const result = await feed.priceOf("btc"); // lower-cased on purpose, must uppercase
    expect(result).toEqual({ usd: 60000, change24h: 1.5, volume24h: 1000 });
  });

  it("returns null on 404", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u", agentId: "a" });
    const feed = httpPriceFeed(api);
    expect(await feed.priceOf("XYZ")).toBeNull();
  });
});

describe("httpPaperBackend adapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("getBalance forwards userId (plural balances route)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ XRP: 100, RLUSD: 50 }));
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u1", agentId: "a" });
    const paper = httpPaperBackend(api);
    const balances = await paper.getBalance("u42");
    expect(balances).toEqual({ XRP: 100, RLUSD: 50 });
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const [url] = call;
    expect(url).toBe("https://x/accounts/u42/balances");
  });
});

describe("httpTradingBackend adapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("placeOrder re-mappe le Fill du domaine vers le shape MCP", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        pair: { base: "BTC", quote: "RLUSD" },
        side: "buy",
        amount: 0.1,
        price: 60000,
        quoteAmount: 6000,
      }),
    );
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u", agentId: "a" });
    const trading = httpTradingBackend(api);
    const result = await trading.placeOrder({
      userId: "u42", symbol: "BTC", side: "buy", qty: 0.1, type: "market",
      price: 60000, clientOrderId: "idem-1",
    });
    expect(result).toEqual({
      orderId: "idem-1", status: "filled", filledQty: 0.1, avgPrice: 60000,
    });
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, init] = call;
    expect(init.method).toBe("POST");
  });
});

describe("httpPerpBackend adapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("openPosition traduit le contrat MCP en OpenPositionInput domaine (entry/margin/fee)", async () => {
    // 1er appel = GET prix (résolution de l'entry), 2e = POST position domaine.
    fetchMock.mockResolvedValueOnce(jsonResponse({ symbol: "BTC", price: 60000 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "p1", entry: 60000 }));
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u", agentId: "a" });
    const perp = httpPerpBackend(api);
    const result = await perp.openPosition({
      userId: "u42", symbol: "BTC", side: "long", qty: 0.1, leverage: 3,
    });
    // Body POST : shape domaine complet (product/entry/margin/fee dérivés).
    const postBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as Record<string, unknown>;
    expect(postBody).toMatchObject({
      product: "perp",
      symbol: "BTC",
      side: "long",
      qty: 0.1,
      entry: 60000,
      leverage: 3,
    });
    // marge = notionnel/levier = 0.1*60000/3 = 2000 ; fee = notionnel*0.0006 = 3.6.
    expect(postBody["margin"]).toBeCloseTo(2000);
    expect(postBody["fee"]).toBeCloseTo(3.6);
    // Retour re-mappé + liquidation indicative (long : 60000*(1-1/3) = 40000).
    expect(result.positionId).toBe("p1");
    expect(result.entryPrice).toBe(60000);
    expect(result.liquidationPrice).toBeCloseTo(40000);
  });
});

describe("httpCompetitionBackend adapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("join returns { txJson } shape (per CompetitionBackend interface)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ txJson: { TransactionType: "Payment" } }));
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u1", agentId: "a" });
    const comp = httpCompetitionBackend(api);
    const result = await comp.join("u42", "comp-1");
    expect(result.txJson).toEqual({ TransactionType: "Payment" });
  });
});

describe("httpAgentActionsStore adapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("record POSTs action", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = new TideApiHttp({ baseUrl: "https://x", userId: "u", agentId: "a" });
    const store = httpAgentActionsStore(api);
    await store.record({
      id: "action-1",
      agentId: "a1",
      userId: "u1",
      toolName: "place_order",
      toolParams: "{}",
      result: "{}",
      error: null,
      idempotencyKey: null,
      executedAt: Date.now(),
    });
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, init] = call;
    expect(init.method).toBe("POST");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}