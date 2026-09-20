export interface ExternalIdentity {
  readonly issuer: string;
  readonly subject: string;
  readonly provider: string;
  readonly email: string | null;
}

export interface LinkedExternalIdentity extends ExternalIdentity {
  readonly userId: string;
  readonly createdAt: number;
  readonly lastLoginAt: number;
}

export interface ExternalIdentityStore {
  get(issuer: string, subject: string): Promise<LinkedExternalIdentity | null>;
  /** Lie une nouvelle identité au compte proposé, ou retourne la liaison existante. */
  bindOrResolve(
    identity: ExternalIdentity,
    proposedUserId: string | null,
    now: number,
  ): Promise<LinkedExternalIdentity | null>;
}

export class InMemoryExternalIdentityStore implements ExternalIdentityStore {
  private readonly rows = new Map<string, LinkedExternalIdentity>();

  async get(issuer: string, subject: string): Promise<LinkedExternalIdentity | null> {
    return this.rows.get(`${issuer}\u0000${subject}`) ?? null;
  }

  async bindOrResolve(
    identity: ExternalIdentity,
    proposedUserId: string | null,
    now: number,
  ): Promise<LinkedExternalIdentity | null> {
    const key = `${identity.issuer}\u0000${identity.subject}`;
    const existing = this.rows.get(key);
    if (existing !== undefined) {
      const updated = {
        ...existing,
        provider: identity.provider,
        email: identity.email,
        lastLoginAt: now,
      };
      this.rows.set(key, updated);
      return updated;
    }
    if (proposedUserId === null) return null;
    const created: LinkedExternalIdentity = {
      ...identity,
      userId: proposedUserId,
      createdAt: now,
      lastLoginAt: now,
    };
    this.rows.set(key, created);
    return created;
  }
}
