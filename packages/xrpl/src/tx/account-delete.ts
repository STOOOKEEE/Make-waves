import type { AccountDelete } from "xrpl";
import { assertValidAddress } from "./address";
import { assertAttributionTag } from "./source-tag";
import { assertValidAmount } from "./amount";
import { InvalidAddressError } from "../errors";

/** Paramètres de clôture d'un compte custodial par AccountDelete. */
export interface AccountDeleteParams {
  /** Compte à supprimer (sa seed signe la tx côté serveur). */
  readonly account: string;
  /** Compte qui reçoit le solde restant. */
  readonly destination: string;
  /** Coût spécial en drops XRP (au moins l'owner reserve, 0,2 XRP). */
  readonly feeDrops: string;
  /** SourceTag Tide, pour l'attribution de la clôture. */
  readonly sourceTag: number;
}

/**
 * Construit un `AccountDelete` taggé. Le coût spécial suit l'owner reserve
 * (0,2 XRP depuis l'amendement de décembre 2024 — vérifié sur la doc XRPL le
 * 27/08/2026) ; le solde restant part à la destination.
 */
export function buildAccountDelete(params: AccountDeleteParams): AccountDelete {
  assertValidAddress(params.account, "account");
  assertValidAddress(params.destination, "destination");
  if (params.account === params.destination) {
    throw new InvalidAddressError("account et destination doivent être différents");
  }
  assertValidAmount(params.feeDrops, "feeDrops");
  assertAttributionTag(params.sourceTag);
  return {
    TransactionType: "AccountDelete",
    Account: params.account,
    Destination: params.destination,
    Fee: params.feeDrops,
    SourceTag: params.sourceTag,
  };
}
