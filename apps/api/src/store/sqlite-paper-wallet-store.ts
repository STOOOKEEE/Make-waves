import type { DatabaseSync } from "./sqlite";
import type { PaperWallet, PaperWalletStore } from "./paper-wallet-store";

function rowToWallet(row: unknown): PaperWallet {
  const value = row as Record<string, unknown>;
  return {
    userId: String(value["user_id"]),
    address: String(value["address"]),
    encryptedSeed: String(value["encrypted_seed"]),
    masterKeyId: String(value["master_key_id"]),
    status: parseStatus(String(value["status"])),
    fundingTxHash: value["funding_tx_hash"] === null ? null : String(value["funding_tx_hash"]),
    fundedAt: value["funded_at"] === null ? null : Number(value["funded_at"]),
    createdAt: Number(value["created_at"]),
  };
}

const TABLE = "paper_wallets_mainnet";

export class SqlitePaperWalletStore implements PaperWalletStore {
  private readonly table: string;

  constructor(private readonly db: DatabaseSync) {
    this.table = TABLE;
  }

  async get(userId: string): Promise<PaperWallet | null> {
    const row = this.db.prepare(`SELECT * FROM ${this.table} WHERE user_id = ?`).get(userId);
    return row === undefined ? null : rowToWallet(row);
  }

  async list(): Promise<readonly PaperWallet[]> {
    return this.db
      .prepare(`SELECT * FROM ${this.table} ORDER BY created_at DESC`)
      .all()
      .map(rowToWallet);
  }

  async create(wallet: PaperWallet): Promise<void> {
    this.db.prepare(
      `INSERT OR IGNORE INTO ${this.table} (
        user_id, address, encrypted_seed, master_key_id, status, funding_tx_hash, funded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      wallet.userId,
      wallet.address,
      wallet.encryptedSeed,
      wallet.masterKeyId,
      wallet.status,
      wallet.fundingTxHash,
      wallet.fundedAt,
      wallet.createdAt,
    );
  }

  async markFunded(userId: string, fundingTxHash: string, fundedAt: number): Promise<void> {
    this.db.prepare(
      `UPDATE ${this.table} SET status = 'funded', funding_tx_hash = ?, funded_at = ? WHERE user_id = ?`,
    ).run(fundingTxHash, fundedAt, userId);
  }

  async markFundingInProgress(userId: string): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE ${this.table} SET status = 'funding_in_progress'
         WHERE user_id = ? AND status = 'pending_funding'`,
      )
      .run(userId);
    return result.changes === 1;
  }

  async markFundingFailed(userId: string): Promise<void> {
    this.db
      .prepare(`UPDATE ${this.table} SET status = 'funding_failed' WHERE user_id = ?`)
      .run(userId);
  }

  async markReclaimed(userId: string): Promise<void> {
    this.db.prepare(`UPDATE ${this.table} SET status = 'reclaimed' WHERE user_id = ?`).run(userId);
  }

  async countFunded(): Promise<number> {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS count FROM ${this.table} WHERE funding_tx_hash IS NOT NULL`)
      .get() as { readonly count: number };
    return Number(row.count);
  }

  async countFundedSince(timestamp: number): Promise<number> {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS count FROM ${this.table} WHERE funded_at >= ?`)
      .get(timestamp) as { readonly count: number };
    return Number(row.count);
  }
}

function parseStatus(value: string): PaperWallet["status"] {
  if (
    value === "funded" ||
    value === "funding_failed" ||
    value === "funding_in_progress" ||
    value === "reclaimed"
  ) {
    return value;
  }
  return "pending_funding";
}
