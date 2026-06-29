import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { TideApiError, TideClient } from "@tide/client";
import type { ApiTransport } from "@tide/client";
import type { CexFeedConfig, FetchJson } from "../src/feed/cex-price-feed";
import type { Competition } from "@tide/core";

const FEED: CexFeedConfig = {
  baseUrl: "https://cex.test/v3",
  symbolToId: { XRP: "ripple" },
  vsCurrency: "usd",
};
const priceFetch: FetchJson = () => Promise.resolve({ ripple: { usd: 0.5 } });

/** Branche le client sur le vrai serveur via inject() (aucun réseau, prix chargés). */
async function makeClient(): Promise<TideClient> {
  const built = createApp({ feed: FEED, symbols: ["XRP"], fetchJson: priceFetch });
  await built.refreshPrices();
  const transport: ApiTransport = async (request) => {
    const response = await built.app.inject({
      method: request.method,
      url: request.path,
      ...(request.body !== undefined
        ? { payload: request.body as object }
        : {}),
    });
    return { status: response.statusCode, body: response.json() };
  };
  return new TideClient(transport);
}

describe("TideClient ↔ serveur réel (contrat de bout en bout)", () => {
  it("déroule le flux complet comptes + ordres + leaderboard", async () => {
    const client = await makeClient();
    await client.openAccount("alice");
    expect(await client.balances("alice")).toEqual({ RLUSD: 10_000 });

    const fill = await client.placeOrder("alice", {
      pair: { base: "XRP", quote: "RLUSD" },
      side: "buy",
      amount: 100,
      price: 0.5,
    });
    expect(fill.quoteAmount).toBe(50);
    expect(await client.balances("alice")).toEqual({ RLUSD: 9950, XRP: 100 });
    expect(await client.orders("alice")).toHaveLength(1);

    const board = await client.leaderboard();
    expect(board[0]?.userId).toBe("alice");
  });

  it("déroule le flux compétitions (create/join/participants/close)", async () => {
    const client = await makeClient();
    const competition: Competition = {
      id: "c1",
      buyIn: 10,
      rakeRatio: 0,
      payoutWeights: [1],
    };
    expect(await client.createCompetition(competition)).toEqual({ id: "c1" });

    await client.openAccount("a");
    await client.joinCompetition("c1", "a");
    expect(await client.participants("c1")).toEqual(["a"]);

    const result = await client.closeCompetition("c1");
    expect(result.payouts).toHaveLength(1);
  });

  it("expose le portefeuille agrégé (soldes valorisés + equity + pnl)", async () => {
    const client = await makeClient();
    await client.openAccount("alice");
    await client.placeOrder("alice", {
      pair: { base: "XRP", quote: "RLUSD" },
      side: "buy",
      amount: 100,
      price: 0.5,
    });
    const portfolio = await client.portfolio("alice");
    // 9950 RLUSD + 100 XRP @0.5 = 10000 -> pnl 0 (capital de départ 10000)
    expect(portfolio.equity).toBeCloseTo(10_000);
    expect(portfolio.pnl).toBeCloseTo(0);
    const xrp = portfolio.holdings.find((h) => h.currency === "XRP");
    expect(xrp?.value).toBeCloseTo(50);
  });

  it("expose la carte de prix courante", async () => {
    const client = await makeClient();
    expect(await client.prices()).toEqual({ XRP: 0.5 });
  });

  it("liste les compétitions avec leur état live (participants, pot)", async () => {
    const client = await makeClient();
    await client.createCompetition({
      id: "c1",
      buyIn: 10,
      rakeRatio: 0,
      payoutWeights: [1],
    });
    const before = await client.competition("c1");
    expect(before).toMatchObject({ participants: 0, pot: 0, closed: false });

    await client.openAccount("a");
    await client.joinCompetition("c1", "a");
    const after = await client.competition("c1");
    expect(after).toMatchObject({ participants: 1, pot: 10 });

    expect((await client.competitions()).map((c) => c.id)).toEqual(["c1"]);
    await expect(client.competition("inconnu")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("mappe une erreur serveur en TideApiError", async () => {
    const client = await makeClient();
    await client.openAccount("dup");
    await expect(client.openAccount("dup")).rejects.toBeInstanceOf(TideApiError);
    await expect(client.balances("inconnu")).rejects.toMatchObject({
      status: 404,
    });
  });
});
