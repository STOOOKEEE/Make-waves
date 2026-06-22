import type { SignerListSet } from "xrpl";
import { assertValidAddress } from "./address";
import { InvalidSignerListError } from "../errors";
import { MAX_SIGNERS, MIN_SIGNERS } from "../constants";

const MIN_WEIGHT = 1;
const MAX_WEIGHT = 65535;

/** Un signataire de la multisig : son compte et son poids. */
export interface SignerEntryParams {
  readonly account: string;
  readonly weight: number;
}

/** Paramètres de configuration de la SignerList d'un compte (prize pool). */
export interface SignerListParams {
  /** Compte configuré (le prize pool multisig). */
  readonly account: string;
  /** Quorum : somme de poids minimale pour qu'une tx multisignée soit valide. */
  readonly quorum: number;
  /** Signataires (1 à 32), poids > 0, comptes distincts ≠ `account`. */
  readonly signers: readonly SignerEntryParams[];
}

/**
 * Construit la transaction `SignerListSet` qui transforme un compte en multisig
 * (le prize pool de Tide). Non signée — à soumettre par le compte lui-même.
 *
 * Valide strictement : quorum entier > 0, 1..32 signataires distincts, poids dans
 * [1, 65535], et **quorum atteignable** (Σ poids ≥ quorum) — sinon le compte
 * deviendrait incapable de signer quoi que ce soit (fonds bloqués).
 */
export function buildSignerListSet(params: SignerListParams): SignerListSet {
  const { account, quorum, signers } = params;
  assertValidAddress(account, "account");

  if (!Number.isInteger(quorum) || quorum <= 0) {
    throw new InvalidSignerListError(`quorum entier > 0 requis: ${String(quorum)}`);
  }
  if (signers.length < MIN_SIGNERS || signers.length > MAX_SIGNERS) {
    throw new InvalidSignerListError(
      `nombre de signataires hors [${String(MIN_SIGNERS)}, ${String(MAX_SIGNERS)}]: ${String(signers.length)}`,
    );
  }

  const seen = new Set<string>();
  let totalWeight = 0;
  const entries = signers.map((signer) => {
    assertValidAddress(signer.account, "signataire");
    if (signer.account === account) {
      throw new InvalidSignerListError(
        "un signataire ne peut pas être le compte multisig lui-même",
      );
    }
    if (seen.has(signer.account)) {
      throw new InvalidSignerListError(`signataire en double: ${signer.account}`);
    }
    seen.add(signer.account);
    if (
      !Number.isInteger(signer.weight) ||
      signer.weight < MIN_WEIGHT ||
      signer.weight > MAX_WEIGHT
    ) {
      throw new InvalidSignerListError(
        `poids hors [${String(MIN_WEIGHT)}, ${String(MAX_WEIGHT)}]: ${String(signer.weight)}`,
      );
    }
    totalWeight += signer.weight;
    return {
      SignerEntry: { Account: signer.account, SignerWeight: signer.weight },
    };
  });

  if (totalWeight < quorum) {
    throw new InvalidSignerListError(
      `quorum (${String(quorum)}) > somme des poids (${String(totalWeight)}) → inatteignable`,
    );
  }

  return {
    TransactionType: "SignerListSet",
    Account: account,
    SignerQuorum: quorum,
    SignerEntries: entries,
  };
}
