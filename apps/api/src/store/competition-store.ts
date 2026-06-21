import type { Competition } from "@tide/core";

/**
 * Persistance des compétitions. Abstraction permettant de basculer entre une
 * implémentation en mémoire et SQLite sans toucher au `CompetitionService`.
 * Les méthodes retournant `undefined` signalent une compétition absente.
 */
export interface CompetitionStore {
  has(id: string): boolean;
  create(competition: Competition): void;
  getCompetition(id: string): Competition | undefined;
  isClosed(id: string): boolean | undefined;
  participants(id: string): string[] | undefined;
  hasParticipant(id: string, userId: string): boolean;
  addParticipant(id: string, userId: string): void;
  markClosed(id: string): void;
}

interface CompetitionState {
  readonly competition: Competition;
  readonly participants: Set<string>;
  closed: boolean;
}

/** Implémentation en mémoire (défaut, sans dépendance). */
export class InMemoryCompetitionStore implements CompetitionStore {
  private readonly competitions = new Map<string, CompetitionState>();

  has(id: string): boolean {
    return this.competitions.has(id);
  }

  create(competition: Competition): void {
    this.competitions.set(competition.id, {
      competition: {
        ...competition,
        payoutWeights: [...competition.payoutWeights],
      },
      participants: new Set<string>(),
      closed: false,
    });
  }

  getCompetition(id: string): Competition | undefined {
    return this.competitions.get(id)?.competition;
  }

  isClosed(id: string): boolean | undefined {
    const state = this.competitions.get(id);
    return state === undefined ? undefined : state.closed;
  }

  participants(id: string): string[] | undefined {
    const state = this.competitions.get(id);
    return state === undefined ? undefined : [...state.participants];
  }

  hasParticipant(id: string, userId: string): boolean {
    return this.competitions.get(id)?.participants.has(userId) ?? false;
  }

  addParticipant(id: string, userId: string): void {
    this.competitions.get(id)?.participants.add(userId);
  }

  markClosed(id: string): void {
    const state = this.competitions.get(id);
    if (state !== undefined) {
      state.closed = true;
    }
  }
}
