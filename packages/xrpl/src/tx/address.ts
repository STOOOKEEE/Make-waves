import { isValidClassicAddress } from "xrpl";
import { InvalidAddressError } from "../errors";

/**
 * Valide une adresse XRPL classique (r...). Lève `InvalidAddressError` sinon.
 * `label` identifie le champ pour un message d'erreur exploitable.
 */
export function assertValidAddress(address: string, label: string): void {
  if (!isValidClassicAddress(address)) {
    throw new InvalidAddressError(`Adresse ${label} invalide: ${address}`);
  }
}
