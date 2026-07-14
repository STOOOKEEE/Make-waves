import { randomBytes } from "node:crypto";

/** Nombre d'octets aléatoires du nonce (32 hex chars). */
const NONCE_BYTES = 16;

/**
 * Store des challenges d'authentification GemWallet. À chaque adresse, un nonce
 * unique à durée de vie courte que le wallet doit signer pour prouver le contrôle
 * de la clé. Un nonce est à **usage unique** (consommé = supprimé) et **expire**.
 *
 * En mémoire : le déploiement est mono-processus (un conteneur). Un redémarrage
 * invalide les challenges en cours (TTL court, re-challenge trivial).
 * ponytail : passer en table SQLite si l'API devient multi-instance.
 */
export interface ChallengeStore {
  /** Émet (et enregistre) un nonce pour l'adresse ; remplace tout nonce en cours. */
  issue(address: string): string;
  /** Valide + consomme le nonce (vrai si présent, non expiré, correspondant). */
  consume(address: string, nonce: string): boolean;
}

interface Entry {
  readonly nonce: string;
  readonly expiresAt: number;
}

export class InMemoryChallengeStore implements ChallengeStore {
  private readonly challenges = new Map<string, Entry>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  issue(address: string): string {
    const nonce = randomBytes(NONCE_BYTES).toString("hex");
    this.challenges.set(address, { nonce, expiresAt: this.now() + this.ttlMs });
    return nonce;
  }

  consume(address: string, nonce: string): boolean {
    const entry = this.challenges.get(address);
    if (entry === undefined) {
      return false;
    }
    // Un nonce ne sert qu'une fois : on le retire quoi qu'il arrive (échec de
    // correspondance ou d'expiration compris → pas de réutilisation possible).
    this.challenges.delete(address);
    if (entry.nonce !== nonce) {
      return false;
    }
    return this.now() <= entry.expiresAt;
  }
}
