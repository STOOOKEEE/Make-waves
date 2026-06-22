import type { Amount, Payment } from "xrpl";
import type { XrplCurrency } from "../price/amm-reader";
import { assertValidAddress } from "./address";
import { assertAttributionTag } from "./source-tag";
import { assertValidAmount } from "./amount";
import { encodeMemo } from "./memo";
import { allocateLargestRemainder } from "./drops";
import { InvalidAddressError, InvalidAmountError, InvalidMemoError } from "../errors";
import {
  DROPS_PER_XRP,
  MAX_COMPETITION_ID_LENGTH,
  MEMO_FORMAT_TEXT,
  MEMO_TYPE_PAYOUT,
} from "../constants";

/** Précision de répartition d'un payout IOU (6 décimales). */
const IOU_UNITS = 1_000_000;

/** Un gagnant à payer : son adresse et son gain (en devise de référence). */
export interface PayoutRecipient {
  readonly address: string;
  readonly amount: number;
}

export interface PayoutPaymentsParams {
  /** Compte prize pool (multisig) qui verse. */
  readonly from: string;
  /** Gagnants et leurs montants (issus de `computePayouts`, adresses résolues). */
  readonly recipients: readonly PayoutRecipient[];
  /** Devise de versement (XRP ou IOU). */
  readonly currency: XrplCurrency;
  /** SourceTag de Tide (attribution). */
  readonly sourceTag: number;
  /** Tournoi concerné (memo). */
  readonly competitionId: string;
}

/** Valeur IOU propre depuis des unités atomiques (≤ 15 chiffres, décimal). */
function iouValue(units: number): string {
  return Number((units / IOU_UNITS).toPrecision(15)).toString();
}

/**
 * Construit les `Payment` taggés de distribution d'un prize pool : un par gagnant,
 * depuis le compte multisig, avec un memo `tide/payout`. Non signés (à multisigner).
 *
 * Les montants `number` sont convertis en unités entières par la **méthode du
 * plus grand reste** (`allocateLargestRemainder`) → `Σ versé = round(Σ gains)`
 * sans dérive de drops. Un gain qui s'arrondit à 0 unité n'engendre pas de
 * `Payment` (pas de versement nul). Valide adresses (distinctes, ≠ pool), tag,
 * memo, et chaque montant produit.
 */
export function buildPayoutPayments(params: PayoutPaymentsParams): Payment[] {
  const { from, recipients, currency, sourceTag, competitionId } = params;
  assertValidAddress(from, "from");
  assertAttributionTag(sourceTag);
  if (competitionId.trim() === "") {
    throw new InvalidMemoError("competitionId ne peut pas être vide");
  }
  if (competitionId.length > MAX_COMPETITION_ID_LENGTH) {
    throw new InvalidMemoError(
      `competitionId trop long (max ${String(MAX_COMPETITION_ID_LENGTH)})`,
    );
  }
  if (recipients.length === 0) {
    throw new InvalidAmountError("aucun bénéficiaire à payer");
  }

  const seen = new Set<string>();
  for (const recipient of recipients) {
    assertValidAddress(recipient.address, "bénéficiaire");
    if (recipient.address === from) {
      throw new InvalidAddressError("un bénéficiaire ne peut pas être le prize pool");
    }
    if (seen.has(recipient.address)) {
      throw new InvalidAddressError(`bénéficiaire en double: ${recipient.address}`);
    }
    seen.add(recipient.address);
    if (!Number.isFinite(recipient.amount) || recipient.amount < 0) {
      throw new InvalidAmountError(`gain invalide: ${String(recipient.amount)}`);
    }
  }

  const isXrp = currency.currency === "XRP";
  let iouIssuer = "";
  if (!isXrp) {
    if (currency.issuer === undefined) {
      throw new InvalidAmountError(`issuer requis pour le token ${currency.currency}`);
    }
    iouIssuer = currency.issuer;
  }
  const unitsPerWhole = isXrp ? DROPS_PER_XRP : IOU_UNITS;
  const units = allocateLargestRemainder(
    recipients.map((recipient) => recipient.amount),
    unitsPerWhole,
  );

  const memo = encodeMemo({
    type: MEMO_TYPE_PAYOUT,
    data: competitionId,
    format: MEMO_FORMAT_TEXT,
  });

  const payments: Payment[] = [];
  recipients.forEach((recipient, index) => {
    const allocated = units[index] ?? 0;
    if (allocated <= 0) {
      return; // pas de Payment pour un gain nul
    }
    const amount: Amount = isXrp
      ? String(allocated)
      : {
          currency: currency.currency,
          issuer: iouIssuer,
          value: iouValue(allocated),
        };
    assertValidAmount(amount, "payout");
    payments.push({
      TransactionType: "Payment",
      Account: from,
      Destination: recipient.address,
      Amount: amount,
      SourceTag: sourceTag,
      Memos: [memo],
    });
  });

  return payments;
}
