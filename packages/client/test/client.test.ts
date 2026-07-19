import { describe, it, expect } from "vitest";
import { TideClient } from "../src/client";
import { extractErrorMessage } from "../src/errors";
import type { ApiRequest, ApiResponse, ApiTransport } from "../src/transport";
import type { MarketOrderInput, OpenPositionInput } from "@tide/core";

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
  it("authPaper -> POST /auth/paper (200)", async () => {
    const { client, requests } = stub(() => ({
      status: 200,
      body: { token: "jwt", userId: "paper:u1" },
    }));
    expect(await client.authPaper()).toEqual({ token: "jwt", userId: "paper:u1" });
    expect(requests[0]).toEqual({ path: "/auth/paper", method: "POST" });
  });

  it("authRefreshPaper -> POST /auth/paper/refresh avec le JWT courant", async () => {
    const { client, requests } = stub(() => ({
      status: 200,
      body: { token: "jwt-next", userId: "paper:u1" },
    }));
    client.setToken("jwt-old");

    expect(await client.authRefreshPaper()).toEqual({ token: "jwt-next", userId: "paper:u1" });
    expect(requests[0]).toEqual({
      path: "/auth/paper/refresh",
      method: "POST",
      headers: { authorization: "Bearer jwt-old" },
    });
  });

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

  it("bookDepth -> GET /book/:base/:quote?limit=8 (200)", async () => {
    const depth = {
      symbol: "XRP",
      quoteSymbol: "USDT",
      source: "Binance",
      asks: [{ price: 0.5, size: 100, total: 100 }],
      bids: [{ price: 0.49, size: 120, total: 120 }],
      mid: 0.495,
      spread: 0.0202,
    };
    const { client, requests } = stub(() => ({ status: 200, body: depth }));
    expect(await client.bookDepth("XRP")).toEqual(depth);
    expect(requests[0]).toEqual({
      path: "/book/XRP?limit=8",
      method: "GET",
    });
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

  it("weeklyRewards et claimWeeklyReward utilisent les routes dédiées", async () => {
    const { client, requests } = stub((request) => ({
      status: 200,
      body:
        request.method === "GET"
          ? []
          : { week: "2026-07-13", qualifiedAt: 1, status: "claimed", nftTokenId: "N", claimedAt: 2 },
    }));
    await client.weeklyRewards("paper:u1");
    await client.claimWeeklyReward("paper:u1", "2026-07-13");
    expect(requests).toEqual([
      { path: "/accounts/paper%3Au1/weekly-rewards", method: "GET" },
      {
        path: "/weekly-rewards/2026-07-13/claim",
        method: "POST",
        body: { userId: "paper:u1" },
      },
    ]);
  });

  it("paperWalletStatus lit uniquement le statut public du wallet technique", async () => {
    const status = {
      walletAddress: "rTest",
      walletStatus: "funded" as const,
      fundingTxHash: "FUND",
      rewardStatus: "claimed" as const,
      nftTokenId: "NFT",
      claimTxHash: "CLAIM",
    };
    const { client, requests } = stub(() => ({ status: 200, body: status }));
    expect(await client.paperWalletStatus("paper:u1")).toEqual(status);
    expect(requests[0]).toEqual({
      path: "/accounts/paper%3Au1/paper-wallet",
      method: "GET",
    });
  });

  it("openPosition -> POST /accounts/:id/positions (201)", async () => {
    const position = {
      id: "p1",
      product: "perp",
      symbol: "XRP",
      side: "long",
      qty: 200,
      entry: 0.5,
      leverage: 5,
      margin: 20,
      fee: 0,
    };
    const { client, requests } = stub(() => ({ status: 201, body: position }));
    const input: OpenPositionInput = {
      product: "perp",
      symbol: "XRP",
      side: "long",
      qty: 200,
      entry: 0.5,
      leverage: 5,
      margin: 20,
      fee: 0,
    };
    expect(await client.openPosition("a", input)).toEqual(position);
    expect(requests[0]).toEqual({
      path: "/accounts/a/positions",
      method: "POST",
      body: input,
    });
  });

  it("positions -> GET /accounts/:id/positions (200)", async () => {
    const { client, requests } = stub(() => ({ status: 200, body: [] }));
    expect(await client.positions("a")).toEqual([]);
    expect(requests[0]).toEqual({ path: "/accounts/a/positions", method: "GET" });
  });

  it("perpOrders -> GET /accounts/:id/perp-orders (200)", async () => {
    const { client, requests } = stub(() => ({ status: 200, body: [] }));
    expect(await client.perpOrders("a")).toEqual([]);
    expect(requests[0]).toEqual({ path: "/accounts/a/perp-orders", method: "GET" });
  });

  it("closePosition -> POST /accounts/:id/positions/:pid/close (200)", async () => {
    const result = {
      position: {
        id: "p1",
        product: "perp",
        symbol: "XRP",
        side: "long",
        qty: 200,
        entry: 0.5,
        leverage: 5,
        margin: 20,
        fee: 0,
      },
      realizedPnl: 20,
    };
    const { client, requests } = stub(() => ({ status: 200, body: result }));
    expect(await client.closePosition("a", "p1")).toEqual(result);
    expect(requests[0]).toEqual({
      path: "/accounts/a/positions/p1/close",
      method: "POST",
    });
  });

  it("competitionLeaderboard -> GET /competitions/:id/leaderboard", async () => {
    const { client, requests } = stub(() => ({ status: 200, body: [] }));
    expect(await client.competitionLeaderboard("c1")).toEqual([]);
    expect(requests[0]).toEqual({ path: "/competitions/c1/leaderboard", method: "GET" });
  });

  it("metrics -> GET /metrics (200)", async () => {
    const metrics = { totalVolume: 1234, activeAccounts: 7, txCount: 9 };
    const { client, requests } = stub(() => ({ status: 200, body: metrics }));
    expect(await client.metrics()).toEqual(metrics);
    expect(requests[0]).toEqual({ path: "/metrics", method: "GET" });
  });

  it("signCompetitionEntry dérive le ticket côté serveur", async () => {
    const sign = {
      uuid: "u-1",
      signUrl: "https://xumm.app/sign/u-1",
      qrPng: "https://xumm.app/qr/u-1.png",
    };
    const { client, requests } = stub(() => ({ status: 201, body: sign }));
    expect(await client.signCompetitionEntry("cup", "rAcc")).toEqual(sign);
    expect(requests[0]).toEqual({
      path: "/competitions/cup/entry/xaman",
      method: "POST",
      body: { account: "rAcc" },
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

describe("TideClient badges", () => {
  it("badges -> GET /accounts/:id/badges", async () => {
    const { client, requests } = stub(() => ({ status: 200, body: [] }));
    expect(await client.badges("u1")).toEqual([]);
    expect(requests[0]?.path).toBe("/accounts/u1/badges");
    expect(requests[0]?.method).toBe("GET");
  });

  it("claimBadge -> POST /badges/:code/claim avec le wallet", async () => {
    const acceptTx = {
      TransactionType: "NFTokenAcceptOffer",
      Account: "rWallet",
      NFTokenSellOffer: "OFF1",
      SourceTag: 2606210009,
    };
    const { client, requests } = stub(() => ({
      status: 200,
      body: { sellOfferId: "OFF1", nftTokenId: "NFT1", acceptTx },
    }));
    const res = await client.claimBadge("u1", "first_trade", "rWallet");
    expect(res).toEqual({ sellOfferId: "OFF1", nftTokenId: "NFT1", acceptTx });
    expect(requests[0]).toEqual({
      path: "/badges/first_trade/claim",
      method: "POST",
      body: { userId: "u1", walletAddress: "rWallet" },
    });
  });

  it("confirmBadgeClaim -> POST .../confirm avec txHash optionnel", async () => {
    const { client, requests } = stub(() => ({ status: 200, body: { ok: true } }));
    await client.confirmBadgeClaim("u1", "first_trade", "HASH");
    expect(requests[0]).toEqual({
      path: "/badges/first_trade/claim/confirm",
      method: "POST",
      body: { userId: "u1", txHash: "HASH" },
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
