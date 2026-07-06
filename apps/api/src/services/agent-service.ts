import { randomUUID } from "node:crypto";
import type { Agent, AgentStore, AgentType } from "../store/agent-store";
import type { MandateStore } from "../store/mandate-store";
import { agentBroadcaster } from "../sse/agent-broadcast";

export interface CreateAgentInput {
  readonly userId: string;
  readonly name: string;
  readonly type: AgentType;
}

/**
 * Service de gestion des agents : orchestre `AgentStore` + `MandateStore`.
 * Le kill d'un agent révoque automatiquement tous ses mandats actifs.
 * Pas d'I/O au constructeur ; le kill diffuse l'événement sur le bus SSE
 * (`agentBroadcaster`) pour que les clients connectés (dashboards, UI agents)
 * soient notifiés en temps réel.
 */
export class AgentService {
  constructor(
    private readonly agents: AgentStore,
    private readonly mandates: MandateStore,
  ) {}

  /** Crée un agent (id généré, status=active, hasLiveAccount=false). */
  async create(input: CreateAgentInput): Promise<Agent> {
    const now = Date.now();
    const agent: Agent = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name,
      type: input.type,
      status: "active",
      hasLiveAccount: false,
      createdAt: now,
      updatedAt: now,
    };
    await this.agents.create(agent);
    return agent;
  }

  /** Récupère un agent par id, ou null. */
  get(id: string): Promise<Agent | null> {
    return this.agents.get(id);
  }

  /** Liste les agents d'un utilisateur. */
  listByUser(userId: string): Promise<Agent[]> {
    return this.agents.listByUser(userId);
  }

  /**
   * Tue un agent (status=stopped), révoque tous ses mandats actifs, puis
   * diffuse `agent_killed` sur le bus SSE. `reason?` est optionnel (libre,
   * pas validé) — typiquement "manual", "risk_limit", etc.
   */
  async kill(id: string, reason?: string): Promise<Agent> {
    const updated = await this.agents.update(id, { status: "stopped" });
    const mandates = await this.mandates.listByAgent(id);
    await Promise.all(
      mandates
        .filter((m) => m.status === "active")
        .map((m) => this.mandates.update(m.id, { status: "revoked" })),
    );
    agentBroadcaster.emitEvent({ type: "agent_killed", agentId: id, reason });
    return updated;
  }

  /** Supprime un agent. */
  async delete(id: string): Promise<void> {
    await this.agents.delete(id);
  }
}