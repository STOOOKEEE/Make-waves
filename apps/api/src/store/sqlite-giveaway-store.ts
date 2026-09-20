import type { DatabaseSync } from "./sqlite";
import {
  GiveawayIdentityConflictError,
  type GiveawayEntry,
  type GiveawayParticipant,
  type GiveawayProfile,
  type GiveawayRuleId,
  type GiveawayStore,
} from "./giveaway-store";

type Row = Record<string, unknown>;

function profileFromRow(row: Row): GiveawayProfile {
  return {
    operationId: String(row.operation_id),
    userId: String(row.user_id),
    walletAddress: String(row.wallet_address),
    xHandle: String(row.x_handle),
    termsVersion: String(row.terms_version),
    acceptedAt: Number(row.accepted_at),
  };
}

function entryFromRow(row: Row): GiveawayEntry {
  return {
    operationId: String(row.entry_operation_id),
    userId: String(row.entry_user_id),
    rule: String(row.entry_rule) as GiveawayRuleId,
    weight: Number(row.entry_weight),
    awardedAt: Number(row.entry_awarded_at),
  };
}

export class SqliteGiveawayStore implements GiveawayStore {
  constructor(private readonly db: DatabaseSync) {}

  async get(operationId: string, userId: string): Promise<GiveawayParticipant | null> {
    const row = this.db
      .prepare(
        `SELECT p.*, e.operation_id AS entry_operation_id, e.user_id AS entry_user_id,
                e.rule AS entry_rule, e.weight AS entry_weight, e.awarded_at AS entry_awarded_at
           FROM giveaway_profiles p
           LEFT JOIN giveaway_entries e
             ON e.operation_id = p.operation_id AND e.user_id = p.user_id
          WHERE p.operation_id = ? AND p.user_id = ?
          ORDER BY e.awarded_at ASC`,
      )
      .all(operationId, userId) as Row[];
    return this.participantFromRows(row);
  }

  async getByWallet(
    operationId: string,
    walletAddress: string,
  ): Promise<GiveawayParticipant | null> {
    const row = this.db
      .prepare(
        `SELECT p.*, e.operation_id AS entry_operation_id, e.user_id AS entry_user_id,
                e.rule AS entry_rule, e.weight AS entry_weight, e.awarded_at AS entry_awarded_at
           FROM giveaway_profiles p
           LEFT JOIN giveaway_entries e
             ON e.operation_id = p.operation_id AND e.user_id = p.user_id
          WHERE p.operation_id = ? AND p.wallet_address = ?
          ORDER BY e.awarded_at ASC`,
      )
      .all(operationId, walletAddress) as Row[];
    return this.participantFromRows(row);
  }

  async saveProfile(profile: GiveawayProfile): Promise<void> {
    const existing = await this.get(profile.operationId, profile.userId);
    if (existing !== null && existing.profile.walletAddress !== profile.walletAddress) {
      throw new GiveawayIdentityConflictError();
    }
    const owner = await this.getByWallet(profile.operationId, profile.walletAddress);
    if (owner !== null && owner.profile.userId !== profile.userId) {
      throw new GiveawayIdentityConflictError();
    }
    try {
      this.db
        .prepare(
          `INSERT INTO giveaway_profiles
             (operation_id, user_id, wallet_address, x_handle, terms_version, accepted_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(operation_id, user_id) DO UPDATE SET
             x_handle = excluded.x_handle,
             terms_version = excluded.terms_version,
             accepted_at = excluded.accepted_at`,
        )
        .run(
          profile.operationId,
          profile.userId,
          profile.walletAddress,
          profile.xHandle,
          profile.termsVersion,
          profile.acceptedAt,
        );
    } catch (error) {
      if (error instanceof Error && /UNIQUE/i.test(error.message)) {
        throw new GiveawayIdentityConflictError();
      }
      throw error;
    }
  }

  async ensureEntry(entry: GiveawayEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO giveaway_entries
           (operation_id, user_id, rule, weight, awarded_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(entry.operationId, entry.userId, entry.rule, entry.weight, entry.awardedAt);
  }

  async list(operationId: string): Promise<readonly GiveawayParticipant[]> {
    const rows = this.db
      .prepare(
        `SELECT p.*, e.operation_id AS entry_operation_id, e.user_id AS entry_user_id,
                e.rule AS entry_rule, e.weight AS entry_weight, e.awarded_at AS entry_awarded_at
           FROM giveaway_profiles p
           LEFT JOIN giveaway_entries e
             ON e.operation_id = p.operation_id AND e.user_id = p.user_id
          WHERE p.operation_id = ?
          ORDER BY p.accepted_at DESC, e.awarded_at ASC`,
      )
      .all(operationId) as Row[];
    const participants = new Map<string, GiveawayParticipant>();
    for (const row of rows) {
      const profile = profileFromRow(row);
      const current = participants.get(profile.userId);
      const entry = row.entry_rule === null ? null : entryFromRow(row);
      participants.set(profile.userId, {
        profile,
        entries: entry === null ? current?.entries ?? [] : [...(current?.entries ?? []), entry],
      });
    }
    return [...participants.values()];
  }

  private participantFromRows(rows: Row[]): GiveawayParticipant | null {
    const first = rows[0];
    if (first === undefined) return null;
    const profile = profileFromRow(first);
    return {
      profile,
      entries: rows
        .filter((row) => row.entry_rule !== null)
        .map(entryFromRow),
    };
  }
}
