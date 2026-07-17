import { describe, expect, it } from "vitest";
import type { NftIssuer } from "@tide/xrpl";
import { PaperWalletService, PAPER_WALLET_FUNDING_DROPS } from "../src/services/paper-wallet-service";
import {
  WeeklyRewardAlreadyClaimedError,
  WeeklyRewardService,
  weekKey,
} from "../src/services/weekly-reward-service";
import { InMemoryPaperWalletStore } from "../src/store/paper-wallet-store";
import { InMemoryWeeklyRewardStore } from "../src/store/weekly-reward-store";
import { FirstTradeRewardService } from "../src/services/first-trade-reward-service";
import { InMemoryPaperBadgeRewardStore } from "../src/store/paper-badge-reward-store";

const MASTER = "a".repeat(64);
const NFT_ID = "A".repeat(64);
const OFFER_ID = "B".repeat(64);

class FakeGateway {
  readonly funding: Array<{ address: string; drops: string }> = [];
  readonly accepted: Array<{ seed: string; sellOfferId: string }> = [];
  async fundWallet(address: string, drops: string): Promise<{ hash: string }> {
    this.funding.push({ address, drops });
    return { hash: "FUND" };
  }
  async acceptNft(seed: string, sellOfferId: string): Promise<{ hash: string }> {
    this.accepted.push({ seed, sellOfferId });
    return { hash: "CLAIM" };
  }
}

class FakeIssuer implements NftIssuer {
  calls = 0;
  async issueBadge(): Promise<{
    nftTokenId: string;
    sellOfferId: string;
    mintHash: string;
    offerHash: string;
  }> {
    this.calls += 1;
    return { nftTokenId: NFT_ID, sellOfferId: OFFER_ID, mintHash: "MINT", offerHash: "OFFER" };
  }
}

describe("PaperWalletService", () => {
  it("crée, chiffre et finance une seule fois le wallet au minimum NFT sûr", async () => {
    const store = new InMemoryPaperWalletStore();
    const gateway = new FakeGateway();
    const svc = new PaperWalletService({
      store,
      gateway,
      masterKeyHex: MASTER,
      masterKeyId: "v1",
      now: () => 100,
    });
    const [first, second] = await Promise.all([
      svc.ensureFunded("paper:u1"),
      svc.ensureFunded("paper:u1"),
    ]);

    expect(first.status).toBe("funded");
    expect(first.address).toMatch(/^r/);
    expect(first.encryptedSeed).not.toContain('"s');
    expect(await svc.decryptSeed(first)).toMatch(/^s/);
    expect(second).toEqual(first);
    expect(gateway.funding).toEqual([{ address: first.address, drops: PAPER_WALLET_FUNDING_DROPS }]);
  });
});

describe("WeeklyRewardService", () => {
  it("qualifie une semaine active puis mint/claim une seule fois au clic", async () => {
    const now = Date.UTC(2026, 6, 16, 10);
    const wallets = new PaperWalletService({
      store: new InMemoryPaperWalletStore(),
      gateway: new FakeGateway(),
      masterKeyHex: MASTER,
      masterKeyId: "v1",
      now: () => now,
    });
    const store = new InMemoryWeeklyRewardStore();
    const issuer = new FakeIssuer();
    const gateway = new FakeGateway();
    const svc = new WeeklyRewardService({
      store,
      wallets,
      issuer,
      gateway,
      metadataBaseUrl: "https://api.tidetrade.xyz",
      now: () => now,
    });

    await svc.recordTrade("paper:u1");
    const week = weekKey(now);
    expect(await svc.list("paper:u1")).toEqual([
      { week, qualifiedAt: now, status: "eligible", nftTokenId: null, claimedAt: null },
    ]);

    const [claimed, duplicate] = await Promise.all([
      svc.claim("paper:u1", week),
      svc.claim("paper:u1", week),
    ]);
    expect(claimed).toEqual({ week, qualifiedAt: now, status: "claimed", nftTokenId: NFT_ID, claimedAt: now });
    expect(duplicate).toEqual(claimed);
    expect(issuer.calls).toBe(1);
    expect(gateway.accepted).toHaveLength(1);
    await expect(svc.claim("paper:u1", week)).rejects.toBeInstanceOf(WeeklyRewardAlreadyClaimedError);
  });
});

describe("FirstTradeRewardService", () => {
  it("finance le wallet et remet exactement un NFT au premier trade", async () => {
    const now = Date.UTC(2026, 6, 17, 12);
    const gateway = new FakeGateway();
    const wallets = new PaperWalletService({
      store: new InMemoryPaperWalletStore(),
      gateway,
      masterKeyHex: MASTER,
      masterKeyId: "paper-v1",
      now: () => now,
    });
    const issuer = new FakeIssuer();
    const service = new FirstTradeRewardService({
      store: new InMemoryPaperBadgeRewardStore(),
      wallets,
      issuer,
      gateway,
      metadataBaseUrl: "https://api.tidetrade.xyz",
      now: () => now,
    });

    await Promise.all([
      service.recordFirstTrade("paper:u1"),
      service.recordFirstTrade("paper:u1"),
    ]);
    await service.recordFirstTrade("paper:u1");

    const status = await service.status("paper:u1");
    expect(status.walletAddress).toMatch(/^r/);
    expect(status.walletStatus).toBe("funded");
    expect(status.rewardStatus).toBe("claimed");
    expect(status.nftTokenId).toBe(NFT_ID);
    expect(status.claimTxHash).toBe("CLAIM");
    expect(issuer.calls).toBe(1);
    expect(gateway.funding).toHaveLength(1);
    expect(gateway.accepted).toHaveLength(1);
  });
});
