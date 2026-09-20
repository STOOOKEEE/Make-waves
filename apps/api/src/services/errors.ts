/** Erreurs typées de la couche service (état applicatif). */

/** Identifiant d'utilisateur invalide (vide). */
export class InvalidUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserError";
  }
}

/** Compte déjà ouvert pour cet utilisateur. */
export class AccountExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountExistsError";
  }
}

/** Aucun compte pour cet utilisateur. */
export class AccountNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountNotFoundError";
  }
}

/** Capital de départ invalide (non fini ou ≤ 0). */
export class InvalidStartingEquityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStartingEquityError";
  }
}

/** Aucune position ouverte avec cet identifiant pour ce compte. */
export class PositionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PositionNotFoundError";
  }
}

/** Compétition déjà créée avec cet identifiant. */
export class CompetitionExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompetitionExistsError";
  }
}

/** Aucune compétition pour cet identifiant. */
export class CompetitionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompetitionNotFoundError";
  }
}

/** L'utilisateur a déjà rejoint cette compétition. */
export class AlreadyJoinedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlreadyJoinedError";
  }
}

/** Opération impossible : la compétition est clôturée. */
export class CompetitionClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompetitionClosedError";
  }
}

/** L'inscription n'est pas ouverte selon les dates de la compétition. */
export class CompetitionRegistrationClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompetitionRegistrationClosedError";
  }
}

/** Le ticket XRPL ne correspond pas exactement à l'inscription attendue. */
export class CompetitionPaymentInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompetitionPaymentInvalidError";
  }
}

/** Le runtime XRPL nécessaire aux tickets réels n'est pas configuré. */
export class CompetitionPaymentUnavailableError extends Error {
  constructor() {
    super("Paiement des tickets XRPL non configuré");
    this.name = "CompetitionPaymentUnavailableError";
  }
}

/** Le moteur de scoring réel du mode demandé n'est pas branché. */
export class CompetitionScoringUnavailableError extends Error {
  constructor(mode: string) {
    super(`Scoring ${mode} non configuré`);
    this.name = "CompetitionScoringUnavailableError";
  }
}

/** Un agent avec cet identifiant existe déjà. */
export class AgentAlreadyExistsError extends Error {
  constructor(id: string) {
    super(`Agent ${id} already exists`);
    this.name = "AgentAlreadyExistsError";
  }
}

/** Un mandat avec cet identifiant existe déjà. */
export class MandateAlreadyExistsError extends Error {
  constructor(id: string) {
    super(`Mandate ${id} already exists`);
    this.name = "MandateAlreadyExistsError";
  }
}

/** Mandat dans un état invalide pour l'opération demandée. */
export class MandateInvalidError extends Error {
  constructor(reason: string) {
    super(`Mandate invalid: ${reason}`);
    this.name = "MandateInvalidError";
  }
}
