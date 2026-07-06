export type AgentType = "external" | "integrated";
export type AgentStatus = "active" | "paused" | "stopped";

export interface Agent {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly type: AgentType;
  readonly status: AgentStatus;
  readonly hasLiveAccount: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface AgentStore {
  create(agent: Agent): Promise<void>;
  get(id: string): Promise<Agent | null>;
  listByUser(userId: string): Promise<Agent[]>;
  update(id: string, patch: Partial<Agent>): Promise<Agent>;
  delete(id: string): Promise<void>;
}

export class AgentNotFoundError extends Error {
  constructor(id: string) {
    super(`Agent ${id} not found`);
    this.name = "AgentNotFoundError";
  }
}

export class InMemoryAgentStore implements AgentStore {
  private readonly agents = new Map<string, Agent>();

  async create(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
  }

  async get(id: string): Promise<Agent | null> {
    return this.agents.get(id) ?? null;
  }

  async listByUser(userId: string): Promise<Agent[]> {
    return [...this.agents.values()].filter((a) => a.userId === userId);
  }

  async update(id: string, patch: Partial<Agent>): Promise<Agent> {
    const current = this.agents.get(id);
    if (!current) {
      throw new AgentNotFoundError(id);
    }
    const next: Agent = {
      ...current,
      ...patch,
      id: current.id,
      updatedAt: Date.now(),
    };
    this.agents.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.agents.delete(id);
  }
}
