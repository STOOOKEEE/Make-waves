/** Wallet externe dont la seed reste chiffrée dans le coffre opérateur. */
export interface ManagedExternalWallet {
  readonly address: string;
  readonly label: string;
  /** Sérialisation JSON d'un payload AES-256-GCM, jamais exposée par l'API. */
  readonly encryptedSeed: string;
  readonly masterKeyId: string;
  readonly createdAt: number;
}

export interface ManagedExternalWalletStore {
  create(wallet: ManagedExternalWallet): Promise<void>;
  get(address: string): Promise<ManagedExternalWallet | null>;
  list(): Promise<readonly ManagedExternalWallet[]>;
  delete(address: string): Promise<boolean>;
}

/** Store mémoire réservé aux tests. */
export class InMemoryManagedExternalWalletStore implements ManagedExternalWalletStore {
  private readonly wallets = new Map<string, ManagedExternalWallet>();

  async create(wallet: ManagedExternalWallet): Promise<void> {
    if (this.wallets.has(wallet.address)) {
      throw new Error("Ce wallet est déjà présent dans le coffre");
    }
    this.wallets.set(wallet.address, wallet);
  }

  async get(address: string): Promise<ManagedExternalWallet | null> {
    return this.wallets.get(address) ?? null;
  }

  async list(): Promise<readonly ManagedExternalWallet[]> {
    return [...this.wallets.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  async delete(address: string): Promise<boolean> {
    return this.wallets.delete(address);
  }
}
