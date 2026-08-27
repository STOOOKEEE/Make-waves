import { describe, it, expect } from "vitest";
import type { NftIssuer } from "@tide/xrpl";
import {
  BadgeService,
  BadgeClaimUnavailableError,
  BadgeClaimManagedError,
  BadgeNotEarnedError,
  BadgeUnknownError,
  type BadgeCompetitionSource,
  type BadgeOrdersSource,
} from "../src/services/badge-service";
import {
  BadgeAlreadyClaimedError,
  InMemoryBadgeStore,
} from "../src/store/badge-store";

const WALLET = "ra6hLorXqVpwb7jWfekgjPcPFRHrQqANZg";
const SOURCE_TAG = 2606210009;
// Ids XRPL réalistes (64 hex) : buildBadgeAcceptOffer valide ce format.
const NFT_ID = "00082710" + "1234567890ABCDEF".repeat(3) + "1234ABCD";
const OFFER_ID = "ABCDEF01" + "1234567890ABCDEF".repeat(3) + "0011AABB";

class FakeOrders implements BadgeOrdersSource {
  constructor(private readonly count: number) {}
  ordersOf(): readonly unknown[] {
    return new Array(this.count).fill(0);
  }
}

class FakeCompetition implements BadgeCompetitionSource {
  constructor(private readonly members: string[] = []) {}
  list(): readonly { readonly id: string }[] {
    return [{ id: "comp-1" }];
  }
  participants(): readonly string[] {
    return this.members;
  }
}

class FakeIssuer implements NftIssuer {
  public calls = 0;
  async issueBadge(): Promise<{
    nftTokenId: string;
    sellOfferId: string;
    mintHash: string;
    offerHash: string;
  }> {
    this.calls += 1;
    return {
      nftTokenId: NFT_ID,
      sellOfferId: OFFER_ID,
      mintHash: "M",
      offerHash: "O",
    };
  }
}

function makeService(fills: number, members: string[] = []): {
  svc: BadgeService;
  issuer: FakeIssuer;
} {
  const issuer = new FakeIssuer();
  const svc = new BadgeService({
    paper: new FakeOrders(fills),
    competition: new FakeCompetition(members),
    store: new InMemoryBadgeStore(),
    issuer,
    sourceTag: SOURCE_TAG,
    metadataBaseUrl: "http://localhost:3000",
  });
  return { svc, issuer };
}

describe("BadgeService.statusFor", () => {
  it("dérive le mérite et reflète les claims", async () => {
    const { svc } = makeService(1);
    const before = await svc.statusFor("u1");
    const firstTrade = before.find((b) => b.code === "first_trade");
    expect(firstTrade?.earned).toBe(true);
    expect(firstTrade?.status).toBe("unclaimed");
    expect(before.find((b) => b.code === "ten_trades")?.earned).toBe(false);

    const res = await svc.claim("u1", WALLET, "first_trade");
    expect(res.nftTokenId).toBe(NFT_ID);
    // L'accept renvoyé est prêt à signer ET taggé Tide (attribution compte actif).
    expect(res.acceptTx).toEqual({
      TransactionType: "NFTokenAcceptOffer",
      Account: WALLET,
      NFTokenSellOffer: OFFER_ID,
      SourceTag: SOURCE_TAG,
    });
    const afterClaim = await svc.statusFor("u1");
    const ft = afterClaim.find((b) => b.code === "first_trade");
    expect(ft?.status).toBe("offer_pending");
    expect(ft?.nftTokenId).toBe(NFT_ID);

    await svc.confirmClaim("u1", "first_trade", "HASH");
    const afterConfirm = await svc.statusFor("u1");
    expect(afterConfirm.find((b) => b.code === "first_trade")?.status).toBe("claimed");
  });
});

