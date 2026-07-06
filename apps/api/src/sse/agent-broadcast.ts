import { EventEmitter } from "node:events";

/**
 * Événements agent diffusés en SSE. Discriminé par `type` — chaque listener
 * narrow sur le bon variant sans projection manuelle.
 */
export type AgentEvent =
  | { type: "agent_killed"; agentId: string; reason?: string }
  | { type: "agent_action"; agentId: string; tool: string; result: unknown };

/**
 * Bus d'événements agent (EventEmitter typé). Plusieurs clients SSE peuvent
 * s'y brancher ; les producteurs (services métier) appellent `emitEvent(...)`.
 * Étendu directement d'`EventEmitter` plutôt que d'envelopper — on garde
 * l'API standard `on/off` sans réimplémenter.
 */
export class AgentBroadcaster extends EventEmitter {
  emitEvent(event: AgentEvent): void {
    this.emit("event", event);
  }
}

/** Singleton partagé par tous les producteurs et tous les consumers SSE. */
export const agentBroadcaster = new AgentBroadcaster();
// Plusieurs clients SSE peuvent écouter simultanément (dashboard, agents UI, etc.).
agentBroadcaster.setMaxListeners(100);