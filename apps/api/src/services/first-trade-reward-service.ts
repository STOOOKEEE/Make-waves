import type { NftIssuer, XrplCustodialWalletGateway } from "@tide/xrpl";
import { BADGE_CODES, badgeByCode } from "../badges/catalog";
import type { PaperBadgeRewardStore } from "../store/paper-badge-reward-store";
import type { PaperWalletService } from "./paper-wallet-service";

const FIRST_TRADE = BADGE_CODES.FIRST_TRADE;

export interface FirstTradeRewardStatus {
  readonly network: "testnet" | "mainnet";
  readonly walletAddress: string | null;
  readonly walletStatus:
    | "not_created"
    | "pending_funding"
    | "funding_in_progress"
    | "funded"
    | "funding_failed"
    | "reclaimed";
  readonly fundingTxHash: string | null;
  readonly rewardStatus: "not_earned" | "eligible" | "minting" | "offer_pending" | "claimed";
  readonly nftTokenId: string | null;
  readonly claimTxHash: string | null;
}

export interface FirstTradeRewardServiceDeps {
  readonly store: PaperBadgeRewardStore;
  readonly wallets: Pick<PaperWalletService, "get" | "ensureFunded" | "decryptSeed">;
  readonly issuer: NftIssuer;
  readonly gateway: Pick<XrplCustodialWalletGateway, "acceptNft">;
  readonly metadataBaseUrl: string;
  readonly network?: "testnet" | "mainnet";
  readonly now?: () => number;
}

/** Provisionne et remet une seule fois le badge XLS-20 du premier trade. */
export class FirstTradeRewardService {
  private readonly now: () => number;
  private readonly running = new Map<string, Promise<void>>();

  constructor(private readonly deps: FirstTradeRewardServiceDeps) {
    this.now = deps.now ?? Date.now;
  }

  async recordFirstTrade(userId: string): Promise<void> {
    await this.deps.store.ensureEligible({
      userId,
      badgeCode: FIRST_TRADE,
      qualifiedAt: this.now(),
      status: "eligible",
      nftTokenId: null,
      sellOfferId: null,
      claimTxHash: null,
      claimedAt: null,
    });
    const existing = this.running.get(userId);
    if (existing !== undefined) return existing;
    const operation = this.claim(userId);
    this.running.set(userId, operation);
    try {
      await operation;
    } finally {
      this.running.delete(userId);
    }
  }

  async status(userId: string): Promise<FirstTradeRewardStatus> {
    const [wallet, reward] = await Promise.all([
      this.deps.wallets.get(userId),
      this.deps.store.get(userId, FIRST_TRADE),
    ]);
    return {
      network: this.deps.network ?? "testnet",
      walletAddress: wallet?.address ?? null,
      walletStatus: wallet?.status ?? "not_created",
      fundingTxHash: wallet?.fundingTxHash ?? null,
      rewardStatus: reward?.status ?? "not_earned",
      nftTokenId: reward?.nftTokenId ?? null,
      claimTxHash: reward?.claimTxHash ?? null,
    };
  }

  private async claim(userId: string): Promise<void> {
    const wallet = await this.deps.wallets.ensureFunded(userId);
    let reward = await this.deps.store.get(userId, FIRST_TRADE);
    if (reward === null) throw new Error("Récompense First Trade introuvable");

    if (reward.status === "eligible") {
      if (!(await this.deps.store.startMinting(userId, FIRST_TRADE))) return;
      const badge = badgeByCode(FIRST_TRADE);
      if (badge === undefined) throw new Error("Badge First Trade introuvable");
      const issued = await this.deps.issuer.issueBadge({
        uri: `${this.deps.metadataBaseUrl}/nft-metadata/${FIRST_TRADE}`,
        taxon: badge.taxon,
        destination: wallet.address,
      });
      await this.deps.store.markOfferPending(
        userId,
        FIRST_TRADE,
        issued.nftTokenId,
        issued.sellOfferId,
      );
      reward = (await this.deps.store.get(userId, FIRST_TRADE)) ?? reward;
    }

    if (reward.status === "minting" || reward.status === "claimed") return;
    if (reward.sellOfferId === null) throw new Error("Offre NFT First Trade absente");
    const accepted = await this.deps.gateway.acceptNft(
      await this.deps.wallets.decryptSeed(wallet),
      reward.sellOfferId,
    );
    await this.deps.store.markClaimed(userId, FIRST_TRADE, accepted.hash, this.now());
  }
}
