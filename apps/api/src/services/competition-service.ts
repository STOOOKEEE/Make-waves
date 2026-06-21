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

interface CompetitionState {
  readonly competition: Competition;
  readonly participants: Set<string>;
  closed: boolean;
}

/** Résultat de clôture d'une compétition. */
export interface CompetitionResult {
  readonly payouts: Payout[];
  /** Reliquat non distribué (tournoi sous-rempli) à récupérer en trésorerie. */
  readonly undistributed: number;
}

/**
 * Fournit l'equity courante d'un joueur. Découple la clôture de `PaperService`
 * (le caller câble typiquement `(u) => paperService.equityOf(u, prices)`).
 */
export type EquityProvider = (userId: string) => number;

/**
 * Cycle de vie des compétitions en mémoire : créer, rejoindre, clôturer
 * (classer les participants par equity puis calculer les gains via `@tide/core`).
 * L'ancrage on-chain (buy-in `Payment` taggé) est produit séparément par le
 * builder `@tide/xrpl` et confirmé par l'indexeur ; ici on gère le hors-chaîne.
 */
export class CompetitionService {
  private readonly competitions = new Map<string, CompetitionState>();

  /** Crée une compétition (valide ses paramètres via le domaine). */
  create(competition: Competition): void {
    if (competition.id.trim() === "") {
      throw new InvalidCompetitionError("competition.id vide");
    }
    if (this.competitions.has(competition.id)) {
      throw new CompetitionExistsError(`Compétition déjà créée: ${competition.id}`);
    }
    assertValidBuyIn(competition.buyIn);
    assertValidRakeRatio(competition.rakeRatio);
    assertValidPayoutWeights(competition.payoutWeights);

    this.competitions.set(competition.id, {
      competition,
      participants: new Set<string>(),
      closed: false,
    });
  }

  /** Inscrit un joueur (devient participant). */
  join(competitionId: string, userId: string): void {
    if (userId.trim() === "") {
      throw new InvalidUserError("userId vide");
    }
    const state = this.requireOpen(competitionId);
    if (state.participants.has(userId)) {
      throw new AlreadyJoinedError(`Déjà inscrit: ${userId} -> ${competitionId}`);
    }
    state.participants.add(userId);
  }

  /** Liste des participants (copie). */
  participants(competitionId: string): string[] {
    return [...this.require(competitionId).participants];
  }

  /** Indique si la compétition est clôturée. */
  isClosed(competitionId: string): boolean {
    return this.require(competitionId).closed;
  }

  /**
   * Clôture : classe les participants par equity (via `equityOf`) et calcule
   * les gains + le reliquat. Idempotence interdite : une compétition déjà
   * clôturée ne peut pas l'être à nouveau (évite un double paiement).
   */
  close(competitionId: string, equityOf: EquityProvider): CompetitionResult {
    const state = this.requireOpen(competitionId);

    const ranked = rankByEquity(
      [...state.participants].map((userId) => ({
        userId,
        equity: equityOf(userId),
      })),
    );
    const payouts = computePayouts(state.competition, ranked);
    const undistributed = undistributedAmount(state.competition, ranked);

    state.closed = true;
    return { payouts, undistributed };
  }

  private require(competitionId: string): CompetitionState {
    const state = this.competitions.get(competitionId);
    if (state === undefined) {
      throw new CompetitionNotFoundError(
        `Compétition introuvable: ${competitionId}`,
      );
    }
    return state;
  }

  private requireOpen(competitionId: string): CompetitionState {
    const state = this.require(competitionId);
    if (state.closed) {
      throw new CompetitionClosedError(`Compétition clôturée: ${competitionId}`);
    }
    return state;
  }
}
