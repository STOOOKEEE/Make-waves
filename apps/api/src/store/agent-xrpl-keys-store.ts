/**
 * Stocke la clé privée XRPL d'un agent, chiffrée au repos par AES-256-GCM
 * (helper `@tide/mcp/crypto`). La `publicKey` stockée est en pratique
 * l'adresse XRPL (`rXXXX…`) du wallet — simplification assumée : le service
 * agent n'a pas besoin de distinguer publicKey/address tant qu'elle
 * identifie le compte on-chain de manière unique (ce qu'une adresse fait).
 *
 * Une seule clé par agent (PK sur `agent_id`). Idempotent : `save` est un
 * upsert, pas une création (un revoke suivi d'un generate ré-utilise la même
 * ligne).
 */

export interface AgentXrplKey {
  readonly agentId: string;
  readonly userId: string;
  /** Adresse XRPL du wallet (`rXXXX…`). Voir note d'implémentation ci-dessus. */
  readonly publicKey: string;
  /** Sérialisation JSON d'un `EncryptedPayload` (`@tide/mcp/crypto`). */
  readonly encryptedPrivateKey: string;
  /** Identifiant de la master key utilisée (pour la rotation). */
  readonly masterKeyId: string;
  readonly createdAt: number;
}

export interface AgentXrplKeysStore {
  save(key: AgentXrplKey): Promise<void>;
  get(agentId: string): Promise<AgentXrplKey | null>;
  delete(agentId: string): Promise<void>;
}

export class InMemoryAgentXrplKeysStore implements AgentXrplKeysStore {
  private readonly map = new Map<string, AgentXrplKey>();

  async save(k: AgentXrplKey): Promise<void> {
    this.map.set(k.agentId, k);
  }

  async get(id: string): Promise<AgentXrplKey | null> {
    return this.map.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.map.delete(id);
  }
}
