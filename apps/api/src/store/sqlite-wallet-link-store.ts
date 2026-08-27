import type { DatabaseSync } from "./sqlite";
import type { WalletLinkStore } from "./wallet-link-store";

const TABLE = "wallet_paper_links";

export class SqliteWalletLinkStore implements WalletLinkStore {
  constructor(private readonly db: DatabaseSync) {}

  async getPaperUserId(walletAddress: string): Promise<string | null> {
    const row = this.db
      .prepare(`SELECT paper_user_id FROM ${TABLE} WHERE address = ?`)
      .get(walletAddress);
    return row === undefined ? null : String((row as { paper_user_id: string }).paper_user_id);
  }

  async listWalletsForPaperUser(paperUserId: string): Promise<readonly string[]> {
    const rows = this.db
      .prepare("SELECT address FROM " + TABLE + " WHERE paper_user_id = ?")
      .all(paperUserId) as Array<{ address: string }>;
    return rows.map((row) => row.address);
  }

  async link(walletAddress: string, paperUserId: string, linkedAt: number): Promise<void> {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO ${TABLE} (address, paper_user_id, linked_at)
         VALUES (?, ?, ?)`,
      )
      .run(walletAddress, paperUserId, linkedAt);
  }
}
