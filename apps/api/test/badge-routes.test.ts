import { describe, it, expect } from "vitest";
import type { NftIssuer } from "@tide/xrpl";
import { buildServer, type ServerDeps } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import {
  BadgeService,
  type BadgeCompetitionSource,
  type BadgeOrdersSource,
} from "../src/services/badge-service";
import { InMemoryBadgeStore } from "../src/store/badge-store";

const WALLET = "ra6hLorXqVpwb7jWfekgjPcPFRHrQqANZg";
// Ids XRPL réalistes (64 hex) : buildBadgeAcceptOffer valide ce format.
const NFT_ID = "00082710" + "1234567890ABCDEF".repeat(3) + "1234ABCD";
const OFFER_ID = "ABCDEF01" + "1234567890ABCDEF".repeat(3) + "0011AABB";

const fakeIssuer: NftIssuer = {
  async issueBadge() {
    return { nftTokenId: NFT_ID, sellOfferId: OFFER_ID, mintHash: "M", offerHash: "O" };
  },
};

/** Serveur avec un badgeService qui donne 1 fill (→ first_trade mérité). */
function buildWithBadges(fillCount: number): ServerDeps {
  const orders: BadgeOrdersSource = { ordersOf: () => new Array(fillCount).fill(0) };
  const comps: BadgeCompetitionSource = { list: () => [], participants: () => [] };
  const badgeService = new BadgeService({
    paper: orders,
    competition: comps,
    store: new InMemoryBadgeStore(),
    issuer: fakeIssuer,
    sourceTag: 2606210009,
    metadataBaseUrl: "http://localhost:3000",
  });
  return {
    paper: new PaperService(1000),
    competition: new CompetitionService(),
    getPrices: () => ({}),
    badgeService,
  };
}

describe("badge routes", () => {
  it("GET /accounts/:id/badges renvoie le catalogue avec le mérite", async () => {
    const app = buildServer(buildWithBadges(1));
    const res = await app.inject({ method: "GET", url: "/accounts/u1/badges" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(3);
    expect(body.find((b: { code: string }) => b.code === "first_trade").earned).toBe(true);
  });

  it("POST /badges/:code/claim mint + renvoie l'offer", async () => {
    const app = buildServer(buildWithBadges(1));
    const res = await app.inject({
      method: "POST",
      url: "/badges/first_trade/claim",
      payload: { userId: "u1", walletAddress: WALLET },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      sellOfferId: OFFER_ID,
      nftTokenId: NFT_ID,
      acceptTx: {
        TransactionType: "NFTokenAcceptOffer",
        Account: WALLET,
        NFTokenSellOffer: OFFER_ID,
        SourceTag: 2606210009,
      },
    });
  });

  it("POST /badges/:code/claim/confirm passe à claimed (200)", async () => {
    const app = buildServer(buildWithBadges(1));
    await app.inject({
      method: "POST",
      url: "/badges/first_trade/claim",
      payload: { userId: "u1", walletAddress: WALLET },
    });
    const res = await app.inject({
      method: "POST",
      url: "/badges/first_trade/claim/confirm",
      payload: { userId: "u1", txHash: "HASH" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("refuse un badge non mérité (400)", async () => {
    const app = buildServer(buildWithBadges(0));
    const res = await app.inject({
      method: "POST",
      url: "/badges/first_trade/claim",
      payload: { userId: "u1", walletAddress: WALLET },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /nft-metadata/:code renvoie le JSON (non gated)", async () => {
    const app = buildServer(buildWithBadges(1));
    const res = await app.inject({ method: "GET", url: "/nft-metadata/first_trade" });
    expect(res.statusCode).toBe(200);
    const meta = res.json();
    expect(meta.name).toBe("First Trade");
    expect(meta.attributes).toContainEqual({ trait_type: "badge", value: "first_trade" });
  });

  it("GET /nft-metadata/:code 404 pour un code inconnu", async () => {
    const app = buildServer(buildWithBadges(1));
    const res = await app.inject({ method: "GET", url: "/nft-metadata/nope" });
    expect(res.statusCode).toBe(404);
  });

  it("sans issuer : affichage 200, claim on-chain 503", async () => {
    const orders: BadgeOrdersSource = { ordersOf: () => [0] };
    const comps: BadgeCompetitionSource = { list: () => [], participants: () => [] };
    const badgeService = new BadgeService({
      paper: orders,
      competition: comps,
      store: new InMemoryBadgeStore(),
    });
    const app = buildServer({
      paper: new PaperService(1000),
      competition: new CompetitionService(),
      getPrices: () => ({}),
      badgeService,
    });
    const list = await app.inject({ method: "GET", url: "/accounts/u1/badges" });
    expect(list.statusCode).toBe(200);
    const claim = await app.inject({
      method: "POST",
      url: "/badges/first_trade/claim",
      payload: { userId: "u1", walletAddress: WALLET },
    });
    expect(claim.statusCode).toBe(503);
  });
});
