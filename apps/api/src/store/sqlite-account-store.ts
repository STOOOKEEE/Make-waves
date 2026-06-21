import type { Balances, Fill, Side } from "@tide/core";
import { openDatabase } from "./sqlite";
import type { DatabaseSync } from "./sqlite";
import type { AccountSnapshotRow, AccountStore } from "./account-store";

function asRecord(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function rowToFill(row: unknown): Fill {
  const record = asRecord(row);
  const side: Side = String(record["side"]) === "sell" ? "sell" : "buy";
  return {
    pair: {
      base: String(record["pair_base"]),
      quote: String(record["pair_quote"]),
    },
    side,
    amount: Number(record["amount"]),
    price: Number(record["price"]),
    quoteAmount: Number(record["quote_amount"]),
  };
}

/**
 * Persistance SQLite des comptes (module builtin `node:sqlite`). Trois tables :
 * `accounts`, `balances` (une ligne par devise), `orders`. `applyOrder` est
 * transactionnel : soldes et fill sont écrits atomiquement.
 */
export class SqliteAccountStore implements AccountStore {
  private readonly db: DatabaseSync;

  constructor(path = ":memory:") {
    this.db = openDatabase(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (user_id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS balances (
        user_id TEXT NOT NULL,
        currency TEXT NOT NULL,
        amount REAL NOT NULL,
        PRIMARY KEY (user_id, currency)
      );
      CREATE TABLE IF NOT EXISTS orders (
        user_id TEXT NOT NULL,
        pair_base TEXT NOT NULL,
        pair_quote TEXT NOT NULL,
        side TEXT NOT NULL,
        amount REAL NOT NULL,
        price REAL NOT NULL,
        quote_amount REAL NOT NULL
      );
    `);
  }

  has(userId: string): boolean {
    return (
      this.db.prepare("SELECT 1 FROM accounts WHERE user_id = ?").get(userId) !==
      undefined
    );
  }

  open(userId: string, balances: Balances): void {
    this.transaction(() => {
      this.db.prepare("INSERT INTO accounts (user_id) VALUES (?)").run(userId);
      this.insertBalances(userId, balances);
    });
  }

  getBalances(userId: string): Balances | undefined {
    if (!this.has(userId)) {
      return undefined;
    }
    return this.readBalances(userId);
  }

  getOrders(userId: string): readonly Fill[] | undefined {
    if (!this.has(userId)) {
      return undefined;
    }
    return this.db
      .prepare(
        "SELECT pair_base, pair_quote, side, amount, price, quote_amount FROM orders WHERE user_id = ? ORDER BY rowid",
      )
      .all(userId)
      .map(rowToFill);
  }

  applyOrder(userId: string, balances: Balances, fill: Fill): void {
    if (!this.has(userId)) {
      return;
    }
    this.transaction(() => {
      this.db.prepare("DELETE FROM balances WHERE user_id = ?").run(userId);
      this.insertBalances(userId, balances);
      this.db
        .prepare(
          "INSERT INTO orders (user_id, pair_base, pair_quote, side, amount, price, quote_amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          userId,
          fill.pair.base,
          fill.pair.quote,
          fill.side,
          fill.amount,
          fill.price,
          fill.quoteAmount,
        );
    });
  }

  snapshots(): AccountSnapshotRow[] {
    return this.db
      .prepare("SELECT user_id FROM accounts ORDER BY rowid")
      .all()
      .map((row) => {
        const userId = String(asRecord(row)["user_id"]);
        return { userId, balances: this.readBalances(userId) };
      });
  }

  /** Ferme la connexion. */
  close(): void {
    this.db.close();
  }

  private insertBalances(userId: string, balances: Balances): void {
    const statement = this.db.prepare(
      "INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?)",
    );
    for (const [currency, amount] of Object.entries(balances)) {
      statement.run(userId, currency, amount);
    }
  }

  private readBalances(userId: string): Balances {
    const balances: Record<string, number> = {};
    const rows = this.db
      .prepare("SELECT currency, amount FROM balances WHERE user_id = ?")
      .all(userId);
    for (const row of rows) {
      const record = asRecord(row);
      balances[String(record["currency"])] = Number(record["amount"]);
    }
    return balances;
  }

  private transaction(run: () => void): void {
    this.db.exec("BEGIN");
    try {
      run();
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
