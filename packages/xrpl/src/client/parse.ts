import type { Amount } from "xrpl";
import type { AmmInfoResult } from "../price/amm-reader";
import { XrplRequestError } from "./errors";

/** Garde structurelle d'un `Amount` XRPL : string (drops) ou objet IOU. */
export function isAmount(value: unknown): value is Amount {
  if (typeof value === "string") {
    return true;
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record["currency"] === "string" &&
    typeof record["issuer"] === "string" &&
    typeof record["value"] === "string"
  );
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new XrplRequestError(`${context}: réponse non-objet`);
  }
  return value as Record<string, unknown>;
}

/**
 * Valide défensivement un `result` d'`amm_info` brut (issu du réseau) et le
 * ramène à la forme typée `AmmInfoResult`. Un pool absent est un cas géré
 * (`amm` undefined) ; des réserves malformées lèvent `XrplRequestError`. La
 * validation fine des montants (> 0) reste faite en aval par le lecteur de prix.
 */
export function parseAmmInfoResult(result: unknown): AmmInfoResult {
  const record = asRecord(result, "amm_info");
  const amm = record["amm"];
  // Pool absent : rippled omet la clé `amm` ; on tolère aussi `null` par
  // robustesse (les deux = « pas de pool », cas géré, pas une donnée malformée).
  if (amm === undefined || amm === null) {
    return { result: {} };
  }
  const ammRecord = asRecord(amm, "amm_info.amm");
  const amount = ammRecord["amount"];
  const amount2 = ammRecord["amount2"];
  if (!isAmount(amount) || !isAmount(amount2)) {
    throw new XrplRequestError("amm_info: réserves (amount/amount2) malformées");
  }
  return { result: { amm: { amount, amount2 } } };
}
