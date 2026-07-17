import { beforeEach, describe, it, expect } from "vitest";
import { TideClient } from "@tide/client";
import type { ApiResponse, ApiTransport } from "@tide/client";
import { usePaper } from "../src/composables/usePaper";
import { useLeaderboard } from "../src/composables/useLeaderboard";
import { useCompetitions } from "../src/composables/useCompetitions";
import { useSession } from "../src/composables/useSession";

const XRP_ACCOUNT = "rPaperUser11111111111111111111111111111";

beforeEach(() => {
  useSession().disconnectWallet();
  localStorage.clear();
});

function clientWith(routes: Record<string, ApiResponse>): TideClient {
  const transport: ApiTransport = (request) =>
    Promise.resolve(
      routes[`${request.method} ${request.path}`] ??
        (request.method === "GET" && request.path.endsWith("/paper-wallet")
          ? {
              status: 200,
              body: {
                walletAddress: null,
                walletStatus: "not_created",
                fundingTxHash: null,
                rewardStatus: "not_earned",
                nftTokenId: null,
                claimTxHash: null,
              },
            }
          : { status: 404, body: { error: "introuvable" } }),
    );
  return new TideClient(transport);
}

const FILL = {
  pair: { base: "XRP", quote: "RLUSD" },
  side: "buy",
  amount: 100,
  price: 0.5,
  quoteAmount: 50,
};

describe("usePaper", () => {
  it("connecte et charge soldes + ordres", async () => {
    const paper = usePaper(
      clientWith({
        "POST /accounts/ensure": {
          status: 200,
          body: { userId: XRP_ACCOUNT, created: true },
        },
        [`GET /accounts/${XRP_ACCOUNT}/balances`]: { status: 200, body: { RLUSD: 10000 } },
        [`GET /accounts/${XRP_ACCOUNT}/orders`]: { status: 200, body: [] },
      }),
    );
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    await paper.connect();
    expect(paper.connected.value).toBe(true);
    expect(paper.balances.value).toEqual({ RLUSD: 10000 });
  });

  it("tolère un compte déjà existant via ensureAccount", async () => {
    const paper = usePaper(
      clientWith({
        "POST /accounts/ensure": {
          status: 200,
          body: { userId: XRP_ACCOUNT, created: false },
        },
        [`GET /accounts/${XRP_ACCOUNT}/balances`]: { status: 200, body: { RLUSD: 5 } },
        [`GET /accounts/${XRP_ACCOUNT}/orders`]: { status: 200, body: [] },
      }),
    );
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    await paper.connect();
    expect(paper.connected.value).toBe(true);
    expect(paper.error.value).toBe("");
  });

  it("crée une session anonyme sans exiger de wallet XRP", async () => {
    const userId = "paper:anonymous-test";
    const paper = usePaper(clientWith({
      "POST /auth/paper": { status: 200, body: { token: "jwt-paper", userId } },
      "POST /accounts/ensure": { status: 200, body: { userId, created: true } },
      [`GET /accounts/${encodeURIComponent(userId)}/balances`]: {
        status: 200,
        body: { RLUSD: 10_000 },
      },
      [`GET /accounts/${encodeURIComponent(userId)}/orders`]: { status: 200, body: [] },
    }));
    await paper.connect();
    expect(paper.connected.value).toBe(true);
    expect(paper.userId.value).toBe(userId);
    expect(paper.balances.value).toEqual({ RLUSD: 10_000 });
  });

  it("place un ordre puis rafraîchit", async () => {
    const paper = usePaper(
      clientWith({
        "POST /accounts/ensure": {
          status: 200,
          body: { userId: XRP_ACCOUNT, created: true },
        },
        [`GET /accounts/${XRP_ACCOUNT}/balances`]: { status: 200, body: { RLUSD: 9950, XRP: 100 } },
        [`GET /accounts/${XRP_ACCOUNT}/orders`]: { status: 200, body: [FILL] },
        [`POST /accounts/${XRP_ACCOUNT}/orders`]: { status: 201, body: FILL },
      }),
    );
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    await paper.connect();
    await paper.placeOrder({
      pair: { base: "XRP", quote: "RLUSD" },
      side: "buy",
      amount: 100,
      price: 0.5,
    });
    expect(paper.orders.value).toHaveLength(1);
    expect(paper.balances.value).toEqual({ RLUSD: 9950, XRP: 100 });
  });

  it("expose le message d'erreur serveur", async () => {
    const paper = usePaper(
      clientWith({
        "POST /accounts/ensure": {
          status: 200,
          body: { userId: XRP_ACCOUNT, created: true },
        },
        [`GET /accounts/${XRP_ACCOUNT}/balances`]: { status: 500, body: { error: "Erreur interne" } },
        [`GET /accounts/${XRP_ACCOUNT}/orders`]: { status: 200, body: [] },
      }),
    );
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    await paper.connect();
    expect(paper.connected.value).toBe(false);
    expect(paper.error.value).toBe("Erreur interne");
  });
});

describe("useLeaderboard", () => {
  it("charge le classement", async () => {
    const board = useLeaderboard(
      clientWith({
        "GET /leaderboard": {
          status: 200,
          body: [{ userId: "a", equity: 1000, pnl: 0, rank: 1 }],
        },
      }),
    );
    await board.load();
    expect(board.entries.value).toHaveLength(1);
    expect(board.entries.value[0]?.userId).toBe("a");
  });
});

describe("useCompetitions", () => {
  it("crée puis inscrit un joueur", async () => {
    const comp = useCompetitions(
      clientWith({
        "POST /competitions": { status: 201, body: { id: "c1" } },
        "POST /competitions/c1/join": {
          status: 200,
          body: { competitionId: "c1", userId: "a" },
        },
        "GET /competitions/c1/participants": { status: 200, body: ["a"] },
      }),
    );
    expect(
      await comp.create({ id: "c1", buyIn: 10, rakeRatio: 0, payoutWeights: [1] }),
    ).toBe(true);
    await comp.join("c1", "a");
    expect(comp.participants.value).toEqual(["a"]);
  });

  it("clôture et expose le résultat", async () => {
    const comp = useCompetitions(
      clientWith({
        "POST /competitions/c1/close": {
          status: 200,
          body: { payouts: [], undistributed: 0 },
        },
      }),
    );
    await comp.close("c1");
    expect(comp.lastResult.value).toEqual({ payouts: [], undistributed: 0 });
  });

  it("remonte l'erreur de création", async () => {
    const comp = useCompetitions(
      clientWith({
        "POST /competitions": { status: 400, body: { error: "poids invalides" } },
      }),
    );
    expect(
      await comp.create({ id: "c1", buyIn: 10, rakeRatio: 0, payoutWeights: [0.5] }),
    ).toBe(false);
    expect(comp.error.value).toBe("poids invalides");
  });
});
