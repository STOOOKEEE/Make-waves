/**
 * Mappe les erreurs typées (domaine + bord HTTP) vers un code HTTP. On mappe par
 * NOM d'erreur (pas `instanceof`) pour ne pas coupler ce module à toutes les
 * classes des packages. Tout ce qui n'est pas connu = 500 (bug, pas faute client).
 */
const STATUS_BY_ERROR_NAME: Readonly<Record<string, number>> = {
  // 400 — entrée invalide
  BadRequestError: 400,
  InvalidUserError: 400,
  InvalidStartingEquityError: 400,
  InvalidOrderError: 400,
  InvalidCompetitionError: 400,
  InvalidPositionError: 400,
  InvalidPriceError: 400,
  MissingPriceError: 400,
  InvalidAmountError: 400,
  InvalidSourceTagError: 400,
  InvalidAddressError: 400,
  InvalidMemoError: 400,
  InvalidMetricError: 400,
  LiveExecError: 400,
  MandateInvalidError: 400,
  // 404 — ressource absente
  AccountNotFoundError: 404,
  CompetitionNotFoundError: 404,
  PositionNotFoundError: 404,
  AgentNotFoundError: 404,
  MandateNotFoundError: 404,
  // 409 — conflit d'état
  AccountExistsError: 409,
  AlreadyJoinedError: 409,
  CompetitionExistsError: 409,
  CompetitionClosedError: 409,
  InsufficientBalanceError: 409,
  AgentAlreadyExistsError: 409,
  MandateAlreadyExistsError: 409,
  // 502 — échec d'un service amont (feed de prix, Xaman)
  PriceFeedError: 502,
  XamanError: 502,
};

/** Code HTTP pour une erreur ; 500 par défaut (cause inconnue). */
export function statusForError(error: unknown): number {
  if (error instanceof Error) {
    return STATUS_BY_ERROR_NAME[error.name] ?? 500;
  }
  return 500;
}
