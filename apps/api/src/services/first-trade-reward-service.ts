import type { NftIssuer, XrplCustodialWalletGateway } from "@tide/xrpl";
import { BADGE_CODES, badgeByCode } from "../badges/catalog";
import type { PaperBadgeRewardStore } from "../store/paper-badge-reward-store";
import type { PaperWalletService } from "./paper-wallet-service";

const FIRST_TRADE = BADGE_CODES.FIRST_TRADE;

export interface FirstTradeRewardStatus {
  readonly network: "mainnet";
  readonly walletAddress: string | null;
  readonly walletStatus:
    | "not_created"
    | "pending_funding"
    | "funding_in_progress"
    | "funded"
    | "funding_failed"
    | "reclaimed"
    | "deleted";
  readonly fundingTxHash: string | null;
  /** Conservé pour compatibilité API ; le nouveau parcours ne supprime plus le wallet. */
  readonly walletDeleteTxHash: string | null;
  readonly rewardWalletAddress: string | null;
  readonly rewardWalletStatus:
    | "not_created"
    | "pending_funding"
    | "funding_in_progress"
    | "funded"
    | "funding_failed"
    | "reclaimed"
    | "deleted";
  readonly rewardFundingTxHash: string | null;
  /** Alias legacy ; pour un nouveau parcours cette adresse est celle du wallet principal. */
  readonly rewardFundingSourceAddress: string | null;
  readonly rewardStatus: "not_earned" | "eligible" | "minting" | "offer_pending" | "claimed";
  readonly nftTokenId: string | null;
  readonly claimTxHash: string | null;
}

export interface FirstTradeRewardServiceDeps {
  readonly store: PaperBadgeRewardStore;
  readonly wallets: Pick<
    PaperWalletService,
    | "get"
    | "getReward"
    | "ensureFunded"
    | "decryptSeed"
  >;
  readonly issuer: NftIssuer;
  readonly gateway: Pick<XrplCustodialWalletGateway, "acceptNft">;
  /** Refuse le funnel custodial si un wallet externe lié a déjà initié le claim. */
  readonly managedClaimGuard?: (userId: string) => Promise<void>;
  readonly metadataBaseUrl: string;
  readonly network?: "mainnet";
  readonly now?: () => number;
}

export class FirstTradeRewardNotEligibleError extends Error {
  constructor() {
    super("Passe d'abord ton premier trade Paper pour débloquer ce claim");
    this.name = "FirstTradeRewardNotEligibleError";
  }
}

/** Débloque au premier trade, puis provisionne et utilise le wallet principal. */
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
  }

  async status(userId: string): Promise<FirstTradeRewardStatus> {
    const [wallet, rewardWallet, reward] = await Promise.all([
      this.deps.wallets.get(userId),
      this.deps.wallets.getReward(userId),
      this.deps.store.get(userId, FIRST_TRADE),
    ]);
    return {
      network: this.deps.network ?? "mainnet",
      walletAddress: wallet?.address ?? null,
      walletStatus: wallet?.status ?? "not_created",
      fundingTxHash: wallet?.fundingTxHash ?? null,
      walletDeleteTxHash: wallet?.deleteTxHash ?? null,
      rewardWalletAddress: rewardWallet?.address ?? wallet?.address ?? null,
      rewardWalletStatus: rewardWallet?.status ?? wallet?.status ?? "not_created",
      rewardFundingTxHash: rewardWallet?.fundingTxHash ?? null,
      rewardFundingSourceAddress: wallet?.address ?? null,
      rewardStatus: reward?.status ?? "not_earned",
      nftTokenId: reward?.nftTokenId ?? null,
      claimTxHash: reward?.claimTxHash ?? null,
    };
  }

  /** Claim explicite du NFT First Trade sur le wallet principal. */
  async claim(userId: string): Promise<FirstTradeRewardStatus> {
    const existing = this.running.get(userId);
    if (existing !== undefined) {
      await existing;
      return this.status(userId);
    }
    const operation = this.claimOnce(userId);
    this.running.set(userId, operation);
    try {
      await operation;
      return this.status(userId);
    } finally {
      this.running.delete(userId);
    }
  }

  private async claimOnce(userId: string): Promise<void> {
    let reward = await this.deps.store.get(userId, FIRST_TRADE);
    if (reward === null) throw new FirstTradeRewardNotEligibleError();
    await this.deps.managedClaimGuard?.(userId);
    const wallet = await this.deps.wallets.ensureFunded(userId);

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

    if (reward.status === "minting") return;
    if (reward.status === "claimed") return;
    if (reward.sellOfferId === null) throw new Error("Offre NFT First Trade absente");
    const accepted = await this.deps.gateway.acceptNft(
      await this.deps.wallets.decryptSeed(wallet),
      reward.sellOfferId,
    );
    await this.deps.store.markClaimed(userId, FIRST_TRADE, accepted.hash, this.now());
  }
}
