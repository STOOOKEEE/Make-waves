import type { NftIssuer, XrplCustodialWalletGateway } from "@tide/xrpl";
import { BADGE_CODES, badgeByCode } from "../badges/catalog";
import type { PaperBadgeRewardStore } from "../store/paper-badge-reward-store";
import { ACCOUNT_DELETE_FEE_DROPS, type PaperWalletService } from "./paper-wallet-service";

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
  /** Hash de l'AccountDelete du wallet 1 ; null tant qu'il n'est pas fermé. */
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
  /** Adresse du wallet 1 qui finance le wallet 2 ; null tant qu'il n'existe pas. */
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
    | "ensureRewardFunded"
    | "decryptSeed"
    | "markDeleted"
    | "eraseSeed"
  >;
  readonly issuer: NftIssuer;
  readonly gateway: Pick<XrplCustodialWalletGateway, "acceptNft" | "deleteAccount">;
  /** Refuse le funnel custodial si un wallet externe lié a déjà initié le claim. */
  readonly managedClaimGuard?: (userId: string) => Promise<void>;
  /**
   * Destination du solde restant du wallet 1 à sa clôture : le wallet 2 par
   * défaut (l'user finit avec un seul compte vivant) ; "funder" pour récupérer
   * le budget (coût net ~1,41 XRP/user au lieu de 4).
   */
  readonly deleteRemainderDestination?: "reward" | "funder";
  readonly funderAddress?: string;
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

/** Débloque au premier trade, puis provisionne wallet 2 + NFT au clic. */
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
      rewardWalletAddress: rewardWallet?.address ?? null,
      rewardWalletStatus: rewardWallet?.status ?? "not_created",
      rewardFundingTxHash: rewardWallet?.fundingTxHash ?? null,
      rewardFundingSourceAddress: rewardWallet === null ? null : wallet?.address ?? null,
      rewardStatus: reward?.status ?? "not_earned",
      nftTokenId: reward?.nftTokenId ?? null,
      claimTxHash: reward?.claimTxHash ?? null,
    };
  }

  /** Claim explicite du compte secondaire et du NFT First Trade. */
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
    const wallet = await this.deps.wallets.ensureRewardFunded(userId);

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
    if (reward.status === "claimed") {
      // Le claim NFT peut avoir réussi alors que le sweep du wallet 1 a
      // échoué (coupure réseau, ledger non finalisé, etc.). Une nouvelle
      // tentative doit reprendre uniquement ce sweep, sans re-mint ni
      // nouvelle acceptation du NFT.
      await this.closeStarterOnce(userId, wallet.address);
      return;
    }
    if (reward.sellOfferId === null) throw new Error("Offre NFT First Trade absente");
    const accepted = await this.deps.gateway.acceptNft(
      await this.deps.wallets.decryptSeed(wallet),
      reward.sellOfferId,
    );
    await this.deps.store.markClaimed(userId, FIRST_TRADE, accepted.hash, this.now());
    await this.closeStarterOnce(userId, wallet.address);
  }

  /**
   * Clôture le wallet 1 après le claim du wallet 2 : AccountDelete taggé, le
   * solde restant part à la destination configurée. Best-effort : un échec
   * réseau laisse le wallet 1 en "funded" (observable au statut, récupérable
   * par la console admin qui porte déjà deleteAccount) — le claim, lui, est
   * terminé. Pas de risque de double dépense : un compte supprimé n'existe
   * plus, un retry échoue sans effet financier.
   */
  private async closeStarterOnce(userId: string, rewardAddress: string): Promise<void> {
    const starter = await this.deps.wallets.get(userId);
    if (starter === null) return;
    // Un éventuel retry après une clôture confirmée ne resoumet jamais
    // AccountDelete ; il termine seulement l'effacement local si nécessaire.
    if (starter.status === "deleted" || starter.status === "reclaimed") {
      await this.deps.wallets.eraseSeed(userId);
      return;
    }
    if (starter.status !== "funded") return;
    const destination =
      this.deps.deleteRemainderDestination === "funder" &&
      this.deps.funderAddress !== undefined
        ? this.deps.funderAddress
        : rewardAddress;
    try {
      const deleted = await this.deps.gateway.deleteAccount(
        await this.deps.wallets.decryptSeed(starter),
        destination,
        ACCOUNT_DELETE_FEE_DROPS,
      );
      await this.deps.wallets.markDeleted(userId, deleted.hash);
      await this.deps.wallets.eraseSeed(userId);
    } catch {
      // Gel explicite : le statut "funded" persistant signale la clôture à
      // reprendre ; jamais de retry automatique aveugle.
    }
  }
}
