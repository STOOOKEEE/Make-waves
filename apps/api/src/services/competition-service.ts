import {
  assertValidBuyIn,
  assertValidPayoutWeights,
  assertValidRakeRatio,
  computePayouts,
  InvalidCompetitionError,
  rankByEquity,
  undistributedAmount,
} from "@tide/core";
import type { Competition, Payout } from "@tide/core";
import {
  AlreadyJoinedError,
  CompetitionClosedError,
  CompetitionExistsError,
  CompetitionNotFoundError,
  InvalidUserError,
} from "./errors";
import { InMemoryCompetitionStore } from "../store/competition-store";
import type { CompetitionStore } from "../store/competition-store";

/** Résultat de clôture d'une compétition. */
export interface CompetitionResult {
  readonly payouts: Payout[];
  /** Reliquat non distribué (tournoi sous-rempli) à récupérer en trésorerie. */
  readonly undistributed: number;
}

/**
 * Vue publique d'une compétition : ses paramètres économiques + son état LIVE
 * (nombre de participants réels, pot courant, clôturée ou non). C'est ce que le
 * front fusionne avec son catalogue de présentation (nom, visuel, descriptif).
 */
export interface CompetitionSummary {
  readonly id: string;
  readonly buyIn: number;
  readonly rakeRatio: number;
  readonly payoutWeights: readonly number[];
  /** Nombre de participants réellement inscrits. */
  readonly participants: number;
  /** Pot courant = buy-in × participants (devise de référence). */
  readonly pot: number;
  readonly closed: boolean;
}

/**
 * Fournit l'equity courante d'un joueur. Découple la clôture de `PaperService`
 * (le caller câble typiquement `(u) => paperService.equityOf(u, prices)`).
 */
export type EquityProvider = (userId: string) => number;

/**
 * Cycle de vie des compétitions : créer, rejoindre, clôturer (classer par equity
 * puis calculer les gains via `@tide/core`). La persistance est déléguée à un
 * `CompetitionStore` injecté (en mémoire par défaut, SQLite en option).
 */
export class CompetitionService {
  private readonly store: CompetitionStore;

  constructor(store: CompetitionStore = new InMemoryCompetitionStore()) {
    this.store = store;
  }

  /** Crée une compétition (valide ses paramètres via le domaine). */
  create(competition: Competition): void {
    if (competition.id.trim() === "") {
      throw new InvalidCompetitionError("competition.id vide");
    }
    if (this.store.has(competition.id)) {
      throw new CompetitionExistsError(`Compétition déjà créée: ${competition.id}`);
    }
    assertValidBuyIn(competition.buyIn);
    assertValidRakeRatio(competition.rakeRatio);
    assertValidPayoutWeights(competition.payoutWeights);

    this.store.create(competition);
  }

  /** Liste publique de toutes les compétitions, enrichies de leur état live. */
  list(): CompetitionSummary[] {
    return this.store.list().map((competition) => this.toSummary(competition));
  }

  /** Vue publique d'une compétition. Lève si elle est introuvable. */
  get(competitionId: string): CompetitionSummary {
    const competition = this.store.getCompetition(competitionId);
    if (competition === undefined) {
      throw new CompetitionNotFoundError(
        `Compétition introuvable: ${competitionId}`,
      );
    }
    return this.toSummary(competition);
  }

  private toSummary(competition: Competition): CompetitionSummary {
    const participants = this.store.participants(competition.id)?.length ?? 0;
    return {
      ...competition,
      participants,
      pot: competition.buyIn * participants,
      closed: this.store.isClosed(competition.id) ?? false,
    };
  }

  /** Inscrit un joueur (devient participant). */
  join(competitionId: string, userId: string): void {
    if (userId.trim() === "") {
      throw new InvalidUserError("userId vide");
    }
    this.requireOpen(competitionId);
    if (this.store.hasParticipant(competitionId, userId)) {
      throw new AlreadyJoinedError(`Déjà inscrit: ${userId} -> ${competitionId}`);
    }
    this.store.addParticipant(competitionId, userId);
  }

  /** Liste des participants. */
  participants(competitionId: string): string[] {
    const participants = this.store.participants(competitionId);
    if (participants === undefined) {
      throw new CompetitionNotFoundError(
        `Compétition introuvable: ${competitionId}`,
      );
    }
    return participants;
  }

  /** Indique si la compétition est clôturée. */
  isClosed(competitionId: string): boolean {
    const closed = this.store.isClosed(competitionId);
    if (closed === undefined) {
      throw new CompetitionNotFoundError(
        `Compétition introuvable: ${competitionId}`,
      );
    }
    return closed;
  }

  /**
   * Clôture : classe les participants par equity (via `equityOf`) et calcule
   * les gains + le reliquat. `markClosed` n'est appelé qu'APRÈS le calcul : une
   * exception (provider qui lève, equity NaN) laisse la compétition réessayable
   * (anti double paiement).
   */
  close(competitionId: string, equityOf: EquityProvider): CompetitionResult {
    const competition = this.requireOpen(competitionId);
    const participants = this.store.participants(competitionId) ?? [];

    const ranked = rankByEquity(
      participants.map((userId) => ({ userId, equity: equityOf(userId) })),
    );
    const payouts = computePayouts(competition, ranked);
    const undistributed = undistributedAmount(competition, ranked);

    this.store.markClosed(competitionId);
    return { payouts, undistributed };
  }

  private requireOpen(competitionId: string): Competition {
    const competition = this.store.getCompetition(competitionId);
    if (competition === undefined) {
      throw new CompetitionNotFoundError(
        `Compétition introuvable: ${competitionId}`,
      );
    }
    if (this.store.isClosed(competitionId) === true) {
      throw new CompetitionClosedError(`Compétition clôturée: ${competitionId}`);
    }
    return competition;
  }
}
