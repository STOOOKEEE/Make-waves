import { Wallet } from "xrpl";
import {
  decryptPrivateKey,
  encryptPrivateKey,
  readMasterKey,
  type EncryptedPayload,
} from "@tide/mcp/crypto";
import type { XrplCustodialWalletGateway } from "@tide/xrpl";
import type { PaperWallet, PaperWalletStore } from "../store/paper-wallet-store";

/** Wallet 2 : réserve de base + première NFTokenPage + marge de frais. */
export const PAPER_REWARD_WALLET_FUNDING_DROPS = "1210000";

/**
 * Wallet 1 : réserve de base + budget transféré au wallet 2 (1,21) + coût
 * spécial de l'AccountDelete de clôture (0,2) + restant transmis à la
 * destination du delete (wallet 2 par défaut). Minimum pratique pour garder
 * la réserve du wallet 1 pendant le Payment vers le wallet 2.
 */
export const PAPER_WALLET_FUNDING_DROPS = "2220000";

/** Coût spécial d'un AccountDelete (owner reserve, 0,2 XRP — doc XRPL vérifiée le 27/08/2026). */
export const ACCOUNT_DELETE_FEE_DROPS = "200000";

export class PaperWalletFundingFailedError extends Error {
  constructor() {
    super("Funding du wallet Paper en attente de reprise opérateur");
    this.name = "PaperWalletFundingFailedError";
  }
}

export class PaperWalletReclaimedError extends Error {
  constructor() {
    super("Wallet Paper déjà détruit et fonds récupérés");
    this.name = "PaperWalletReclaimedError";
  }
}

export class PaperWalletFundingLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaperWalletFundingLimitError";
  }
}

export class PaperWalletUnavailableError extends Error {
  constructor() {
    super("Programme de comptes XRPL Paper indisponible");
    this.name = "PaperWalletUnavailableError";
  }
}

export class PaperWalletNotClaimedError extends Error {
  constructor() {
    super("Réclame ton premier compte XRPL avant de trader");
    this.name = "PaperWalletNotClaimedError";
  }
}

export class PaperRewardWalletNotClaimedError extends Error {
  constructor() {
    super("Réclame d'abord le compte NFT débloqué par ton premier trade");
    this.name = "PaperRewardWalletNotClaimedError";
  }
}

export interface PaperWalletServiceDeps {
  readonly store: PaperWalletStore;
  readonly rewardStore: PaperWalletStore;
  readonly gateway: Pick<XrplCustodialWalletGateway, "fundWallet" | "fundWalletFromSeed">;
  /** 32 octets hex, réservés aux wallets Paper (ne pas réutiliser pour les agents). */
  readonly masterKeyHex: string;
  readonly masterKeyId: string;
  readonly network?: "mainnet";
  /** Limites persistantes appliquées avant chaque Payment du funder. */
  readonly maxFundedWallets?: number;
  readonly maxFundedWalletsPerDay?: number;
  readonly now?: () => number;
}

/**
 * Paire de wallets XRPL du funnel Paper. Le premier est réclamé explicitement
 * avant de trader ; le second est réclamé après le premier trade et financé
 * par le premier. Les clés sont chiffrées AES-GCM et ne sortent jamais du back.
 */
export class PaperWalletService {
  private readonly now: () => number;
  private readonly funding = new Map<string, Promise<PaperWallet>>();
  private fundingTail: Promise<void> = Promise.resolve();

  constructor(private readonly deps: PaperWalletServiceDeps) {
    this.now = deps.now ?? Date.now;
  }

  async ensureFunded(userId: string): Promise<PaperWallet> {
    const key = `starter:${userId}`;
    const running = this.funding.get(key);
    if (running !== undefined) return running;
    const operation = this.ensureFundedOnce(userId);
    this.funding.set(key, operation);
    try {
      return await operation;
    } finally {
      this.funding.delete(key);
    }
  }

