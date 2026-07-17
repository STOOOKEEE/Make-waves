/** Wallet XRPL custodial dédié à un compte Paper. La seed ne sort jamais chiffrée. */
export interface PaperWallet {
  readonly userId: string;
  readonly address: string;
  readonly encryptedSeed: string;
  readonly masterKeyId: string;
  readonly status:
    | "pending_funding"
    | "funding_in_progress"
    | "funded"
    | "funding_failed"
    | "reclaimed";
  readonly fundingTxHash: string | null;
  readonly createdAt: number;
}

export interface PaperWalletStore {
  get(userId: string): Promise<PaperWallet | null>;
  create(wallet: PaperWallet): Promise<void>;
  /** Transition atomique pending → in-progress. */
  markFundingInProgress(userId: string): Promise<boolean>;
  markFunded(userId: string, fundingTxHash: string): Promise<void>;
  markFundingFailed(userId: string): Promise<void>;
  markReclaimed(userId: string): Promise<void>;
}

export class InMemoryPaperWalletStore implements PaperWalletStore {
  private readonly wallets = new Map<string, PaperWallet>();

  async get(userId: string): Promise<PaperWallet | null> {
    return this.wallets.get(userId) ?? null;
  }

  async create(wallet: PaperWallet): Promise<void> {
    if (!this.wallets.has(wallet.userId)) this.wallets.set(wallet.userId, wallet);
  }

  async markFunded(userId: string, fundingTxHash: string): Promise<void> {
    const current = this.wallets.get(userId);
    if (!current) throw new Error(`Paper wallet introuvable: ${userId}`);
    this.wallets.set(userId, { ...current, status: "funded", fundingTxHash });
  }

  async markFundingInProgress(userId: string): Promise<boolean> {
    const current = this.wallets.get(userId);
    if (!current) throw new Error(`Paper wallet introuvable: ${userId}`);
    if (current.status !== "pending_funding") return false;
    this.wallets.set(userId, { ...current, status: "funding_in_progress" });
    return true;
  }

  async markFundingFailed(userId: string): Promise<void> {
    const current = this.wallets.get(userId);
    if (!current) throw new Error(`Paper wallet introuvable: ${userId}`);
    this.wallets.set(userId, { ...current, status: "funding_failed" });
  }

  async markReclaimed(userId: string): Promise<void> {
    const current = this.wallets.get(userId);
    if (!current) throw new Error(`Paper wallet introuvable: ${userId}`);
    this.wallets.set(userId, { ...current, status: "reclaimed" });
  }
}
