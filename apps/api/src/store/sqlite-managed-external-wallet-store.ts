import type { DatabaseSync } from "./sqlite";
import type {
  ManagedExternalWallet,
  ManagedExternalWalletStore,
} from "./managed-external-wallet-store";

const TABLE = "managed_external_wallets";

function toWallet(row: Record<string, unknown>): ManagedExternalWallet {
  return {
    address: String(row["address"]),
    label: String(row["label"]),
    encryptedSeed: String(row["encrypted_seed"]),
    masterKeyId: String(row["master_key_id"]),
    createdAt: Number(row["created_at"]),
  };
}

/** Coffre SQLite : seules les seeds chiffrées sont persistées. */
export class SqliteManagedExternalWalletStore implements ManagedExternalWalletStore {
  constructor(private readonly db: DatabaseSync) {}

  async create(wallet: ManagedExternalWallet): Promise<void> {
    this.db.prepare(
      `INSERT INTO ${TABLE} (
        address, label, encrypted_seed, master_key_id, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      wallet.address,
      wallet.label,
      wallet.encryptedSeed,
      wallet.masterKeyId,
      wallet.createdAt,
    );
  }

  async get(address: string): Promise<ManagedExternalWallet | null> {
    const row = this.db.prepare(`SELECT * FROM ${TABLE} WHERE address = ?`).get(address);
    return row === undefined ? null : toWallet(row as Record<string, unknown>);
  }

  async list(): Promise<readonly ManagedExternalWallet[]> {
    return (this.db
      .prepare(`SELECT * FROM ${TABLE} ORDER BY created_at DESC`)
      .all() as Record<string, unknown>[]).map(toWallet);
  }

  async delete(address: string): Promise<boolean> {
    return this.db.prepare(`DELETE FROM ${TABLE} WHERE address = ?`).run(address).changes === 1;
  }
}