  /** Claim du wallet 2, financé et activé par le wallet 1 déjà réclamé. */
  async ensureRewardFunded(userId: string): Promise<PaperWallet> {
    const key = `reward:${userId}`;
    const running = this.funding.get(key);
    if (running !== undefined) return running;
    const operation = this.ensureRewardFundedOnce(userId);
    this.funding.set(key, operation);
    try {
      return await operation;
    } finally {
      this.funding.delete(key);
    }
  }

  /**
   * Génère l'adresse initiale et persiste sa seed chiffrée sans envoyer de XRP.
   * Cette méthode reste utile à la console admin ; le parcours public appelle
   * `ensureFunded` seulement après un clic explicite de l'utilisateur.
   */
  async ensureCreated(userId: string): Promise<PaperWallet> {
    return this.ensureCreatedIn(this.deps.store, userId);
  }

  private async ensureRewardCreated(userId: string): Promise<PaperWallet> {
    return this.ensureCreatedIn(this.deps.rewardStore, userId);
  }

  private async ensureCreatedIn(store: PaperWalletStore, userId: string): Promise<PaperWallet> {
    const existing = await store.get(userId);
    if (existing !== null) return existing;
    const generated = Wallet.generate();
    if (!generated.seed) throw new Error("Wallet.generate() returned no seed");
    const masterKey = readMasterKey(this.deps.masterKeyHex);
    const encrypted = encryptPrivateKey(generated.seed, masterKey, this.deps.masterKeyId);
    const wallet: PaperWallet = {
      userId,
      address: generated.classicAddress,
      encryptedSeed: JSON.stringify(encrypted),
      masterKeyId: encrypted.masterKeyId,
      status: "pending_funding",
      fundingTxHash: null,
      fundedAt: null,
      createdAt: this.now(),
      deleteTxHash: null,
    };
    await store.create(wallet);
    return (await store.get(userId)) ?? wallet;
  }

  /** Statut public du wallet technique ; la seed chiffrée reste dans le store. */
  async get(userId: string): Promise<PaperWallet | null> {
    return this.deps.store.get(userId);
  }

  /** Statut public du wallet NFT secondaire. */
  async getReward(userId: string): Promise<PaperWallet | null> {
    return this.deps.rewardStore.get(userId);
  }

  /** Garde backend : le clic de claim du wallet 1 doit précéder tout trade. */
  async requireFunded(userId: string): Promise<PaperWallet> {
    const wallet = await this.deps.store.get(userId);
    // "deleted" = financé puis clôturé par AccountDelete après le claim du
    // wallet 2 : le compte a bien été réclamé, les trades restent autorisés.
    if (wallet?.status !== "funded" && wallet?.status !== "deleted") {
      throw new PaperWalletNotClaimedError();
    }
    return wallet;
  }

  /** Les récompenses suivantes restent cantonnées au wallet 2. */
  async requireRewardFunded(userId: string): Promise<PaperWallet> {
    const wallet = await this.deps.rewardStore.get(userId);
    if (wallet?.status !== "funded") throw new PaperRewardWalletNotClaimedError();
    return wallet;
  }

  private async ensureFundedOnce(userId: string): Promise<PaperWallet> {
    let wallet = await this.ensureCreated(userId);
    if (wallet.status === "funding_failed" || wallet.status === "funding_in_progress") {
      throw new PaperWalletFundingFailedError();
    }
    if (wallet.status === "reclaimed") throw new PaperWalletReclaimedError();
    if (wallet.status === "pending_funding") {
      wallet = await this.withFundingLock(async () => {
        const current = await this.deps.store.get(userId);
        if (current === null) throw new Error("Wallet Paper introuvable");
        if (current.status !== "pending_funding") return current;
        await this.assertFundingBudget();
        let fundingStarted = false;
        try {
          // Persiste l'intention AVANT le submit. Après un crash ou timeout, on
          // gèle le dossier pour reprise opérateur : jamais de double funding.
          if (!(await this.deps.store.markFundingInProgress(userId))) {
            throw new PaperWalletFundingFailedError();
          }
          fundingStarted = true;
          const funded = await this.deps.gateway.fundWallet(
            current.address,
            PAPER_WALLET_FUNDING_DROPS,
          );
          const fundedAt = this.now();
          await this.deps.store.markFunded(userId, funded.hash, fundedAt);
          return (
            (await this.deps.store.get(userId)) ?? {
              ...current,
              status: "funded" as const,
              fundingTxHash: funded.hash,
              fundedAt,
            }
          );
        } catch (error) {
          // Une erreur réseau après soumission est ambiguë : ne jamais réessayer
          // automatiquement, sinon un user peut être financé deux fois.
          if (fundingStarted) await this.deps.store.markFundingFailed(userId);
          if (error instanceof PaperWalletFundingLimitError) throw error;
          throw new PaperWalletFundingFailedError();
        }
      });
    }
    return wallet;
  }

