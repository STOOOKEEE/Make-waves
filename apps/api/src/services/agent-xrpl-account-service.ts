import { Wallet } from "xrpl";
import {
  decryptPrivateKey,
  encryptPrivateKey,
  type EncryptedPayload,
  readMasterKey,
} from "@tide/mcp/crypto";
import {
  type AgentStore,
  AgentNotFoundError,
} from "../store/agent-store";
import type {
  AgentXrplKeysStore,
} from "../store/agent-xrpl-keys-store";

export interface AgentXrplAccountServiceDeps {
  readonly keys: AgentXrplKeysStore;
  readonly agents: AgentStore;
  /** Master key 32 bytes (64 hex chars) lue depuis `TIDE_AGENT_KEY_MASTER`. */
  readonly masterKeyHex: string;
  /** Identifiant logique de la master key (ex. `"v1"`), persisté pour la rotation. */
  readonly masterKeyId: string;
}

/**
 * Service de gestion du compte XRPL Live d'un agent :
 * - `generate` crée un nouveau wallet via `xrpl.js`, chiffre le seed au repos
 *   et stocke la clé. Marque l'agent `hasLiveAccount = true`.
 * - `decryptSeed` déverrouille le seed pour signer une transaction Live.
 * - `revoke` supprime la clé (les fonds restent sur le compte on-chain ; c'est
 *   la **session Live** qui est révoquée, pas les avoirs).
 *
 * La clé privée ne quitte jamais le backend en clair : seul `decryptSeed` la
 * matérialise, pour l'injection directe dans une signature de tx (non implémenté
 * dans cette tâche — câblage runtime ultérieur).
 *
 * Note d'implémentation : `xrpl.js` v4.6.0 expose `Wallet.generate()` (pas
 * `generateKeypair`). Le wallet retourné porte `classicAddress` (équivalent à
 * `address`) et `seed?` (présent en génération, omis pour les wallets importés
 * sans seed).
 */
export class AgentXrplAccountService {
  constructor(private readonly deps: AgentXrplAccountServiceDeps) {}

  /**
   * Génère un nouveau compte XRPL pour l'agent. Le user doit transférer des XRP
   * dessus pour activer le Live (la réserve de base + les frais de tx sont
   * on-chain, pas notre problème). Idempotent : si l'agent a déjà un compte
   * Live, on retourne l'existant au lieu d'en créer un deuxième.
   */
  async generate(agentId: string): Promise<{ publicKey: string; address: string }> {
    const agent = await this.deps.agents.get(agentId);
    if (!agent) throw new AgentNotFoundError(agentId);
    if (agent.hasLiveAccount) {
      const existing = await this.deps.keys.get(agentId);
      if (existing) {
        return { publicKey: existing.publicKey, address: existing.publicKey };
      }
    }
    const wallet = Wallet.generate();
    if (!wallet.seed) {
      // `Wallet.generate()` retourne toujours un seed en xrpl.js 4.x ; on garde
      // ce garde-fou au cas où le contrat évoluerait.
      throw new Error("Wallet.generate() returned no seed");
    }
    const masterKey = readMasterKey(this.deps.masterKeyHex);
    const enc = encryptPrivateKey(wallet.seed, masterKey, this.deps.masterKeyId);
    await this.deps.keys.save({
      agentId,
      userId: agent.userId,
      publicKey: wallet.classicAddress,
      encryptedPrivateKey: JSON.stringify(enc),
      masterKeyId: enc.masterKeyId,
      createdAt: Date.now(),
    });
    await this.deps.agents.update(agentId, { hasLiveAccount: true });
    return { publicKey: wallet.classicAddress, address: wallet.classicAddress };
  }

  /** Déchiffre le seed d'un agent pour signer une tx Live. */
  async decryptSeed(
    agentId: string,
  ): Promise<{ seed: string; address: string }> {
    const stored = await this.deps.keys.get(agentId);
    if (!stored) throw new Error(`No live account for agent ${agentId}`);
    const masterKey = readMasterKey(this.deps.masterKeyHex);
    const payload = JSON.parse(stored.encryptedPrivateKey) as EncryptedPayload;
    const seed = decryptPrivateKey(payload, masterKey);
    return { seed, address: stored.publicKey };
  }

  /**
   * Retire la clé (révoque la session Live ; les fonds restent sur le compte
   * on-chain, l'agent ne peut juste plus signer via Tide). Marque l'agent
   * `hasLiveAccount = false`. Idempotent : delete sur agent sans clé = no-op,
   * update sur agent inconnu = no-op.
   */
  async revoke(agentId: string): Promise<void> {
    await this.deps.keys.delete(agentId);
    const agent = await this.deps.agents.get(agentId);
    if (agent) await this.deps.agents.update(agentId, { hasLiveAccount: false });
  }
}