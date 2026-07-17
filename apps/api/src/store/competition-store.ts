import type { Competition } from "@tide/core";

export type CompetitionMode = "paper" | "live";

/**
 * Définition persistée d'une vraie compétition. Les champs éditoriaux et les
 * dates vivent côté serveur : le front n'invente plus de catalogue parallèle.
 *
 * `rakeRatio=0` et `payoutWeights=[1]` sont imposés par CompetitionService :
 * l'intégralité des tickets revient à un gagnant unique.
 */
export interface CompetitionDefinition extends Competition {
  readonly nameEn: string;
  readonly nameFr: string;
  readonly descriptionEn: string;
  readonly descriptionFr: string;
  readonly mode: CompetitionMode;
  readonly startsAt: number;
  readonly endsAt: number;
}

/** Entrée payée et vérifiée on-chain. */
export interface CompetitionEntry {
  readonly competitionId: string;
  readonly userId: string;
  readonly walletAddress: string;
  readonly paymentTxHash: string;
  readonly entryEquity: number;
  readonly joinedAt: number;
}

/**
 * Persistance des compétitions. Abstraction permettant de basculer entre une
 * implémentation en mémoire et SQLite sans toucher au `CompetitionService`.
 * Les méthodes retournant `undefined` signalent une compétition absente.
 */
export interface CompetitionStore {
  has(id: string): boolean;
  create(competition: CompetitionDefinition): void;
  getCompetition(id: string): CompetitionDefinition | undefined;
  /** Toutes les compétitions (pour exposer la liste publique). */
  list(): CompetitionDefinition[];
  isClosed(id: string): boolean | undefined;
  entries(id: string): CompetitionEntry[] | undefined;
  hasParticipant(id: string, userId: string): boolean;
  hasPaymentTx(txHash: string): boolean;
  addEntry(entry: CompetitionEntry): void;
  markClosed(id: string, winnerUserId: string | null): void;
  winner(id: string): string | null | undefined;
}

interface CompetitionState {
  readonly competition: CompetitionDefinition;
  readonly entries: CompetitionEntry[];
  closed: boolean;
  winnerUserId: string | null;
}

/** Implémentation en mémoire (défaut, sans dépendance). */
export class InMemoryCompetitionStore implements CompetitionStore {
  private readonly competitions = new Map<string, CompetitionState>();

  has(id: string): boolean {
    return this.competitions.has(id);
  }

  create(competition: CompetitionDefinition): void {
    this.competitions.set(competition.id, {
      competition: {
        ...competition,
        payoutWeights: [...competition.payoutWeights],
      },
      entries: [],
      closed: false,
      winnerUserId: null,
    });
  }

  getCompetition(id: string): CompetitionDefinition | undefined {
    return this.competitions.get(id)?.competition;
  }

  list(): CompetitionDefinition[] {
    return [...this.competitions.values()].map((state) => state.competition);
  }

  isClosed(id: string): boolean | undefined {
    const state = this.competitions.get(id);
    return state === undefined ? undefined : state.closed;
  }

  entries(id: string): CompetitionEntry[] | undefined {
    const state = this.competitions.get(id);
    return state === undefined ? undefined : state.entries.map((entry) => ({ ...entry }));
  }

  hasParticipant(id: string, userId: string): boolean {
    return this.competitions.get(id)?.entries.some((entry) => entry.userId === userId) ?? false;
  }

  hasPaymentTx(txHash: string): boolean {
    for (const state of this.competitions.values()) {
      if (state.entries.some((entry) => entry.paymentTxHash === txHash)) return true;
    }
    return false;
  }

  addEntry(entry: CompetitionEntry): void {
    this.competitions.get(entry.competitionId)?.entries.push({ ...entry });
  }

  markClosed(id: string, winnerUserId: string | null): void {
    const state = this.competitions.get(id);
    if (state !== undefined) {
      state.closed = true;
      state.winnerUserId = winnerUserId;
    }
  }

  winner(id: string): string | null | undefined {
    const state = this.competitions.get(id);
    return state === undefined ? undefined : state.winnerUserId;
  }
}
