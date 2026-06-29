import { describe, it, expect } from "vitest";
import { TideClient } from "../src/client";
import { extractErrorMessage } from "../src/errors";
import type { ApiRequest, ApiResponse, ApiTransport } from "../src/transport";
import type { MarketOrderInput } from "@tide/core";

function stub(responder: (request: ApiRequest) => ApiResponse): {
  client: TideClient;
  requests: ApiRequest[];
} {
  const requests: ApiRequest[] = [];
  const transport: ApiTransport = (request) => {
    requests.push(request);
    return Promise.resolve(responder(request));
  };
  return { client: new TideClient(transport), requests };
}

describe("TideClient", () => {
  it("openAccount -> POST /accounts (201)", async () => {
    const { client, requests } = stub(() => ({ status: 201, body: { userId: "a" } }));
    expect(await client.openAccount("a")).toEqual({ userId: "a" });
    expect(requests[0]).toEqual({
      path: "/accounts",
      method: "POST",
      body: { userId: "a" },
    });
  });

  it("ensureAccount -> POST /accounts/ensure (200)", async () => {
    const { client, requests } = stub(() => ({
      status: 200,
      body: { userId: "a", created: false },
    }));
    expect(await client.ensureAccount("a")).toEqual({ userId: "a", created: false });
    expect(requests[0]).toEqual({
      path: "/accounts/ensure",
      method: "POST",
      body: { userId: "a" },
    });
  });

  it("balances -> GET et parse le corps", async () => {
    const { client, requests } = stub(() => ({ status: 200, body: { RLUSD: 1000 } }));
    expect(await client.balances("a")).toEqual({ RLUSD: 1000 });
    expect(requests[0]?.path).toBe("/accounts/a/balances");
    expect(requests[0]?.method).toBe("GET");
  });

  it("encode les segments de chemin", async () => {
    const { client, requests } = stub(() => ({ status: 200, body: {} }));
    await client.balances("a/b?x");
    expect(requests[0]?.path).toBe("/accounts/a%2Fb%3Fx/balances");
  });

  it("placeOrder -> POST /accounts/:id/orders (201)", async () => {
    const fill = {
      pair: { base: "XRP", quote: "RLUSD" },
      side: "buy",
      amount: 100,
      price: 0.5,
      quoteAmount: 50,
    };
    const { client, requests } = stub(() => ({ status: 201, body: fill }));
    const order: MarketOrderInput = {
      pair: { base: "XRP", quote: "RLUSD" },
      side: "buy",
      amount: 100,
      price: 0.5,
    };
    expect(await client.placeOrder("a", order)).toEqual(fill);
    expect(requests[0]).toEqual({
      path: "/accounts/a/orders",
      method: "POST",
      body: order,
    });
  });

  it("closeCompetition -> POST /competitions/:id/close (200)", async () => {
    const { client, requests } = stub(() => ({
      status: 200,
      body: { payouts: [], undistributed: 0 },
    }));
    expect(await client.closeCompetition("c1")).toEqual({
      payouts: [],
      undistributed: 0,
    });
    expect(requests[0]).toEqual({
      path: "/competitions/c1/close",
      method: "POST",
    });
  });

  it("metrics -> GET /metrics (200)", async () => {
    const metrics = { totalVolume: 1234, activeAccounts: 7, txCount: 9 };
    const { client, requests } = stub(() => ({ status: 200, body: metrics }));
    expect(await client.metrics()).toEqual(metrics);
    expect(requests[0]).toEqual({ path: "/metrics", method: "GET" });
  });

  it("signBuyIn -> POST /sign/buy-in (201) sans sourceTag (ajouté côté serveur)", async () => {
    const sign = {
      uuid: "u-1",
      signUrl: "https://xumm.app/sign/u-1",
      qrPng: "https://xumm.app/qr/u-1.png",
    };
    const { client, requests } = stub(() => ({ status: 201, body: sign }));
    expect(await client.signBuyIn("rAcc", "10000000", "cup")).toEqual(sign);
    expect(requests[0]).toEqual({
      path: "/sign/buy-in",
      method: "POST",
      body: { account: "rAcc", amount: "10000000", competitionId: "cup" },
    });
  });

  it("signLiveOffer -> POST /sign/live-offer (201) avec l'intention de swap", async () => {
    const sign = {
      uuid: "u-2",
      signUrl: "https://xumm.app/sign/u-2",
      qrPng: "https://xumm.app/qr/u-2.png",
    };
    const { client, requests } = stub(() => ({ status: 201, body: sign }));
    expect(await client.signLiveOffer("rAcc", "XRP", "buy", 100, 0.01)).toEqual(sign);
    expect(requests[0]).toEqual({
      path: "/sign/live-offer",
      method: "POST",
      body: { account: "rAcc", base: "XRP", side: "buy", amountBase: 100, slippageTolerance: 0.01 },
    });
  });

  it("planLiveOffer -> POST /exec/plan (201) renvoie le plan d'exécution", async () => {
    const plan = {
      offer: {
        TransactionType: "OfferCreate",
        Account: "rAcc",
        TakerGets: { currency: "RLUSD", issuer: "rIss", value: "50" },
        TakerPays: "100000000",
        SourceTag: 7777,
      },
      referencePrice: 0.5,
      limitPrice: 0.505,
      venue: "amm",
    };
    const { client, requests } = stub(() => ({ status: 201, body: plan }));
    expect(await client.planLiveOffer("rAcc", "XRP", "buy", 100, 0.01)).toEqual(plan);
    expect(requests[0]).toEqual({
      path: "/exec/plan",
      method: "POST",
      body: { account: "rAcc", base: "XRP", side: "buy", amountBase: 100, slippageTolerance: 0.01 },
    });
  });

  it("lève TideApiError avec le message extrait sur statut inattendu", async () => {
    const { client } = stub(() => ({
      status: 409,
      body: { error: "Compte déjà ouvert: a" },
    }));
    await expect(client.openAccount("a")).rejects.toMatchObject({
      status: 409,
      message: "Compte déjà ouvert: a",
    });
  });
});

describe("extractErrorMessage", () => {
  it("extrait le champ error", () => {
    expect(extractErrorMessage({ error: "boom" })).toBe("boom");
  });

  it("retourne un défaut si absent", () => {
    expect(extractErrorMessage(null)).toBe("Erreur API");
    expect(extractErrorMessage({})).toBe("Erreur API");
    expect(extractErrorMessage("texte")).toBe("Erreur API");
  });
});
