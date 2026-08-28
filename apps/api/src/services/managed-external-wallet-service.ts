import { Wallet } from "xrpl";
import type { PriceMap } from "@tide/core";
import {
  decryptPrivateKey,
  encryptPrivateKey,
  readMasterKey,
  type EncryptedPayload,
} from "@tide/mcp/crypto";
import type { BadgeService, BadgeStatus } from "./badge-service";
import type { PaperService } from "./paper-service";
import type {
  ManagedExternalWallet,
  ManagedExternalWalletStore,
} from "../store/managed-external-wallet-store";

const MAX_LABEL_LENGTH = 80;
const MAX_SEED_LENGTH = 128;

export interface ManagedExternalWalletBadge {
  readonly code: string;
  readonly title: string;
  readonly earned: boolean;
  readonly status: BadgeStatus["status"];
  readonly nftTokenId: string | null;
}

/** DTO sûr : aucune seed, même chiffrée, ne franchit la frontière HTTP. */
export interface ManagedExternalWalletSummary {
  readonly address: string;
  readonly label: string;
  readonly createdAt: number;
  readonly paperTrades: number;
  readonly badges: readonly ManagedExternalWalletBadge[];
}

export interface ManagedExternalWalletClaimResult {
  readonly address: string;
  readonly badgeCode: string;
  readonly nftTokenId: string;
  readonly sellOfferId: string;
  readonly claimHash: string;
}

export interface ManagedExternalWalletServiceDeps {
  readonly store: ManagedExternalWalletStore;
  readonly badges: Pick<BadgeService, "statusFor" | "claimForSign" | "confirmClaim">;
  readonly paper: Pick<PaperService, "ensureAccount" | "placeOrder" | "tradeCountOf">;
  readonly getPrices: () => PriceMap;
  readonly gateway: {
    acceptNft(seed: string, sellOfferId: string): Promise<{ readonly hash: string }>;
  };
  readonly masterKeyHex: string;
  readonly masterKeyId: string;
  readonly now?: () => number;
}

/**
 * Coffre opérateur pour des wallets qui suivent le parcours externe : leur
 * adresse est leur userId Paper, aucun wallet 1/2 n'est créé ou financé, et
 * l'acceptation du NFT est signée côté serveur avec la seed déchiffrée en mémoire.
 */
export class ManagedExternalWalletService {
  private readonly now: () => number;
  private readonly claims = new Map<string, Promise<ManagedExternalWalletClaimResult>>();

  constructor(private readonly deps: ManagedExternalWalletServiceDeps) {
    this.now = deps.now ?? Date.now;
    // Valide la configuration au boot, avant qu'une seed puisse être importée.
    readMasterKey(deps.masterKeyHex);
  }

  async list(): Promise<readonly ManagedExternalWalletSummary[]> {
    return Promise.all((await this.deps.store.list()).map((wallet) => this.summary(wallet)));
  }

  async importSeed(labelInput: string, seedInput: string): Promise<ManagedExternalWalletSummary> {
    const label = labelInput.trim();
    const seed = seedInput.trim();
    if (label === "" || label.length > MAX_LABEL_LENGTH) {
      throw new Error(`Label requis (maximum ${String(MAX_LABEL_LENGTH)} caractères)`);
    }
    if (seed === "" || seed.length > MAX_SEED_LENGTH) {
      throw new Error("Seed XRPL invalide");
    }

    let xrplWallet: Wallet;
    try {
      xrplWallet = Wallet.fromSeed(seed);
    } catch {
      throw new Error("Seed XRPL invalide");
    }
    if ((await this.deps.store.get(xrplWallet.classicAddress)) !== null) {
      throw new Error("Ce wallet est déjà présent dans le coffre");
    }

    const encrypted = encryptPrivateKey(
      seed,
      readMasterKey(this.deps.masterKeyHex),
      this.deps.masterKeyId,
    );
    const wallet: ManagedExternalWallet = {
      address: xrplWallet.classicAddress,
      label,
      encryptedSeed: JSON.stringify(encrypted),
      masterKeyId: encrypted.masterKeyId,
      createdAt: this.now(),
    };
    await this.deps.store.create(wallet);
    // L'identité Paper utilise directement l'adresse, comme un login GemWallet.
    this.deps.paper.ensureAccount(wallet.address);
    return this.summary(wallet);
  }

