import { describe, expect, it } from "vitest";
import { Wallet } from "xrpl";
import type { NftIssuer } from "@tide/xrpl";
import { buildServer } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import { BadgeService } from "../src/services/badge-service";
import { BADGE_CODES } from "../src/badges/catalog";
import { InMemoryBadgeStore } from "../src/store/badge-store";
import { InMemoryPaperWalletStore } from "../src/store/paper-wallet-store";
import { InMemoryPaperBadgeRewardStore } from "../src/store/paper-badge-reward-store";
import { InMemoryWalletLinkStore } from "../src/store/wallet-link-store";
import {
  createFirstTradeExternalGuard,
  createFirstTradeManagedGuard,
} from "../src/services/first-trade-external-guard";

class FakeIssuer implements NftIssuer {
  readonly destinations: string[] = [];
  async issueBadge(params: { uri: string; taxon: number; destination: string }): Promise<{
    nftTokenId: string;
    sellOfferId: string;
    mintHash: string;
    offerHash: string;
  }> {
    this.destinations.push(params.destination);
    return { nftTokenId: "C".repeat(64), sellOfferId: "D".repeat(64), mintHash: "M", offerHash: "O" };
  }
}

function addressOf(seed?: string): string {
  return (seed === undefined ? Wallet.generate() : Wallet.fromSeed(seed)).classicAddress;
}

function makeApp(options?: { readonly maxExternalMintsPerDay?: number }) {
  const paper = new PaperService();
  const badgeStore = new InMemoryBadgeStore();
  const links = new InMemoryWalletLinkStore();
  const starters = new InMemoryPaperWalletStore();
  const firstTradeRows = new InMemoryPaperBadgeRewardStore();
  const guard = createFirstTradeExternalGuard({
    links,
    firstTradeRows,
    badgeClaims: badgeStore,
    ...(options?.maxExternalMintsPerDay !== undefined
      ? { maxExternalMintsPerDay: options.maxExternalMintsPerDay }
      : {}),
  });
  const badgeService = new BadgeService({
    paper,
    competition: new CompetitionService(),
    store: badgeStore,
    issuer: new FakeIssuer(),
    sourceTag: 2606210009,
    managedClaimCodes: new Set<string>([BADGE_CODES.FIRST_TRADE]),
    managedExternalGuard: guard,
  });
  const app = buildServer({
    paper,
    competition: new CompetitionService(),
    getPrices: () => ({ XRP: 0.5 }),
    badgeService,
  });
  return { app, links, starters, firstTradeRows };
}

async function trade(app: ReturnType<typeof makeApp>["app"], userId: string): Promise<void> {
  await app.inject({
    method: "POST",
    url: "/accounts/ensure",
    payload: { userId },
  });
  const response = await app.inject({
    method: "POST",
    url: `/accounts/${userId}/orders`,
    payload: { pair: { base: "XRP", quote: "RLUSD" }, side: "buy", amount: 10, price: 0.5 },
  });
  expect(response.statusCode).toBe(201);
}

