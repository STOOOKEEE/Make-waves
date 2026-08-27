import { describe, expect, it } from "vitest";
import { Wallet } from "xrpl";
import type { NftIssuer } from "@tide/xrpl";
import { buildServer } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import { PaperWalletService } from "../src/services/paper-wallet-service";
import { FirstTradeRewardService } from "../src/services/first-trade-reward-service";
import { InMemoryPaperWalletStore } from "../src/store/paper-wallet-store";
import { InMemoryPaperBadgeRewardStore } from "../src/store/paper-badge-reward-store";

const MASTER = "b".repeat(64);
const USER = "paper:new-user";

class FlowGateway {
  readonly operatorFunding: Array<{ destination: string; amount: string }> = [];
  readonly linkedFunding: Array<{ source: string; destination: string; amount: string }> = [];
  readonly accepted: Array<{ recipient: string; offer: string }> = [];
  readonly deletions: Array<{ account: string; destination: string; fee: string }> = [];

  async fundWallet(destination: string, amount: string): Promise<{ hash: string }> {
    this.operatorFunding.push({ destination, amount });
    return { hash: "FUNDER_TO_WALLET_1" };
  }

  async fundWalletFromSeed(
    seed: string,
    destination: string,
    amount: string,
  ): Promise<{ hash: string }> {
    this.linkedFunding.push({
      source: Wallet.fromSeed(seed).classicAddress,
      destination,
      amount,
    });
    return { hash: "WALLET_1_TO_WALLET_2" };
  }

  async acceptNft(seed: string, offer: string): Promise<{ hash: string }> {
    this.accepted.push({ recipient: Wallet.fromSeed(seed).classicAddress, offer });
    return { hash: "WALLET_2_ACCEPTS_NFT" };
  }

  async deleteAccount(
    seed: string,
    destination: string,
    fee: string,
  ): Promise<{ hash: string }> {
    this.deletions.push({
      account: Wallet.fromSeed(seed).classicAddress,
      destination,
      fee,
    });
    return { hash: "WALLET_1_DELETED" };
  }
}

class FlowIssuer implements NftIssuer {
  readonly destinations: string[] = [];
  async issueBadge(params: {
    uri: string;
    taxon: number;
    destination: string;
  }): Promise<{
    nftTokenId: string;
    sellOfferId: string;
    mintHash: string;
    offerHash: string;
  }> {
    this.destinations.push(params.destination);
    return {
      nftTokenId: "A".repeat(64),
      sellOfferId: "B".repeat(64),
      mintHash: "MINT",
      offerHash: "OFFER",
    };
  }
}

