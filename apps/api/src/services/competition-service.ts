import {
  assertValidBuyIn,
  assertValidEquity,
  InvalidCompetitionError,
} from "@tide/core";
import {
  AlreadyJoinedError,
  CompetitionClosedError,
  CompetitionExistsError,
  CompetitionNotFoundError,
  CompetitionRegistrationClosedError,
  CompetitionPaymentInvalidError,
  InvalidUserError,
} from "./errors";
import { InMemoryCompetitionStore } from "../store/competition-store";
import type {
  CompetitionDefinition,
  CompetitionStore,
} from "../store/competition-store";

export type CompetitionStatus = "upcoming" | "live" | "ended";

/** Vue publique : aucune valeur d'affichage n'est inventée côté front. */
export interface CompetitionSummary extends CompetitionDefinition {
  readonly participants: number;
  readonly pot: number;
  readonly closed: boolean;
  readonly status: CompetitionStatus;
  readonly winnerUserId: string | null;
  readonly entryPaymentEnabled: boolean;
}

export interface CompetitionLeaderboardEntry {
  readonly rank: number;
  readonly userId: string;
  readonly walletAddress: string;
  readonly equity: number;
  readonly entryEquity: number;
  readonly returnPct: number;
  readonly joinedAt: number;
}

export interface CompetitionResult {
  readonly winner: {
    readonly userId: string;
    readonly walletAddress: string;
  } | null;
  /** Pool winner-takes-all, exprimé en XRP. */
  readonly pot: number;
}

export interface VerifiedCompetitionEntry {
  readonly userId: string;
  readonly walletAddress: string;
  readonly paymentTxHash: string;
  readonly entryEquity: number;
}

export type EquityProvider = (userId: string) => number;

const MAX_TEXT = 2_000;
const COMPETITION_ID_RE = /^[A-Z0-9_.-]{1,64}$/i;

function requiredText(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > MAX_TEXT) {
    throw new InvalidCompetitionError(`${field} invalide`);
  }
  return trimmed;
}

/**
 * Cycle de vie des compétitions payantes. Une entrée n'est ajoutée qu'après
 * validation on-chain du ticket par la couche HTTP. Le classement utilise le
 * rendement depuis l'equity capturée à l'inscription et non un faux leaderboard.
 */
export class CompetitionService {
  constructor(
    private readonly store: CompetitionStore = new InMemoryCompetitionStore(),
    private readonly now: () => number = () => Date.now(),
    private readonly entryPaymentEnabled: () => boolean = () => false,
  ) {}

  create(competition: CompetitionDefinition): void {
    const id = competition.id.trim();
    if (!COMPETITION_ID_RE.test(id)) {
      throw new InvalidCompetitionError(
        "competition.id doit contenir 1 à 64 caractères [A-Z0-9_.-]",
      );
    }
    if (this.store.has(id)) {
      throw new CompetitionExistsError(`Compétition déjà créée: ${id}`);
    }
    requiredText(competition.nameEn, "nameEn");
    requiredText(competition.nameFr, "nameFr");
    requiredText(competition.descriptionEn, "descriptionEn");
    requiredText(competition.descriptionFr, "descriptionFr");
    if (competition.mode !== "paper" && competition.mode !== "live") {
      throw new InvalidCompetitionError(`mode invalide: ${String(competition.mode)}`);
    }
    assertValidBuyIn(competition.buyIn);
    // Les tickets XRP ont au maximum 6 décimales. La comparaison en unités
    // entières empêche un montant impossible à représenter en drops.
    const drops = competition.buyIn * 1_000_000;
    if (!Number.isSafeInteger(drops)) {
      throw new InvalidCompetitionError("buyIn doit être représentable en drops XRP");
    }
    if (competition.rakeRatio !== 0) {
      throw new InvalidCompetitionError("rakeRatio doit être 0 (aucun prélèvement)");
    }
    if (
      competition.payoutWeights.length !== 1 ||
      competition.payoutWeights[0] !== 1
    ) {
      throw new InvalidCompetitionError(
        "payoutWeights doit être [1] (winner takes all)",
      );
    }
    if (
      !Number.isSafeInteger(competition.startsAt) ||
      !Number.isSafeInteger(competition.endsAt) ||
      competition.endsAt <= competition.startsAt
    ) {
      throw new InvalidCompetitionError("fenêtre startsAt/endsAt invalide");
    }
    this.store.create({
      ...competition,
      id,
      nameEn: requiredText(competition.nameEn, "nameEn"),
      nameFr: requiredText(competition.nameFr, "nameFr"),
      descriptionEn: requiredText(competition.descriptionEn, "descriptionEn"),
      descriptionFr: requiredText(competition.descriptionFr, "descriptionFr"),
    });
  }

  list(): CompetitionSummary[] {
    return this.store.list().map((competition) => this.toSummary(competition));
  }

  get(competitionId: string): CompetitionSummary {
    return this.toSummary(this.requireCompetition(competitionId));
  }

