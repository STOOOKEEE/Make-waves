import type { Amount } from "xrpl";
import type { AmmInfoResult } from "../price/amm-reader";
import type { BookOffer, BookOffersResult } from "../price/book-reader";
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

/** Variante optionnelle d'un montant funded : présent → doit être un Amount. */
function optionalAmount(value: unknown, context: string): Amount | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isAmount(value)) {
    throw new XrplRequestError(`${context}: montant funded malformé`);
  }
  return value;
}

function parseBookOffer(value: unknown, index: number): BookOffer {
  const record = asRecord(value, `book_offers.offers[${String(index)}]`);
  const takerGets = record["TakerGets"];
  const takerPays = record["TakerPays"];
  if (!isAmount(takerGets) || !isAmount(takerPays)) {
    throw new XrplRequestError(
      `book_offers.offers[${String(index)}]: TakerGets/TakerPays malformés`,
    );
  }
  const getsFunded = optionalAmount(
    record["taker_gets_funded"],
    `book_offers.offers[${String(index)}].taker_gets_funded`,
  );
  const paysFunded = optionalAmount(
    record["taker_pays_funded"],
    `book_offers.offers[${String(index)}].taker_pays_funded`,
  );
  return {
    TakerGets: takerGets,
    TakerPays: takerPays,
    ...(getsFunded !== undefined ? { taker_gets_funded: getsFunded } : {}),
    ...(paysFunded !== undefined ? { taker_pays_funded: paysFunded } : {}),
  };
}

/**
 * Valide défensivement un `result` de `book_offers` brut et le ramène à la forme
 * typée `BookOffersResult`. Un carnet vide (`offers: []`) est un cas géré (le
 * lecteur lèvera `InvalidPriceError` côté lecture) ; une liste absente ou une
 * offre malformée lèvent `XrplRequestError`.
 */
export function parseBookOffersResult(result: unknown): BookOffersResult {
  const record = asRecord(result, "book_offers");
  const offers = record["offers"];
  if (!Array.isArray(offers)) {
    throw new XrplRequestError("book_offers: champ offers absent ou non-tableau");
  }
  return { result: { offers: offers.map(parseBookOffer) } };
}

/** Page de réponse `account_tx` réduite à ce que l'indexeur consomme. */
export interface AccountTxPage {
  /** Entrées brutes (parsées défensivement plus loin par l'extracteur). */
  readonly transactions: readonly unknown[];
  /** Plus haut ledger couvert par la requête → curseur de progression. */
  readonly ledgerIndexMax: number;
  /** Présent s'il reste des pages : à renvoyer pour paginer (sinon `undefined`). */
  readonly marker?: unknown;
}

/**
 * Valide défensivement un `result` d'`account_tx`. On NE parse PAS ici le détail
 * des transactions (c'est le rôle de `extractTaggedTxs`, pur) ; on extrait juste
 * la liste brute, la borne haute de ledger (curseur) et le `marker` (pagination).
 */
export function parseAccountTxResult(result: unknown): AccountTxPage {
  const record = asRecord(result, "account_tx");
  const transactions = record["transactions"];
  if (!Array.isArray(transactions)) {
    throw new XrplRequestError("account_tx: transactions absent ou non-tableau");
  }
  const ledgerIndexMax = record["ledger_index_max"];
  if (typeof ledgerIndexMax !== "number") {
    throw new XrplRequestError("account_tx: ledger_index_max absent ou non-numérique");
  }
  return { transactions, ledgerIndexMax, marker: record["marker"] };
}