  private async ensureRewardFundedOnce(userId: string): Promise<PaperWallet> {
    const starter = await this.requireFunded(userId);
    let reward = await this.ensureRewardCreated(userId);
    if (reward.status === "funding_failed" || reward.status === "funding_in_progress") {
      throw new PaperWalletFundingFailedError();
    }
    if (reward.status === "reclaimed") throw new PaperWalletReclaimedError();
    if (reward.status !== "pending_funding") return reward;

    reward = await this.withFundingLock(async () => {
      const current = await this.deps.rewardStore.get(userId);
      if (current === null) throw new Error("Wallet NFT Paper introuvable");
      if (current.status !== "pending_funding") return current;
      let fundingStarted = false;
      try {
        // Même politique anti-double-submit que le funding opérateur : une
        // réponse réseau ambiguë gèle le dossier pour reprise manuelle.
        if (!(await this.deps.rewardStore.markFundingInProgress(userId))) {
          throw new PaperWalletFundingFailedError();
        }
        fundingStarted = true;
        const funded = await this.deps.gateway.fundWalletFromSeed(
          await this.decryptSeed(starter),
          current.address,
          PAPER_REWARD_WALLET_FUNDING_DROPS,
        );
        const fundedAt = this.now();
        await this.deps.rewardStore.markFunded(userId, funded.hash, fundedAt);
        return (
          (await this.deps.rewardStore.get(userId)) ?? {
            ...current,
            status: "funded" as const,
            fundingTxHash: funded.hash,
            fundedAt,
          }
        );
      } catch {
        if (fundingStarted) await this.deps.rewardStore.markFundingFailed(userId);
        throw new PaperWalletFundingFailedError();
      }
    });
    return reward;
  }

  private async assertFundingBudget(): Promise<void> {
    const totalLimit = this.deps.maxFundedWallets;
    if (totalLimit !== undefined && (await this.deps.store.countFunded()) >= totalLimit) {
      throw new PaperWalletFundingLimitError(
        `Plafond ${this.deps.network ?? "mainnet"} atteint (${String(totalLimit)} wallets)`,
      );
    }
    const dailyLimit = this.deps.maxFundedWalletsPerDay;
    if (dailyLimit !== undefined) {
      const now = this.now();
      const startOfUtcDay = Math.floor(now / 86_400_000) * 86_400_000;
      if ((await this.deps.store.countFundedSince(startOfUtcDay)) >= dailyLimit) {
        throw new PaperWalletFundingLimitError(
          `Plafond quotidien atteint (${String(dailyLimit)} wallets)`,
        );
      }
    }
  }

  private async withFundingLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.fundingTail;
    let release = (): void => undefined;
    this.fundingTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  /** Clôture tracée du wallet 1 (AccountDelete) après le claim du wallet 2. */
  async markDeleted(userId: string, deleteTxHash: string): Promise<void> {
    await this.deps.store.markDeleted(userId, deleteTxHash);
  }

  /** Efface la seed après un AccountDelete validé, en conservant le tombstone. */
  async eraseSeed(userId: string): Promise<boolean> {
    return this.deps.store.eraseSeed(userId);
  }

  async decryptSeed(wallet: PaperWallet): Promise<string> {
    if (wallet.encryptedSeed === "") {
      throw new Error("Seed du wallet Paper déjà effacée après sa clôture");
    }
    const payload = JSON.parse(wallet.encryptedSeed) as EncryptedPayload;
    return decryptPrivateKey(payload, readMasterKey(this.deps.masterKeyHex));
  }
}