describe("BadgeService sans issuer (affichage off-chain gratuit)", () => {
  function noIssuerSvc(): BadgeService {
    return new BadgeService({
      paper: new FakeOrders(1),
      competition: new FakeCompetition(),
      store: new InMemoryBadgeStore(),
    });
  }

  it("statusFor dérive le mérite sans issuer", async () => {
    const status = await noIssuerSvc().statusFor("u1");
    expect(status.find((b) => b.code === "first_trade")?.earned).toBe(true);
  });

  it("claim sans issuer → BadgeClaimUnavailableError", async () => {
    await expect(noIssuerSvc().claim("u1", WALLET, "first_trade")).rejects.toThrow(
      BadgeClaimUnavailableError,
    );
  });

  it("statusFor tolère un compte inexistant (nouveau visiteur → 0 badge)", async () => {
    const throwingPaper: BadgeOrdersSource = {
      ordersOf() {
        const e = new Error("Compte introuvable");
        e.name = "AccountNotFoundError";
        throw e;
      },
    };
    const svc = new BadgeService({
      paper: throwingPaper,
      competition: new FakeCompetition(),
      store: new InMemoryBadgeStore(),
    });
    const status = await svc.statusFor("newbie");
    expect(status).toHaveLength(3);
    expect(status.every((b) => !b.earned)).toBe(true);
  });
});

describe("BadgeService.claim (erreurs)", () => {
  it("réserve First Trade au wallet NFT secondaire quand le funnel est actif", async () => {
    const issuer = new FakeIssuer();
    const svc = new BadgeService({
      paper: new FakeOrders(1),
      competition: new FakeCompetition(),
      store: new InMemoryBadgeStore(),
      issuer,
      sourceTag: SOURCE_TAG,
      managedClaimCodes: new Set(["first_trade"]),
    });
    const firstTrade = (await svc.statusFor("u1")).find((badge) => badge.code === "first_trade");
    expect(firstTrade?.claimMode).toBe("paper_reward");
    await expect(svc.claim("u1", WALLET, "first_trade")).rejects.toThrow(
      BadgeClaimManagedError,
    );
    expect(issuer.calls).toBe(0);
  });

  it("refuse un badge non mérité", async () => {
    const { svc } = makeService(0);
    await expect(svc.claim("u1", WALLET, "first_trade")).rejects.toThrow(
      BadgeNotEarnedError,
    );
  });

  it("refuse un code inconnu", async () => {
    const { svc } = makeService(1);
    await expect(svc.claim("u1", WALLET, "nope")).rejects.toThrow(BadgeUnknownError);
  });

  it("refuse une adresse invalide", async () => {
    const { svc } = makeService(1);
    await expect(svc.claim("u1", "not-an-address", "first_trade")).rejects.toThrow(
      /Adresse/,
    );
  });

  it("refuse un double claim", async () => {
    const { svc, issuer } = makeService(1);
    await svc.claim("u1", WALLET, "first_trade");
    await expect(svc.claim("u1", WALLET, "first_trade")).rejects.toThrow(
      BadgeAlreadyClaimedError,
    );
    expect(issuer.calls).toBe(1);
  });
});

describe("BadgeService.claimForSign (signature Xaman)", () => {
  it("fait le claim complet si aucune offre n'existe", async () => {
    const { svc, issuer } = makeService(1);
    const res = await svc.claimForSign("u1", WALLET, "first_trade");
    expect(res.sellOfferId).toBe(OFFER_ID);
    expect(res.acceptTx).toEqual({
      TransactionType: "NFTokenAcceptOffer",
      Account: WALLET,
      NFTokenSellOffer: OFFER_ID,
      SourceTag: SOURCE_TAG,
    });
    expect(issuer.calls).toBe(1);
  });

  it("reprend une offre offer_pending sans re-mint", async () => {
    const { svc, issuer } = makeService(1);
    await svc.claim("u1", WALLET, "first_trade");
    expect(issuer.calls).toBe(1);
    const res = await svc.claimForSign("u1", WALLET, "first_trade");
    expect(res.sellOfferId).toBe(OFFER_ID);
    expect(res.nftTokenId).toBe(NFT_ID);
    expect(issuer.calls).toBe(1);
  });

  it("refuse un badge déjà claimé", async () => {
    const { svc } = makeService(1);
    await svc.claim("u1", WALLET, "first_trade");
    await svc.confirmClaim("u1", "first_trade", "HASH");
    await expect(svc.claimForSign("u1", WALLET, "first_trade")).rejects.toThrow(
      BadgeAlreadyClaimedError,
    );
  });

  it("sans issuer → BadgeClaimUnavailableError", async () => {
    const svc = new BadgeService({
      paper: new FakeOrders(1),
      competition: new FakeCompetition(),
      store: new InMemoryBadgeStore(),
    });
    await expect(svc.claimForSign("u1", WALLET, "first_trade")).rejects.toThrow(
      BadgeClaimUnavailableError,
    );
  });
});