  /** Ajoute un petit trade XRP/RLUSD Paper, sans aucune transaction XRPL. */
  async recordPaperTrade(address: string): Promise<ManagedExternalWalletSummary> {
    const wallet = await this.required(address);
    const price = this.deps.getPrices()["XRP"];
    if (price === undefined || !Number.isFinite(price) || price <= 0) {
      throw new Error("Prix XRP indisponible");
    }
    this.deps.paper.ensureAccount(wallet.address);
    this.deps.paper.placeOrder(wallet.address, {
      pair: { base: "XRP", quote: "RLUSD" },
      side: "buy",
      amount: 1,
      price,
    });
    return this.summary(wallet);
  }

  async claimBadge(
    address: string,
    badgeCode: string,
  ): Promise<ManagedExternalWalletClaimResult> {
    const key = `${address}:${badgeCode}`;
    const running = this.claims.get(key);
    if (running !== undefined) return running;
    const operation = this.claimBadgeOnce(address, badgeCode);
    this.claims.set(key, operation);
    try {
      return await operation;
    } finally {
      this.claims.delete(key);
    }
  }

  async remove(address: string, confirmation: string): Promise<{ readonly deleted: true }> {
    if (confirmation !== address) {
      throw new Error("Confirmation d'adresse incorrecte");
    }
    await this.required(address);
    if (!(await this.deps.store.delete(address))) {
      throw new Error("Wallet introuvable dans le coffre");
    }
    // L'identité Paper et l'historique de claims restent intacts : retirer la
    // custody ne doit jamais effacer les preuves financières ou permettre un remint.
    return { deleted: true };
  }

  private async claimBadgeOnce(
    address: string,
    badgeCode: string,
  ): Promise<ManagedExternalWalletClaimResult> {
    const wallet = await this.required(address);
    const seed = this.decryptSeed(wallet);
    const claim = await this.deps.badges.claimForSign(address, address, badgeCode);
    const accepted = await this.deps.gateway.acceptNft(seed, claim.sellOfferId);
    await this.deps.badges.confirmClaim(address, badgeCode, accepted.hash);
    return {
      address,
      badgeCode,
      nftTokenId: claim.nftTokenId,
      sellOfferId: claim.sellOfferId,
      claimHash: accepted.hash,
    };
  }

  private async required(address: string): Promise<ManagedExternalWallet> {
    const wallet = await this.deps.store.get(address);
    if (wallet === null) throw new Error("Wallet introuvable dans le coffre");
    return wallet;
  }

  private decryptSeed(wallet: ManagedExternalWallet): string {
    if (wallet.masterKeyId !== this.deps.masterKeyId) {
      throw new Error(`Clé maître indisponible pour ${wallet.masterKeyId}`);
    }
    let payload: EncryptedPayload;
    try {
      payload = JSON.parse(wallet.encryptedSeed) as EncryptedPayload;
      const seed = decryptPrivateKey(payload, readMasterKey(this.deps.masterKeyHex));
      if (Wallet.fromSeed(seed).classicAddress !== wallet.address) {
        throw new Error("adresse incohérente");
      }
      return seed;
    } catch {
      throw new Error("Seed chiffrée illisible ou incohérente");
    }
  }

  private async summary(
    wallet: ManagedExternalWallet,
  ): Promise<ManagedExternalWalletSummary> {
    const badges = await this.deps.badges.statusFor(wallet.address);
    let paperTrades = 0;
    try {
      paperTrades = this.deps.paper.tradeCountOf(wallet.address);
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "AccountNotFoundError") throw error;
    }
    return {
      address: wallet.address,
      label: wallet.label,
      createdAt: wallet.createdAt,
      paperTrades,
      badges: badges.map((badge) => ({
        code: badge.code,
        title: badge.title,
        earned: badge.earned,
        status: badge.status,
        nftTokenId: badge.nftTokenId,
      })),
    };
  }
}
