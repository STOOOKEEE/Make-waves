import type { Amount, OfferCreate } from "xrpl";
import { assertValidAddress } from "./address";
import { assertAttributionTag } from "./source-tag";
import { amountsEqual, assertValidAmount } from "./amount";
import { InvalidAmountError } from "../errors";

/**
 * Paramètres d'un swap spot en mode Live. On nomme les montants `gives`/`wants`
 * pour éviter l'ambiguïté de TakerGets/TakerPays : le compte FOURNIT `gives`
 * (-> TakerGets) et REÇOIT `wants` (-> TakerPays).
 */
export interface LiveOfferParams {
  /** Compte qui trade (signera via Xaman). */
  readonly account: string;
  /** Montant fourni par le compte (TakerGets). */
  readonly gives: Amount;
  /** Montant reçu par le compte (TakerPays). */
  readonly wants: Amount;
  /** SourceTag du projet (attribution hackathon). */
  readonly sourceTag: number;
}

/**
 * Construit la transaction `OfferCreate` d'un swap Live sur le DEX natif :
 * non signée, à envoyer à Xaman. Porte le `SourceTag` pour que le volume soit
 * attribué à Tide. Valide adresse et SourceTag.
 */
export function buildLiveOffer(params: LiveOfferParams): OfferCreate {
  const { account, gives, wants, sourceTag } = params;

  assertValidAddress(account, "account");
  assertValidAmount(gives, "gives");
  assertValidAmount(wants, "wants");
  if (amountsEqual(gives, wants)) {
    throw new InvalidAmountError(
      "Offre triviale: gives et wants identiques (no-op / auto-cross)",
    );
  }
  assertAttributionTag(sourceTag);

  return {
    TransactionType: "OfferCreate",
    Account: account,
    TakerGets: gives,
    TakerPays: wants,
    SourceTag: sourceTag,
  };
}
