import { beforeEach, describe, it, expect } from "vitest";
import { TideClient } from "@tide/client";
import type { ApiRequest, ApiResponse, ApiTransport } from "@tide/client";
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
  const transport: ApiTransport = (request) => {
    const configured = routes[`${request.method} ${request.path}`];
    if (configured !== undefined) {
      return Promise.resolve(configured);
    }
    if (request.method === "GET" && request.path.endsWith("/portfolio")) {
      return Promise.resolve({
        status: 200,
        body: { balances: {}, holdings: [], equity: 0, pnl: 0 },
      });
    }
    if (request.method === "GET" && request.path.endsWith("/paper-wallet")) {
      return Promise.resolve({
        status: 200,
        body: {
          walletAddress: null,
          walletStatus: "not_created",
          fundingTxHash: null,
          rewardWalletAddress: null,
          rewardWalletStatus: "not_created",
          rewardFundingTxHash: null,
          rewardFundingSourceAddress: null,
          rewardStatus: "not_earned",
          nftTokenId: null,
          claimTxHash: null,
        },
      });
    }
    return Promise.resolve({ status: 404, body: { error: "introuvable" } });
  };
  return new TideClient(transport);
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

function sessionToken(subject: string): string {
  const encode = (value: object): string =>
    globalThis
      .btoa(JSON.stringify(value))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.signature`;
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

  it("conserve le wallet si sa connexion aboutit pendant l'initialisation Paper", async () => {
    const walletAddress = "rWalletRace111111111111111111111111111";
    const walletToken = sessionToken(walletAddress);
    const authPaper = deferred<ApiResponse>();
    const protectedRequests: ApiRequest[] = [];
    const transport: ApiTransport = (request) => {
      if (request.method === "POST" && request.path === "/auth/paper") {
        return authPaper.promise;
      }
      protectedRequests.push(request);
      if (request.method === "POST" && request.path === "/accounts/ensure") {
        return Promise.resolve({ status: 200, body: { userId: walletAddress, created: true } });
      }
      if (request.path.endsWith("/balances")) {
        return Promise.resolve({ status: 200, body: { RLUSD: 10_000 } });
      }
      if (request.path.endsWith("/orders")) {
        return Promise.resolve({ status: 200, body: [] });
      }
      if (request.path.endsWith("/portfolio")) {
        return Promise.resolve({
          status: 200,
          body: { balances: {}, holdings: [], equity: 10_000, pnl: 0 },
        });
      }
      if (request.path.endsWith("/paper-wallet")) {
        return Promise.resolve({
          status: 200,
          body: {
            walletAddress: null,
            walletStatus: "not_created",
            fundingTxHash: null,
            rewardWalletAddress: null,
            rewardWalletStatus: "not_created",
            rewardFundingTxHash: null,
            rewardFundingSourceAddress: null,
            rewardStatus: "not_earned",
            nftTokenId: null,
            claimTxHash: null,
          },
        });
      }
      return Promise.resolve({ status: 404, body: { error: "introuvable" } });
    };
    const paper = usePaper(new TideClient(transport));

    const connecting = paper.connect();
    localStorage.setItem("tide.sessionToken", walletToken);
    useSession().setWallet(walletAddress, "xaman");
    authPaper.resolve({
      status: 200,
      body: { token: "paper-jwt-arrived-late", userId: "paper:late" },
    });
    await connecting;

    expect(paper.userId.value).toBe(walletAddress);
    expect(paper.connected.value).toBe(true);
    expect(protectedRequests).not.toHaveLength(0);
    expect(
      protectedRequests.every(
        (request) => request.headers?.authorization === `Bearer ${walletToken}`,
      ),
    ).toBe(true);
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

  it("propage un ordre refuse au lieu d'afficher un faux succes", async () => {
    const paper = usePaper(
      clientWith({
        "POST /accounts/ensure": {
          status: 200,
          body: { userId: XRP_ACCOUNT, created: true },
        },
        [`GET /accounts/${XRP_ACCOUNT}/balances`]: { status: 200, body: { RLUSD: 10_000 } },
        [`GET /accounts/${XRP_ACCOUNT}/orders`]: { status: 200, body: [] },
        [`POST /accounts/${XRP_ACCOUNT}/orders`]: {
          status: 500,
          body: { error: "ordre non persiste" },
        },
      }),
    );
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    await paper.connect();

    await expect(
      paper.placeOrder({
        pair: { base: "XRP", quote: "RLUSD" },
        side: "buy",
        amount: 100,
        price: 0.5,
      }),
    ).rejects.toThrow("ordre non persiste");
    expect(paper.orders.value).toHaveLength(0);
    expect(paper.error.value).toBe("ordre non persiste");
  });

  it("renouvelle la session Paper persistante sans changer de userId", async () => {
    const userId = "paper:persistent-user";
    localStorage.setItem("tide.paperUserId", userId);
    localStorage.setItem("tide.paperSessionToken", "jwt-old");
    const paper = usePaper(clientWith({
      "POST /auth/paper/refresh": {
        status: 200,
        body: { token: "jwt-next", userId },
      },
      "POST /accounts/ensure": { status: 200, body: { userId, created: false } },
      [`GET /accounts/${encodeURIComponent(userId)}/balances`]: {
        status: 200,
        body: { RLUSD: 9_000, XRP: 10 },
      },
      [`GET /accounts/${encodeURIComponent(userId)}/orders`]: { status: 200, body: [FILL] },
    }));

    await paper.connect();

    expect(paper.userId.value).toBe(userId);
    expect(localStorage.getItem("tide.paperSessionToken")).toBe("jwt-next");
    expect(paper.orders.value).toEqual([FILL]);
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
  it("charge la liste réelle", async () => {
    const comp = useCompetitions(
      clientWith({
        "GET /competitions": { status: 200, body: [{ id: "c1" }] },
      }),
    );
    await comp.load();
    expect(comp.items.value).toEqual([{ id: "c1" }]);
  });

  it("charge le détail, les participants et le classement", async () => {
    const comp = useCompetitions(
      clientWith({
        "GET /competitions/c1": { status: 200, body: { id: "c1" } },
        "GET /competitions/c1/participants": { status: 200, body: ["a"] },
        "GET /competitions/c1/leaderboard": { status: 200, body: [{ userId: "a" }] },
      }),
    );
    await comp.loadOne("c1");
    expect(comp.current.value).toEqual({ id: "c1" });
    expect(comp.participants.value).toEqual(["a"]);
    expect(comp.leaderboard.value).toEqual([{ userId: "a" }]);
  });

  it("remonte l'erreur de chargement", async () => {
    const comp = useCompetitions(
      clientWith({
        "GET /competitions": { status: 500, body: { error: "indisponible" } },
      }),
    );
    await comp.load();
    expect(comp.error.value).toBe("indisponible");
  });
});
