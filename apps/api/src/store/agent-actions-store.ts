export interface AgentAction {
  readonly id: string;
  readonly agentId: string;
  readonly userId: string;
  readonly toolName: string;
  readonly toolParams: string; // JSON sérialisé
  readonly result: string | null; // JSON sérialisé, null si erreur
  readonly error: string | null; // message d'erreur, null si succès
  readonly idempotencyKey: string | null;
  readonly executedAt: number;
}

export interface AgentActionsStore {
  record(action: AgentAction): Promise<void>;
  /** Retourne l'action précédente si une action avec cet `idempotency_key` existe déjà. */
  findByIdempotencyKey(userId: string, key: string): Promise<AgentAction | null>;
  listByAgent(agentId: string, limit?: number): Promise<AgentAction[]>;
  /** Compte les trades du jour (UTC) pour un agent — pour `enforceMaxTradesPerDay`. */
  countToday(agentId: string, userId: string): Promise<number>;
}

/** Renvoie le timestamp (ms) du début du jour UTC contenant `ts`. */
export function startOfUtcDay(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export class InMemoryAgentActionsStore implements AgentActionsStore {
  private readonly actions: AgentAction[] = [];

  async record(action: AgentAction): Promise<void> {
    if (action.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(
        action.userId,
        action.idempotencyKey,
      );
      if (existing) {
        return; // no-op idempotent
      }
    }
    this.actions.push(action);
  }

  async findByIdempotencyKey(
    userId: string,
    key: string,
  ): Promise<AgentAction | null> {
    return (
      this.actions.find(
        (a) => a.userId === userId && a.idempotencyKey === key,
      ) ?? null
    );
  }

  async listByAgent(agentId: string, limit = 100): Promise<AgentAction[]> {
    return this.actions
      .filter((a) => a.agentId === agentId)
      .slice(-limit)
      .reverse();
  }

  async countToday(agentId: string, userId: string): Promise<number> {
    const todayStart = startOfUtcDay(Date.now());
    return this.actions.filter(
      (a) =>
        a.agentId === agentId &&
        a.userId === userId &&
        a.executedAt >= todayStart,
    ).length;
  }
}