describe("option B : claim First Trade sur wallet connecté", () => {
  it("trade sans funnel puis claim le NFT sur son adresse, une seule fois", async () => {
    const { app } = makeApp();
    const address = addressOf();

    // Identité XRPL (option B) : le gate custodial ne s'applique pas.
    await trade(app, address);

    const claim = await app.inject({
      method: "POST",
      url: `/badges/${BADGE_CODES.FIRST_TRADE}/claim`,
      payload: { userId: address, walletAddress: address },
    });
    expect(claim.statusCode).toBe(200);
    const body = claim.json<{ acceptTx: { Account: string; SourceTag: number } }>();
    expect(body.acceptTx.Account).toBe(address);
    expect(body.acceptTx.SourceTag).toBe(2606210009);

    const confirm = await app.inject({
      method: "POST",
      url: `/badges/${BADGE_CODES.FIRST_TRADE}/claim/confirm`,
      payload: { userId: address, walletAddress: address, txHash: "ACCEPT_TX" },
    });
    expect(confirm.statusCode).toBe(200);

    const duplicate = await app.inject({
      method: "POST",
      url: `/badges/${BADGE_CODES.FIRST_TRADE}/claim`,
      payload: { userId: address, walletAddress: address },
    });
    expect(duplicate.statusCode).toBe(409);
  });

  it("refuse une identité Paper (le funnel custodial reste le chemin managed)", async () => {
    const { app } = makeApp();
    const address = addressOf();
    const response = await app.inject({
      method: "POST",
      url: `/badges/${BADGE_CODES.FIRST_TRADE}/claim`,
      payload: { userId: "paper:managed", walletAddress: address },
    });
    expect(response.statusCode).toBe(403);
  });

  it("autorise le wallet externe si le wallet 1 lié est seulement financé", async () => {
    const { app, links, starters } = makeApp();
    const linkedPaper = "paper:starter-only";
    await starters.create({
      userId: linkedPaper,
      address: "rStarterLinked",
      encryptedSeed: "encrypted",
      masterKeyId: "v1",
      status: "pending_funding",
      fundingTxHash: null,
      fundedAt: null,
      createdAt: 1,
      deleteTxHash: null,
    });
    await starters.markFunded(linkedPaper, "FUND", 2);
    const address = addressOf();
    await links.link(address, linkedPaper, 3);

    await trade(app, address);
    const claim = await app.inject({
      method: "POST",
      url: `/badges/${BADGE_CODES.FIRST_TRADE}/claim`,
      payload: { userId: address, walletAddress: address },
    });
    expect(claim.statusCode).toBe(200);
  });

  it("refuse le wallet externe si le compte Paper lié a gagné First Trade", async () => {
    const { app, links, firstTradeRows } = makeApp();
    const linkedPaper = "paper:deja-eligible";
    const address = addressOf();
    await links.link(address, linkedPaper, 3);
    await firstTradeRows.ensureEligible({
      userId: linkedPaper,
      badgeCode: BADGE_CODES.FIRST_TRADE,
      qualifiedAt: 2,
      status: "eligible",
      nftTokenId: null,
      sellOfferId: null,
      claimTxHash: null,
      claimedAt: null,
    });

    await trade(app, address);
    const claim = await app.inject({
      method: "POST",
      url: `/badges/${BADGE_CODES.FIRST_TRADE}/claim`,
      payload: { userId: address, walletAddress: address },
    });
    expect(claim.statusCode).toBe(403);
  });

  it("refuse un second wallet lié au même Paper après le premier claim", async () => {
    const { app, links } = makeApp();
    const paperUserId = "paper:one-reward";
    const addressA = addressOf();
    const addressB = addressOf();
    await links.link(addressA, paperUserId, 1);
    await links.link(addressB, paperUserId, 2);

    await trade(app, addressA);
    const first = await app.inject({
      method: "POST",
      url: "/badges/" + BADGE_CODES.FIRST_TRADE + "/claim",
      payload: { userId: addressA, walletAddress: addressA },
    });
    expect(first.statusCode).toBe(200);

    await trade(app, addressB);
    const second = await app.inject({
      method: "POST",
      url: "/badges/" + BADGE_CODES.FIRST_TRADE + "/claim",
      payload: { userId: addressB, walletAddress: addressB },
    });
    expect(second.statusCode).toBe(403);
  });

  it("refuse ensuite le funnel custodial du Paper lié", async () => {
    const badgeClaims = new InMemoryBadgeStore();
    const links = new InMemoryWalletLinkStore();
    const paperUserId = "paper:external-already-minted";
    const address = addressOf();
    await links.link(address, paperUserId, 1);
    await badgeClaims.create({
      userId: address,
      badgeCode: BADGE_CODES.FIRST_TRADE,
      claimedAt: 2,
      nftTokenId: "C".repeat(64),
      sellOfferId: "D".repeat(64),
      status: "offer_pending",
      claimTxHash: null,
    });
    const guard = createFirstTradeManagedGuard({ links, badgeClaims });

    await expect(guard(paperUserId)).rejects.toThrow(/wallet externe lié/);
  });

  it("gèle les claims externes au-delà du plafond journalier", async () => {
    const { app } = makeApp({ maxExternalMintsPerDay: 1 });
    const addressA = addressOf();
    const addressB = addressOf();

    await trade(app, addressA);
    const first = await app.inject({
      method: "POST",
      url: `/badges/${BADGE_CODES.FIRST_TRADE}/claim`,
      payload: { userId: addressA, walletAddress: addressA },
    });
    expect(first.statusCode).toBe(200);

    await trade(app, addressB);
    const second = await app.inject({
      method: "POST",
      url: `/badges/${BADGE_CODES.FIRST_TRADE}/claim`,
      payload: { userId: addressB, walletAddress: addressB },
    });
    expect(second.statusCode).toBe(403);
  });
});
