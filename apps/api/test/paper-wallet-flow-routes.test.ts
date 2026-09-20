import { describe, expect, it } from "vitest";
import { Wallet } from "xrpl";
import type { NftIssuer } from "@tide/xrpl";
import { buildServer } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import { CompetitionPaymentService } from "../src/services/competition-payment-service";
import type { CompetitionLedgerClient } from "../src/services/competition-payment-service";
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

class CompetitionLedger implements CompetitionLedgerClient {
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async autofill(transaction: Parameters<CompetitionLedgerClient["autofill"]>[0]) {
    return { ...transaction, Fee: "12", Sequence: 1, LastLedgerSequence: 100 };
  }

  async submitAndWait() {
    return {
      result: {
        hash: "C".repeat(64),
        meta: { TransactionResult: "tesSUCCESS" },
      },
    };
  }
}

describe("funnel Paper à un wallet", () => {
  it("impose claim 1 → trade → claim NFT sur le wallet principal", async () => {
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
      rewardWalletStatus: "funded",
    });
    expect(gateway.operatorFunding[0]?.amount).toBe("1210000");
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
      rewardWalletStatus: "funded",
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
      rewardFundingTxHash: string | null;
      rewardStatus: string;
    }>();
    expect(result.rewardStatus).toBe("claimed");
    expect(result.rewardFundingSourceAddress).toBe(result.walletAddress);
    expect(result.rewardFundingTxHash).toBeNull();
    expect(result.rewardWalletAddress).toBe(result.walletAddress);
    expect(issuer.destinations).toEqual([result.walletAddress]);
    expect(gateway.accepted[0]?.recipient).toBe(result.walletAddress);
    expect(gateway.linkedFunding).toEqual([]);
    expect(gateway.deletions).toEqual([]);
    const fundedStarter = await starterStore.get(USER);
    expect(fundedStarter?.status).toBe("funded");
    expect(fundedStarter?.deleteTxHash).toBeNull();
    await expect(wallets.decryptSeed(fundedStarter!)).resolves.toMatch(/^s/);
    expect(secondClaim.json()).toMatchObject({
      walletStatus: "funded",
      walletDeleteTxHash: null,
    });
    const storedReward = await rewardStore.get(USER);
    expect(storedReward).toBeNull();
    expect(secondClaim.body).not.toMatch(/encryptedSeed|masterKeyId|"seed"/i);

    const duplicate = await app.inject({
      method: "POST",
      url: `/accounts/${USER}/paper-wallet/reward/claim`,
    });
    expect(duplicate.statusCode).toBe(200);
    expect(gateway.operatorFunding).toHaveLength(1);
    expect(gateway.linkedFunding).toHaveLength(0);
    expect(issuer.destinations).toHaveLength(1);
    expect(gateway.accepted).toHaveLength(1);
    expect(gateway.deletions).toHaveLength(0);
  });

  it("finance puis paie l'entrée Paper depuis le même wallet", async () => {
    const paper = new PaperService();
    const gateway = new FlowGateway();
    const wallets = new PaperWalletService({
      store: new InMemoryPaperWalletStore(),
      rewardStore: new InMemoryPaperWalletStore(),
      gateway,
      masterKeyHex: MASTER,
      masterKeyId: "paper-mainnet-v2",
    });
    const ledger = new CompetitionLedger();
    const payments = new CompetitionPaymentService({
      serverUrl: "ws://unused",
      prizePoolAddress: Wallet.generate().classicAddress,
      sourceTag: 7777,
      clientFactory: () => ledger,
    });
    const competition = new CompetitionService(undefined, () => 1_500, () => true);
    competition.create({
      id: "paper-cup",
      nameEn: "Paper cup",
      nameFr: "Coupe Paper",
      descriptionEn: "Test",
      descriptionFr: "Test",
      mode: "paper",
      buyIn: 0.01,
      rakeRatio: 0,
      payoutWeights: [1],
      startsAt: 1_000,
      endsAt: 2_000,
    });
    const app = buildServer({
      paper,
      competition,
      competitionPayments: payments,
      getPrices: () => ({ XRP: 0.5 }),
      paperWallets: wallets,
    });

    const response = await app.inject({
      method: "POST",
      url: "/competitions/paper-cup/paper-join",
      payload: { userId: "paper:competition-user" },
    });

    expect(response.statusCode).toBe(200);
    const result = response.json<{ walletAddress: string; txHash: string }>();
    expect(result.txHash).toBe("C".repeat(64));
    expect(result.walletAddress).toMatch(/^r/);
    expect(gateway.operatorFunding).toEqual([
      { destination: result.walletAddress, amount: "1210000" },
    ]);
    expect(competition.participants("paper-cup")).toEqual(["paper:competition-user"]);
    expect(ledger.isConnected()).toBe(false);
  });
});
