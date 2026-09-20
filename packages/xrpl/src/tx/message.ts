import { deriveAddress, verify } from "ripple-keypairs";

/** Adresse classique (r...) dérivée d'une clé publique XRPL (hex). */
export function addressFromPublicKey(publicKey: string): string {
  return deriveAddress(publicKey);
}

/**
 * Vérifie qu'une signature provient bien de `publicKey` pour le message texte
 * donné. Le message est encodé en hex (UTF-8) avant vérification — même forme
 * que ce que signe le wallet. Frontière de confiance : toute entrée malformée
 * (signature non-hex, clé invalide) renvoie `false`, jamais une exception.
 */
export function verifyMessageSignature(
  message: string,
  signature: string,
  publicKey: string,
): boolean {
  const messageHex = Buffer.from(message, "utf8").toString("hex").toUpperCase();
  try {
    return verify(messageHex, signature, publicKey);
  } catch {
    // Signature/clé mal formée = preuve invalide → on rejette (pas de crash).
    return false;
  }
}
