import { XrplRequestError } from "./errors";

/**
 * Catégorie d'un `engine_result` XRPL (préfixe à 3 lettres) :
 * - `success` : `tesSUCCESS` (appliquée localement) ;
 * - `failed` : `tec*` (incluse, frais prélevés, mais échec) ou `tef*` (ne pourra
 *   jamais s'appliquer) ;
 * - `retry` : `ter*` (pourrait réussir dans un ledger ultérieur) ;
 * - `malformed` : `tem*` (transaction mal formée) ;
 * - `local` : `tel*` (erreur locale, non soumise au consensus) ;
 * - `unknown` : préfixe inattendu.
 */
export type EngineResultCategory =
  | "success"
  | "failed"
  | "retry"
  | "malformed"
  | "local"
  | "unknown";

export function classifyEngineResult(engineResult: string): EngineResultCategory {
  if (engineResult === "tesSUCCESS") {
    return "success";
  }
  switch (engineResult.slice(0, 3)) {
    case "tes":
      return "success";
    case "tec":
    case "tef":
      return "failed";
    case "ter":
      return "retry";
    case "tem":
      return "malformed";
    case "tel":
      return "local";
    default:
      return "unknown";
  }
}

/**
 * La tx est-elle entrée dans un ledger ? `tesSUCCESS` (succès) ET `tec*` (échec
 * mais inclus : frais prélevés, sequence consommé) → true. Distinction critique
 * pour un éventuel retry : après un `tec`, il faut un NOUVEAU sequence ; après
 * `tef`/`ter`/`tem`/`tel`, la tx n'a jamais été incluse (sequence intact).
 */
export function wasIncludedInLedger(engineResult: string): boolean {
  return engineResult === "tesSUCCESS" || engineResult.startsWith("tec");
}

/**
 * Résultat d'une soumission. **Provisoire** : `engine_result` est l'avis du nœud
 * au moment du submit, PAS la finalité — une tx `tesSUCCESS` ici peut encore ne
 * pas être incluse dans un ledger validé. Confirmer via le ledger validé (tx/meta).
 */
export interface SubmitOutcome {
  readonly engineResult: string;
  /** Code numérique canonique rippled (si fourni). */
  readonly engineResultCode?: number;
  readonly category: EngineResultCategory;
  /** Tx entrée au ledger (`tes`/`tec`) → frais prélevés, sequence consommé. */
  readonly includedInLedger: boolean;
  readonly accepted: boolean;
  readonly applied: boolean;
  /** Tx mise en file d'attente (provisoire ≠ rejet). */
  readonly queued: boolean;
  /** Ledger validé de référence pour aller confirmer la finalité (si fourni). */
  readonly validatedLedgerIndex?: number;
  readonly message: string;
  readonly provisional: true;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new XrplRequestError("submit: réponse non-objet");
  }
  return value as Record<string, unknown>;
}

/** Valide défensivement un `result` de `submit` et le classe sans avaler l'échec. */
export function parseSubmitResult(result: unknown): SubmitOutcome {
  const record = asRecord(result);
  const engineResult = record["engine_result"];
  if (typeof engineResult !== "string") {
    throw new XrplRequestError("submit: engine_result absent ou non-string");
  }
  const message = record["engine_result_message"];
  const code = record["engine_result_code"];
  const validatedLedgerIndex = record["validated_ledger_index"];
  return {
    engineResult,
    ...(typeof code === "number" ? { engineResultCode: code } : {}),
    category: classifyEngineResult(engineResult),
    includedInLedger: wasIncludedInLedger(engineResult),
    accepted: record["accepted"] === true,
    applied: record["applied"] === true,
    queued: record["queued"] === true,
    ...(typeof validatedLedgerIndex === "number"
      ? { validatedLedgerIndex }
      : {}),
    message: typeof message === "string" ? message : "",
    provisional: true,
  };
}
