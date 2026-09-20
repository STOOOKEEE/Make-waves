export type GiveawayRuleId = "wallet" | "first_trade" | "referral";

export interface GiveawayProfile {
  readonly operationId: string;
  readonly userId: string;
  readonly walletAddress: string;
  readonly xHandle: string;
  readonly termsVersion: string;
  readonly acceptedAt: number;
}

export interface GiveawayEntry {
  readonly operationId: string;
  readonly userId: string;
  readonly rule: GiveawayRuleId;
  readonly weight: number;
  readonly awardedAt: number;
}

export interface GiveawayParticipant {
  readonly profile: GiveawayProfile;
  readonly entries: readonly GiveawayEntry[];
}

export class GiveawayIdentityConflictError extends Error {
  constructor() {
    super("Ce wallet est déjà lié à une autre participation");
    this.name = "GiveawayIdentityConflictError";
  }
}

export interface GiveawayStore {
  get(operationId: string, userId: string): Promise<GiveawayParticipant | null>;
  getByWallet(operationId: string, walletAddress: string): Promise<GiveawayParticipant | null>;
  saveProfile(profile: GiveawayProfile): Promise<void>;
  ensureEntry(entry: GiveawayEntry): Promise<void>;
  list(operationId: string): Promise<readonly GiveawayParticipant[]>;
}

/** Store mémoire utilisé par les tests et les environnements sans SQLite. */
export class InMemoryGiveawayStore implements GiveawayStore {
  private readonly profiles = new Map<string, GiveawayProfile>();
  private readonly entries = new Map<string, GiveawayEntry>();

  async get(operationId: string, userId: string): Promise<GiveawayParticipant | null> {
    return this.participant(this.profiles.get(this.profileKey(operationId, userId)));
  }

  async getByWallet(
    operationId: string,
    walletAddress: string,
  ): Promise<GiveawayParticipant | null> {
    const profile = [...this.profiles.values()].find(
      (row) => row.operationId === operationId && row.walletAddress === walletAddress,
    );
    return this.participant(profile);
  }

  async saveProfile(profile: GiveawayProfile): Promise<void> {
    const owner = await this.getByWallet(profile.operationId, profile.walletAddress);
    if (owner !== null && owner.profile.userId !== profile.userId) {
      throw new GiveawayIdentityConflictError();
    }
    const key = this.profileKey(profile.operationId, profile.userId);
    const existing = this.profiles.get(key);
    if (existing !== undefined && existing.walletAddress !== profile.walletAddress) {
      throw new GiveawayIdentityConflictError();
    }
    this.profiles.set(key, profile);
  }

  async ensureEntry(entry: GiveawayEntry): Promise<void> {
    this.entries.set(this.entryKey(entry.operationId, entry.userId, entry.rule), entry);
  }

  async list(operationId: string): Promise<readonly GiveawayParticipant[]> {
    return [...this.profiles.values()]
      .filter((profile) => profile.operationId === operationId)
      .sort((a, b) => b.acceptedAt - a.acceptedAt)
      .map((profile) => this.participant(profile) as GiveawayParticipant);
  }

  private participant(profile: GiveawayProfile | undefined): GiveawayParticipant | null {
    if (profile === undefined) return null;
    const entries = [...this.entries.values()]
      .filter(
        (entry) =>
          entry.operationId === profile.operationId && entry.userId === profile.userId,
      )
      .sort((a, b) => a.awardedAt - b.awardedAt);
    return { profile, entries };
  }

  private profileKey(operationId: string, userId: string): string {
    return `${operationId}\u0000${userId}`;
  }

  private entryKey(operationId: string, userId: string, rule: GiveawayRuleId): string {
    return `${operationId}\u0000${userId}\u0000${rule}`;
  }
}
