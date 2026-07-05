export type MandateStatus = "pending" | "active" | "expired" | "revoked";
export type MandateStyle = "momentum" | "mean_reversion" | "dca" | "grid" | "mixed";

export interface Mandate {
  readonly id: string;
  readonly agentId: string;
  readonly userId: string;
  readonly capitalMax: number;
  readonly perteMaxJour: number;
  readonly maxTradesPerDay: number;
  readonly maxLeverage: number;
  readonly pairesAutorisees: readonly string[];
  readonly style: MandateStyle | null;
  readonly validUntil: number;
  readonly signedAt: number | null;
  readonly signature: string | null;
  readonly status: MandateStatus;
}

export interface MandateStore {
  create(mandate: Mandate): Promise<void>;
  getActive(agentId: string): Promise<Mandate | null>;
  get(id: string): Promise<Mandate | null>;
  listByAgent(agentId: string): Promise<Mandate[]>;
  update(id: string, patch: Partial<Mandate>): Promise<Mandate>;
}

export class MandateNotFoundError extends Error {
  constructor(id: string) {
    super(`Mandate ${id} not found`);
  }
}

export class InMemoryMandateStore implements MandateStore {
  private readonly mandates = new Map<string, Mandate>();

  async create(mandate: Mandate): Promise<void> {
    this.mandates.set(mandate.id, mandate);
  }

  async getActive(agentId: string): Promise<Mandate | null> {
    const now = Date.now();
    const found = [...this.mandates.values()].find(
      (m) => m.agentId === agentId && m.status === "active" && m.validUntil > now,
    );
    return found ?? null;
  }

  async get(id: string): Promise<Mandate | null> {
    return this.mandates.get(id) ?? null;
  }

  async listByAgent(agentId: string): Promise<Mandate[]> {
    return [...this.mandates.values()].filter((m) => m.agentId === agentId);
  }

  async update(id: string, patch: Partial<Mandate>): Promise<Mandate> {
    const current = this.mandates.get(id);
    if (!current) {
      throw new MandateNotFoundError(id);
    }
    const next: Mandate = { ...current, ...patch, id: current.id };
    this.mandates.set(id, next);
    return next;
  }
}
