import type { NftIssuer, XrplCustodialWalletGateway } from "@tide/xrpl";
import type { PaperWalletService } from "./paper-wallet-service";
import type { WeeklyReward, WeeklyRewardStore } from "../store/weekly-reward-store";

/** Taxon XLS-20 du programme « Weekly Trade Proof ». */
export const WEEKLY_REWARD_TAXON = 100;

export class WeeklyRewardUnavailableError extends Error {
  constructor() { super("Programme NFT hebdomadaire indisponible"); this.name = "WeeklyRewardUnavailableError"; }
}
export class WeeklyRewardNotEligibleError extends Error {
  constructor() { super("Aucun trade éligible pour cette semaine"); this.name = "WeeklyRewardNotEligibleError"; }
}
export class WeeklyRewardAlreadyClaimedError extends Error {
  constructor() { super("Récompense hebdomadaire déjà claim"); this.name = "WeeklyRewardAlreadyClaimedError"; }
}
export class WeeklyRewardClaimInProgressError extends Error {
  constructor() { super("Claim NFT hebdomadaire en cours de traitement"); this.name = "WeeklyRewardClaimInProgressError"; }
}

export interface WeeklyRewardDto {
  readonly week: string;
  readonly qualifiedAt: number;
  readonly status: WeeklyReward["status"];
  readonly nftTokenId: string | null;
  readonly claimedAt: number | null;
}

export interface WeeklyRewardServiceDeps {
  readonly store: WeeklyRewardStore;
  readonly wallets: Pick<PaperWalletService, "requireRewardFunded" | "decryptSeed">;
  readonly issuer: NftIssuer;
  readonly gateway: Pick<XrplCustodialWalletGateway, "acceptNft">;
  readonly metadataBaseUrl: string;
  readonly now?: () => number;
}

/** Lundi UTC de la semaine contenant `at`, au format stable YYYY-MM-DD. */
export function weekKey(at: number): string {
  const date = new Date(at);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

/** Une carte/NFT par semaine active, jamais un mint automatique à chaque ordre. */
export class WeeklyRewardService {
  private readonly now: () => number;
  private readonly claims = new Map<string, Promise<WeeklyRewardDto>>();
  constructor(private readonly deps: WeeklyRewardServiceDeps) { this.now = deps.now ?? Date.now; }

  async recordTrade(userId: string): Promise<void> {
    const qualifiedAt = this.now();
    await this.deps.store.ensureEligible({
      userId, week: weekKey(qualifiedAt), qualifiedAt, status: "eligible",
      nftTokenId: null, sellOfferId: null, claimTxHash: null, claimedAt: null,
    });
  }

  async list(userId: string): Promise<readonly WeeklyRewardDto[]> {
    const rewards = await this.deps.store.list(userId);
    return rewards.map((reward) => this.toDto(reward));
  }

  async claim(userId: string, week: string): Promise<WeeklyRewardDto> {
    const key = `${userId}:${week}`;
    const running = this.claims.get(key);
    if (running !== undefined) return running;
    const operation = this.claimOnce(userId, week);
    this.claims.set(key, operation);
    try {
      return await operation;
    } finally {
      this.claims.delete(key);
    }
  }

  private async claimOnce(userId: string, week: string): Promise<WeeklyRewardDto> {
    const reward = await this.deps.store.get(userId, week);
    if (reward === null) throw new WeeklyRewardNotEligibleError();
    if (reward.status === "claimed") throw new WeeklyRewardAlreadyClaimedError();
    // Toutes les preuves NFT vivent dans le compte secondaire. Son claim First
    // Trade explicite doit donc avoir eu lieu avant une récompense hebdomadaire.
    const wallet = await this.deps.wallets.requireRewardFunded(userId);

    let pending = reward;
    if (pending.status === "eligible") {
      if (!(await this.deps.store.startMinting(userId, week))) {
        throw new WeeklyRewardClaimInProgressError();
      }
      const issued = await this.deps.issuer.issueBadge({
        uri: `${this.deps.metadataBaseUrl}/nft-metadata/weekly/${week}`,
        taxon: WEEKLY_REWARD_TAXON,
        destination: wallet.address,
      });
      await this.deps.store.markOfferPending(userId, week, issued.nftTokenId, issued.sellOfferId);
      pending = (await this.deps.store.get(userId, week)) ?? pending;
    }
    if (pending.status === "minting") throw new WeeklyRewardClaimInProgressError();
    if (pending.sellOfferId === null) throw new WeeklyRewardUnavailableError();
    const claim = await this.deps.gateway.acceptNft(
      await this.deps.wallets.decryptSeed(wallet),
      pending.sellOfferId,
    );
    const claimedAt = this.now();
    await this.deps.store.markClaimed(userId, week, claim.hash, claimedAt);
    const result = await this.deps.store.get(userId, week);
    if (result === null) throw new WeeklyRewardUnavailableError();
    return this.toDto(result);
  }

  private toDto(reward: WeeklyReward): WeeklyRewardDto {
    return {
      week: reward.week, qualifiedAt: reward.qualifiedAt, status: reward.status,
      nftTokenId: reward.nftTokenId, claimedAt: reward.claimedAt,
    };
  }
}
