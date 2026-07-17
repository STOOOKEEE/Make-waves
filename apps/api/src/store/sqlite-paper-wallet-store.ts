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
    createdAt: Number(value["created_at"]),
  };
}

export class SqlitePaperWalletStore implements PaperWalletStore {
  constructor(private readonly db: DatabaseSync) {}

  async get(userId: string): Promise<PaperWallet | null> {
    const row = this.db.prepare("SELECT * FROM paper_wallets WHERE user_id = ?").get(userId);
    return row === undefined ? null : rowToWallet(row);
  }

  async list(): Promise<readonly PaperWallet[]> {
    return this.db
      .prepare("SELECT * FROM paper_wallets ORDER BY created_at DESC")
      .all()
      .map(rowToWallet);
  }

  async create(wallet: PaperWallet): Promise<void> {
    this.db.prepare(
      `INSERT OR IGNORE INTO paper_wallets (
        user_id, address, encrypted_seed, master_key_id, status, funding_tx_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      wallet.userId,
      wallet.address,
      wallet.encryptedSeed,
      wallet.masterKeyId,
      wallet.status,
      wallet.fundingTxHash,
      wallet.createdAt,
    );
  }

  async markFunded(userId: string, fundingTxHash: string): Promise<void> {
    this.db.prepare(
      "UPDATE paper_wallets SET status = 'funded', funding_tx_hash = ? WHERE user_id = ?",
    ).run(fundingTxHash, userId);
  }

  async markFundingInProgress(userId: string): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE paper_wallets SET status = 'funding_in_progress'
         WHERE user_id = ? AND status = 'pending_funding'`,
      )
      .run(userId);
    return result.changes === 1;
  }

  async markFundingFailed(userId: string): Promise<void> {
    this.db
      .prepare("UPDATE paper_wallets SET status = 'funding_failed' WHERE user_id = ?")
      .run(userId);
  }

  async markReclaimed(userId: string): Promise<void> {
    this.db.prepare("UPDATE paper_wallets SET status = 'reclaimed' WHERE user_id = ?").run(userId);
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