describe("funnel Paper à deux wallets", () => {
  it("impose claim 1 → trade → claim 2, avec financement wallet 1 → wallet 2", async () => {
    const paper = new PaperService();
    const gateway = new FlowGateway();
    const issuer = new FlowIssuer();
    const starterStore = new InMemoryPaperWalletStore();
    const rewardStore = new InMemoryPaperWalletStore();
    const wallets = new PaperWalletService({
      store: starterStore,
      rewardStore,
      gateway,
      masterKeyHex: MASTER,
      masterKeyId: "paper-mainnet-v2",
    });
    const rewards = new FirstTradeRewardService({
      store: new InMemoryPaperBadgeRewardStore(),
      wallets,
      issuer,
      gateway,
      metadataBaseUrl: "https://api.tidetrade.xyz",
    });
    const app = buildServer({
      paper,
      competition: new CompetitionService(),
      getPrices: () => ({ XRP: 0.5 }),
      paperWallets: wallets,
      firstTradeRewards: rewards,
    });

    await app.inject({ method: "POST", url: "/accounts/ensure", payload: { userId: USER } });
    const beforeClaim = await app.inject({ method: "GET", url: `/accounts/${USER}/paper-wallet` });
    expect(beforeClaim.json()).toMatchObject({
      walletStatus: "not_created",
      rewardWalletStatus: "not_created",
      rewardStatus: "not_earned",
    });

    const blockedTrade = await app.inject({
      method: "POST",
      url: `/accounts/${USER}/orders`,
      payload: {
        pair: { base: "XRP", quote: "RLUSD" },
        side: "buy",
        amount: 10,
        price: 0.5,
      },
    });
    expect(blockedTrade.statusCode).toBe(409);

    const firstClaim = await app.inject({
      method: "POST",
      url: `/accounts/${USER}/paper-wallet/claim`,
    });
    expect(firstClaim.statusCode).toBe(200);
    expect(firstClaim.json()).toMatchObject({
      walletStatus: "funded",
      fundingTxHash: "FUNDER_TO_WALLET_1",
      rewardWalletStatus: "not_created",
    });
    expect(gateway.operatorFunding[0]?.amount).toBe("2220000");
    const storedStarter = await starterStore.get(USER);
    expect(storedStarter).not.toBeNull();
    const starterSeed = await wallets.decryptSeed(storedStarter!);
    expect(firstClaim.body).not.toContain(starterSeed);
    expect(firstClaim.body).not.toContain(storedStarter!.encryptedSeed);
    expect(firstClaim.body).not.toMatch(/encryptedSeed|masterKeyId|"seed"/i);

    const rewardTooSoon = await app.inject({
      method: "POST",
      url: `/accounts/${USER}/paper-wallet/reward/claim`,
    });
    expect(rewardTooSoon.statusCode).toBe(400);
    expect(gateway.linkedFunding).toEqual([]);

    const trade = await app.inject({
      method: "POST",
      url: `/accounts/${USER}/orders`,
      payload: {
        pair: { base: "XRP", quote: "RLUSD" },
        side: "buy",
        amount: 10,
        price: 0.5,
      },
    });
    expect(trade.statusCode).toBe(201);
    const unlocked = await app.inject({ method: "GET", url: `/accounts/${USER}/paper-wallet` });
    expect(unlocked.json()).toMatchObject({
      rewardStatus: "eligible",
      rewardWalletStatus: "not_created",
    });
    expect(gateway.linkedFunding).toEqual([]);
    expect(issuer.destinations).toEqual([]);

    const secondClaim = await app.inject({
      method: "POST",
      url: `/accounts/${USER}/paper-wallet/reward/claim`,
    });
    expect(secondClaim.statusCode).toBe(200);
    const result = secondClaim.json<{
      walletAddress: string;
      rewardWalletAddress: string;
      rewardFundingSourceAddress: string;
      rewardFundingTxHash: string;
      rewardStatus: string;
    }>();
    expect(result.rewardStatus).toBe("claimed");
    expect(result.rewardFundingSourceAddress).toBe(result.walletAddress);
    expect(result.rewardFundingTxHash).toBe("WALLET_1_TO_WALLET_2");
    expect(gateway.linkedFunding).toEqual([
      {
        source: result.walletAddress,
        destination: result.rewardWalletAddress,
        amount: "1210000",
      },
    ]);
    expect(issuer.destinations).toEqual([result.rewardWalletAddress]);
    expect(gateway.accepted[0]?.recipient).toBe(result.rewardWalletAddress);
    // Wallet 1 fermé par AccountDelete : solde restant → wallet 2, fee 0,2 XRP.
    expect(gateway.deletions).toEqual([
      {
        account: result.walletAddress,
        destination: result.rewardWalletAddress,
        fee: "200000",
      },
    ]);
    const closedStarter = await starterStore.get(USER);
    expect(closedStarter?.status).toBe("deleted");
    expect(closedStarter?.deleteTxHash).toBe("WALLET_1_DELETED");
    expect(closedStarter?.encryptedSeed).toBe("");
    await expect(wallets.decryptSeed(closedStarter!)).rejects.toThrow(/Seed.*effacée/);
    expect(secondClaim.json()).toMatchObject({
      walletStatus: "deleted",
      walletDeleteTxHash: "WALLET_1_DELETED",
    });
    const storedReward = await rewardStore.get(USER);
    expect(storedReward).not.toBeNull();
    const rewardSeed = await wallets.decryptSeed(storedReward!);
    expect(secondClaim.body).not.toContain(rewardSeed);
    expect(secondClaim.body).not.toContain(storedReward!.encryptedSeed);
    expect(secondClaim.body).not.toMatch(/encryptedSeed|masterKeyId|"seed"/i);

    const duplicate = await app.inject({
      method: "POST",
      url: `/accounts/${USER}/paper-wallet/reward/claim`,
    });
    expect(duplicate.statusCode).toBe(200);
    expect(gateway.operatorFunding).toHaveLength(1);
    expect(gateway.linkedFunding).toHaveLength(1);
    expect(issuer.destinations).toHaveLength(1);
    expect(gateway.accepted).toHaveLength(1);
    expect(gateway.deletions).toHaveLength(1);
  });
});