  private toSummary(competition: CompetitionDefinition): CompetitionSummary {
    const participants = this.store.entries(competition.id)?.length ?? 0;
    const closed = this.store.isClosed(competition.id) ?? false;
    return {
      ...competition,
      participants,
      pot: competition.buyIn * participants,
      closed,
      status: this.statusOf(competition, closed),
      winnerUserId: this.store.winner(competition.id) ?? null,
      entryPaymentEnabled: this.entryPaymentEnabled(),
    };
  }

  private statusOf(
    competition: CompetitionDefinition,
    closed: boolean,
  ): CompetitionStatus {
    const now = this.now();
    if (closed || now >= competition.endsAt) return "ended";
    if (now < competition.startsAt) return "upcoming";
    return "live";
  }

  /** Enregistre une entrée dont le Payment XRPL a déjà été validé. */
  join(competitionId: string, entry: VerifiedCompetitionEntry): void {
    if (entry.userId.trim() === "") throw new InvalidUserError("userId vide");
    const competition = this.requireOpen(competitionId);
    if (this.now() >= competition.endsAt) {
      throw new CompetitionRegistrationClosedError("Les inscriptions sont terminées");
    }
    if (this.store.hasParticipant(competitionId, entry.userId)) {
      throw new AlreadyJoinedError(`Déjà inscrit: ${entry.userId} -> ${competitionId}`);
    }
    if (this.store.hasPaymentTx(entry.paymentTxHash)) {
      throw new CompetitionPaymentInvalidError("Ce ticket XRPL a déjà été utilisé");
    }
    assertValidEquity(entry.entryEquity, entry.userId);
    if (entry.entryEquity <= 0) {
      throw new InvalidCompetitionError("entryEquity doit être positive");
    }
    this.store.addEntry({
      competitionId,
      ...entry,
      joinedAt: this.now(),
    });
  }

  participants(competitionId: string): string[] {
    const entries = this.store.entries(competitionId);
    if (entries === undefined) {
      throw new CompetitionNotFoundError(`Compétition introuvable: ${competitionId}`);
    }
    return entries.map((entry) => entry.userId);
  }

  leaderboard(
    competitionId: string,
    equityOf: EquityProvider,
  ): CompetitionLeaderboardEntry[] {
    const entries = this.store.entries(competitionId);
    if (entries === undefined) {
      throw new CompetitionNotFoundError(`Compétition introuvable: ${competitionId}`);
    }
    return entries
      .map((entry) => {
        const current = equityOf(entry.userId);
        assertValidEquity(current, entry.userId);
        return {
          ...entry,
          equity: current,
          returnPct: ((current - entry.entryEquity) / entry.entryEquity) * 100,
        };
      })
      .sort(
        (a, b) =>
          b.returnPct - a.returnPct ||
          a.joinedAt - b.joinedAt ||
          a.userId.localeCompare(b.userId),
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  /** Clôture winner-takes-all. Le Payment multisig est préparé à la frontière HTTP. */
  close(competitionId: string, equityOf: EquityProvider): CompetitionResult {
    const competition = this.requireOpen(competitionId);
    if (this.now() < competition.endsAt) {
      throw new CompetitionRegistrationClosedError(
        "La compétition ne peut pas être clôturée avant endsAt",
      );
    }
    const winner = this.leaderboard(competitionId, equityOf)[0] ?? null;
    const count = this.store.entries(competitionId)?.length ?? 0;
    const pot = competition.buyIn * count;
    this.store.markClosed(competitionId, winner?.userId ?? null);
    return { winner, pot };
  }

  /**
   * Recharge le règlement persisté. Cela permet de régénérer exactement le
   * Payment multisig après un refresh de la console sans recalculer le gagnant.
   */
  settlement(competitionId: string): CompetitionResult {
    const competition = this.requireCompetition(competitionId);
    if (this.store.isClosed(competitionId) !== true) {
      throw new CompetitionRegistrationClosedError(
        "La compétition n'est pas encore clôturée",
      );
    }
    const entries = this.store.entries(competitionId) ?? [];
    const winnerUserId = this.store.winner(competitionId) ?? null;
    const winner =
      winnerUserId === null
        ? null
        : entries.find((entry) => entry.userId === winnerUserId) ?? null;
    if (winnerUserId !== null && winner === null) {
      throw new InvalidCompetitionError("Gagnant persisté introuvable dans les entrées");
    }
    return { winner, pot: competition.buyIn * entries.length };
  }

  isClosed(competitionId: string): boolean {
    const closed = this.store.isClosed(competitionId);
    if (closed === undefined) {
      throw new CompetitionNotFoundError(`Compétition introuvable: ${competitionId}`);
    }
    return closed;
  }

  private requireCompetition(competitionId: string): CompetitionDefinition {
    const competition = this.store.getCompetition(competitionId);
    if (competition === undefined) {
      throw new CompetitionNotFoundError(`Compétition introuvable: ${competitionId}`);
    }
    return competition;
  }

  private requireOpen(competitionId: string): CompetitionDefinition {
    const competition = this.requireCompetition(competitionId);
    if (this.store.isClosed(competitionId) === true) {
      throw new CompetitionClosedError(`Compétition clôturée: ${competitionId}`);
    }
    return competition;
  }
}
