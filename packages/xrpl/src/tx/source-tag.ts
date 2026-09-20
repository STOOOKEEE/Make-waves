import { MAX_SOURCE_TAG } from "../constants";
import { InvalidSourceTagError } from "../errors";

/**
 * Valide un SourceTag : entier non signé sur 32 bits (0..2^32-1). C'est ce
 * champ qui attribue volume et comptes actifs à Tide pour le hackathon ; un
 * tag hors plage serait silencieusement tronqué ou rejeté par le réseau.
 */
export function assertValidSourceTag(tag: number): void {
  if (!Number.isInteger(tag) || tag < 0 || tag > MAX_SOURCE_TAG) {
    throw new InvalidSourceTagError(`SourceTag invalide: ${String(tag)}`);
  }
}

/**
 * Variante applicative pour les tx de Tide : un SourceTag valide ET non nul.
 * Un tag à 0 = aucune attribution pour le hackathon (équivaut à pas de tag), ce
 * qui est un bug fonctionnel grave ici. À utiliser dans tous les builders.
 */
export function assertAttributionTag(tag: number): void {
  assertValidSourceTag(tag);
  if (tag === 0) {
    throw new InvalidSourceTagError(
      "SourceTag 0 = attribution hackathon perdue (utiliser le tag réservé)",
    );
  }
}
