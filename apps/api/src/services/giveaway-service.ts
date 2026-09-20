import type {
  GiveawayEntry,
  GiveawayParticipant,
  GiveawayStore,
  GiveawayRuleId,
} from "../store/giveaway-store";

export const GIVEAWAY_OPERATION_ID = "airpods-max-2026";
export const GIVEAWAY_TERMS_VERSION = "2026-09-11";
export const GIVEAWAY_CLOSES_AT = Date.UTC(2026, 8, 19, 23, 59, 0);
export const GIVEAWAY_WEIGHTS: Readonly<Record<GiveawayRuleId, number>> = {
  wallet: 1,
  first_trade: 3,
  referral: 2,
};

export class GiveawayInvalidHandleError extends Error {
  constructor() {
    super("Pseudonyme X invalide");
    this.name = "GiveawayInvalidHandleError";
  }
}

export class GiveawayTermsVersionError extends Error {
  constructor() {
    super("Le règlement affiché n'est plus à jour");
    this.name = "GiveawayTermsVersionError";
  }
}

export class GiveawayWalletRequiredError extends Error {
  constructor() {
    super("Réclame d'abord ton wallet Paper ou connecte un wallet XRPL");
    this.name = "GiveawayWalletRequiredError";
  }
}

export class GiveawayClosedError extends Error {
  constructor() {
    super("Les participations à la tombola sont closes");
    this.name = "GiveawayClosedError";
  }
}

export interface GiveawayIdentity {
  readonly walletAddress: string | null;
  readonly hasFirstTrade: boolean;
}

export interface GiveawayServiceDeps {
  readonly store: GiveawayStore;
  readonly resolveIdentity: (userId: string) => Promise<GiveawayIdentity>;
  readonly now?: () => number;
}

export interface GiveawayRuleStatus {
  readonly id: GiveawayRuleId;
  readonly weight: number;
  readonly awardedAt: number | null;
}

export interface GiveawayStatus {
  readonly operationId: string;
  readonly userId: string;
  readonly walletAddress: string | null;
  readonly xHandle: string | null;
  readonly termsVersion: string | null;
  readonly acceptedAt: number | null;
  readonly entries: number;
  readonly rules: readonly GiveawayRuleStatus[];
}

export function normalizeXHandle(value: string): string {
  const handle = value.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    throw new GiveawayInvalidHandleError();
  }
  return handle.toLowerCase();
}

/** Persistance minimale : identité, consentement et règles déjà gagnées. */
export class GiveawayService {
  private readonly now: () => number;

  constructor(private readonly deps: GiveawayServiceDeps) {
    this.now = deps.now ?? Date.now;
  }

  async saveConsent(input: {
    userId: string;
    xHandle: string;
    termsVersion: string;
  }): Promise<GiveawayStatus> {
    const userId = input.userId.trim();
    if (userId === "") throw new GiveawayWalletRequiredError();
    if (input.termsVersion !== GIVEAWAY_TERMS_VERSION) {
      throw new GiveawayTermsVersionError();
    }
    if (this.now() >= GIVEAWAY_CLOSES_AT) throw new GiveawayClosedError();
    const xHandle = normalizeXHandle(input.xHandle);
    const identity = await this.deps.resolveIdentity(userId);
    if (identity.walletAddress === null || identity.walletAddress.trim() === "") {
      throw new GiveawayWalletRequiredError();
    }
    const acceptedAt = this.now();
    await this.deps.store.saveProfile({
      operationId: GIVEAWAY_OPERATION_ID,
      userId,
      walletAddress: identity.walletAddress,
      xHandle,
      termsVersion: GIVEAWAY_TERMS_VERSION,
      acceptedAt,
    });
    await this.deps.store.ensureEntry({
      operationId: GIVEAWAY_OPERATION_ID,
      userId,
      rule: "wallet",
      weight: GIVEAWAY_WEIGHTS.wallet,
      awardedAt: acceptedAt,
    });
    if (identity.hasFirstTrade) {
      await this.ensureFirstTrade(userId, acceptedAt);
    }
    return this.status(userId);
  }

  /** Appelé après un fill ; il ne crée jamais de profil ni de pseudo X. */
  async recordFirstTrade(userId: string): Promise<void> {
    const profile = await this.deps.store.get(GIVEAWAY_OPERATION_ID, userId);
    if (profile === null || this.now() >= GIVEAWAY_CLOSES_AT) return;
    await this.ensureFirstTrade(userId, this.now());
  }

  async status(userId: string): Promise<GiveawayStatus> {
    const normalizedUserId = userId.trim();
    const [participant, identity] = await Promise.all([
      this.deps.store.get(GIVEAWAY_OPERATION_ID, normalizedUserId),
      this.deps.resolveIdentity(normalizedUserId),
    ]);
    return this.toStatus(normalizedUserId, participant, identity);
  }

  async adminList(): Promise<readonly GiveawayParticipant[]> {
    return this.deps.store.list(GIVEAWAY_OPERATION_ID);
  }

  private async ensureFirstTrade(userId: string, awardedAt: number): Promise<void> {
    await this.deps.store.ensureEntry({
      operationId: GIVEAWAY_OPERATION_ID,
      userId,
      rule: "first_trade",
      weight: GIVEAWAY_WEIGHTS.first_trade,
      awardedAt,
    });
  }

  private toStatus(
    userId: string,
    participant: GiveawayParticipant | null,
    identity: GiveawayIdentity,
  ): GiveawayStatus {
    const profile = participant?.profile ?? null;
    const entryByRule = new Map<GiveawayRuleId, GiveawayEntry>(
      (participant?.entries ?? []).map((entry) => [entry.rule, entry]),
    );
    const rules: GiveawayRuleStatus[] = [
      {
        id: "wallet",
        weight: GIVEAWAY_WEIGHTS.wallet,
        awardedAt: profile === null ? null : profile.acceptedAt,
      },
      {
        id: "first_trade",
        weight: GIVEAWAY_WEIGHTS.first_trade,
        awardedAt: entryByRule.get("first_trade")?.awardedAt ?? null,
      },
      {
        id: "referral",
        weight: GIVEAWAY_WEIGHTS.referral,
        awardedAt: entryByRule.get("referral")?.awardedAt ?? null,
      },
    ];
    return {
      operationId: GIVEAWAY_OPERATION_ID,
      userId,
      walletAddress: profile?.walletAddress ?? identity.walletAddress,
      xHandle: profile?.xHandle ?? null,
      termsVersion: profile?.termsVersion ?? null,
      acceptedAt: profile?.acceptedAt ?? null,
      entries: (participant?.entries ?? []).reduce((sum, entry) => sum + entry.weight, 0),
      rules,
    };
  }
}
