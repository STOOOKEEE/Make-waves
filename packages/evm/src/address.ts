import { SettlementError } from "./errors";

/**
 * Validation d'adresse EVM pour la couche settlement pure. On veut échouer tôt
 * (au point de règlement, avant tout appel réseau) si le backend route une
 * instruction vers une adresse malformée. Volontairement **sans dépendance**
 * (pas de viem ici) : la couche pure reste testable sans lib chaîne ; l'adaptateur
 * concret re-valide/normalise via `getAddress` (checksum) de son côté.
 *
 * Contrôle syntaxique uniquement (`0x` + 40 hexa) — pas de vérif de checksum
 * EIP-55, qui appartient à l'adaptateur.
 */
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** Lève `SettlementError` si `value` n'est pas une adresse EVM syntaxiquement valide. */
export function assertEvmAddress(value: string): void {
  if (!EVM_ADDRESS.test(value)) {
    throw new SettlementError(`Adresse EVM invalide: ${value}`);
  }
}
