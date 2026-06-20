import type { Amount, Payment } from "xrpl";
import { assertValidAddress } from "./address";
import { assertAttributionTag } from "./source-tag";
import { assertValidAmount } from "./amount";
import { encodeMemo } from "./memo";
import { InvalidAddressError, InvalidMemoError } from "../errors";
import {
  MAX_COMPETITION_ID_LENGTH,
  MEMO_FORMAT_TEXT,
  MEMO_TYPE_JOIN,
} from "../constants";

/** Paramètres d'un buy-in de tournoi (inscription = `Payment` taggé). */
export interface BuyInPaymentParams {
  /** Joueur qui paie (signera la tx via Xaman). */
  readonly account: string;
  /** Compte prize pool (multisig) qui reçoit le buy-in. */
  readonly destination: string;
  /** Montant du buy-in (drops XRP en string, ou montant de token émis). */
  readonly amount: Amount;
  /** SourceTag du projet (attribution hackathon). */
  readonly sourceTag: number;
  /** Identifiant du tournoi, encodé en memo. */
  readonly competitionId: string;
}

/**
 * Construit la transaction `Payment` d'inscription à un tournoi : non signée,
 * destinée à être envoyée à Xaman pour signature non-custodial. Porte le
 * `SourceTag` (attribution) et un memo identifiant le tournoi.
 *
 * Valide adresses, SourceTag et competitionId avant de produire la tx.
 */
export function buildBuyInPayment(params: BuyInPaymentParams): Payment {
  const { account, destination, amount, sourceTag, competitionId } = params;

  assertValidAddress(account, "account");
  assertValidAddress(destination, "destination");
  if (account === destination) {
    throw new InvalidAddressError(
      "account et destination doivent être différents (buy-in vers le prize pool)",
    );
  }
  assertValidAmount(amount, "amount");
  assertAttributionTag(sourceTag);
  if (competitionId.trim() === "") {
    throw new InvalidMemoError("competitionId ne peut pas être vide");
  }
  if (competitionId.length > MAX_COMPETITION_ID_LENGTH) {
    throw new InvalidMemoError(
      `competitionId trop long (max ${String(MAX_COMPETITION_ID_LENGTH)})`,
    );
  }

  return {
    TransactionType: "Payment",
    Account: account,
    Destination: destination,
    Amount: amount,
    SourceTag: sourceTag,
    Memos: [
      encodeMemo({
        type: MEMO_TYPE_JOIN,
        data: competitionId,
        format: MEMO_FORMAT_TEXT,
      }),
    ],
  };
}
