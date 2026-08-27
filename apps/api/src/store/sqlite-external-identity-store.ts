import type { DatabaseSync } from "./sqlite";
import type {
  ExternalIdentity,
  ExternalIdentityStore,
  LinkedExternalIdentity,
} from "./external-identity-store";

function toIdentity(row: unknown): LinkedExternalIdentity {
  const value = row as Record<string, unknown>;
  return {
    issuer: String(value["issuer"]),
    subject: String(value["subject"]),
    userId: String(value["user_id"]),
    provider: String(value["provider"]),
    email: value["email"] === null ? null : String(value["email"]),
    createdAt: Number(value["created_at"]),
    lastLoginAt: Number(value["last_login_at"]),
  };
}

export class SqliteExternalIdentityStore implements ExternalIdentityStore {
  constructor(private readonly db: DatabaseSync) {}

  async get(issuer: string, subject: string): Promise<LinkedExternalIdentity | null> {
    const row = this.db
      .prepare("SELECT * FROM external_identities WHERE issuer = ? AND subject = ?")
      .get(issuer, subject);
    return row === undefined ? null : toIdentity(row);
  }

  async bindOrResolve(
    identity: ExternalIdentity,
    proposedUserId: string | null,
    now: number,
  ): Promise<LinkedExternalIdentity | null> {
    const existing = await this.get(identity.issuer, identity.subject);
    if (existing !== null) {
      this.db
        .prepare(
          `UPDATE external_identities
           SET provider = ?, email = ?, last_login_at = ?
           WHERE issuer = ? AND subject = ?`,
        )
        .run(identity.provider, identity.email, now, identity.issuer, identity.subject);
      return { ...existing, provider: identity.provider, email: identity.email, lastLoginAt: now };
    }
    if (proposedUserId === null) return null;
    this.db
      .prepare(
        `INSERT OR IGNORE INTO external_identities
         (issuer, subject, user_id, provider, email, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        identity.issuer,
        identity.subject,
        proposedUserId,
        identity.provider,
        identity.email,
        now,
        now,
      );
    return this.get(identity.issuer, identity.subject);
  }
}
