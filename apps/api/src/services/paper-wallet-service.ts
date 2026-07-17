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

export interface PaperWalletServiceDeps {
  readonly store: PaperWalletStore;
  readonly gateway: Pick<XrplCustodialWalletGateway, "fundWallet">;
  /** 32 octets hex, réservés aux wallets Paper (ne pas réutiliser pour les agents). */
  readonly masterKeyHex: string;
  readonly masterKeyId: string;
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

  /** Statut public du wallet technique ; la seed chiffrée reste dans le store. */
  async get(userId: string): Promise<PaperWallet | null> {
    return this.deps.store.get(userId);
  }

  private async ensureFundedOnce(userId: string): Promise<PaperWallet> {
    let wallet = await this.deps.store.get(userId);
    if (wallet === null) {
      const generated = Wallet.generate();
      if (!generated.seed) throw new Error("Wallet.generate() returned no seed");
      const masterKey = readMasterKey(this.deps.masterKeyHex);
      const encrypted = encryptPrivateKey(generated.seed, masterKey, this.deps.masterKeyId);
      wallet = {
        userId,
        address: generated.classicAddress,
        encryptedSeed: JSON.stringify(encrypted),
        masterKeyId: encrypted.masterKeyId,
        status: "pending_funding",
        fundingTxHash: null,
        createdAt: this.now(),
      };
      await this.deps.store.create(wallet);
      // Un INSERT OR IGNORE peut avoir gagné une course : on relit la source de vérité.
      wallet = (await this.deps.store.get(userId)) ?? wallet;
    }
    if (wallet.status === "funding_failed" || wallet.status === "funding_in_progress") {
      throw new PaperWalletFundingFailedError();
    }
    if (wallet.status === "reclaimed") throw new PaperWalletReclaimedError();
    if (wallet.status === "pending_funding") {
      let fundingStarted = false;
      try {
        // Persiste l'intention AVANT le submit. Après un crash ou timeout, on
        // gèle le dossier pour reprise opérateur : jamais de double funding.
        if (!(await this.deps.store.markFundingInProgress(userId))) {
          throw new PaperWalletFundingFailedError();
        }
        fundingStarted = true;
        const funded = await this.deps.gateway.fundWallet(
          wallet.address,
          PAPER_WALLET_FUNDING_DROPS,
        );
        await this.deps.store.markFunded(userId, funded.hash);
        wallet =
          (await this.deps.store.get(userId)) ?? {
            ...wallet,
            status: "funded",
            fundingTxHash: funded.hash,
          };
      } catch {
        // Une erreur réseau après soumission est ambiguë : ne jamais réessayer
        // automatiquement, sinon un user peut être financé deux fois.
        if (fundingStarted) await this.deps.store.markFundingFailed(userId);
        throw new PaperWalletFundingFailedError();
      }
    }
    return wallet;
  }

  async decryptSeed(wallet: PaperWallet): Promise<string> {
    const payload = JSON.parse(wallet.encryptedSeed) as EncryptedPayload;
    return decryptPrivateKey(payload, readMasterKey(this.deps.masterKeyHex));
  }
}
