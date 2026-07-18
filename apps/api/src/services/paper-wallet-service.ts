import { Wallet } from "xrpl";
import {
  decryptPrivateKey,
  encryptPrivateKey,
  readMasterKey,
  type EncryptedPayload,
} from "@tide/mcp/crypto";
import type { XrplCustodialWalletGateway } from "@tide/xrpl";
import type { PaperWallet, PaperWalletStore } from "../store/paper-wallet-store";

/** Funding sûr : base reserve 1 XRP + première NFTokenPage 0.2 XRP + frais. */
export const PAPER_WALLET_FUNDING_DROPS = "1250000";

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

export interface PaperWalletServiceDeps {
  readonly store: PaperWalletStore;
  readonly gateway: Pick<XrplCustodialWalletGateway, "fundWallet">;
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
 * Wallet XRPL généré au premier trade Paper. La clé est chiffrée AES-GCM ; le
 * front ne la reçoit jamais. Les services de récompense peuvent signer avec
 * cette clé en mémoire ; aucun endpoint HTTP ne l'expose.
 */
export class PaperWalletService {
  private readonly now: () => number;
  private readonly funding = new Map<string, Promise<PaperWallet>>();
  private fundingTail: Promise<void> = Promise.resolve();

  constructor(private readonly deps: PaperWalletServiceDeps) {
    this.now = deps.now ?? Date.now;
  }

  async ensureFunded(userId: string): Promise<PaperWallet> {
    const running = this.funding.get(userId);
    if (running !== undefined) return running;
    const operation = this.ensureFundedOnce(userId);
    this.funding.set(userId, operation);
    try {
      return await operation;
    } finally {
      this.funding.delete(userId);
    }
  }

  /**
   * Génère l'adresse et persiste sa seed chiffrée sans envoyer de XRP. Ainsi le
   * wallet est déjà associé à la session à l'arrivée, mais n'existe sur le
   * ledger qu'après le premier trade et son Payment de funding.
   */
  async ensureCreated(userId: string): Promise<PaperWallet> {
    const existing = await this.deps.store.get(userId);
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
    };
    await this.deps.store.create(wallet);
    return (await this.deps.store.get(userId)) ?? wallet;
  }

  /** Statut public du wallet technique ; la seed chiffrée reste dans le store. */
  async get(userId: string): Promise<PaperWallet | null> {
    return this.deps.store.get(userId);
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

  async decryptSeed(wallet: PaperWallet): Promise<string> {
    const payload = JSON.parse(wallet.encryptedSeed) as EncryptedPayload;
    return decryptPrivateKey(payload, readMasterKey(this.deps.masterKeyHex));
  }
}
