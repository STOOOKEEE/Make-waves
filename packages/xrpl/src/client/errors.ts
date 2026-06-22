/**
 * Erreurs de la couche réseau XRPL. On distingue l'échec de connexion (réseau /
 * websocket) de l'échec/incohérence d'une requête, pour que l'appelant réagisse
 * correctement (retenter la connexion vs traiter une donnée absente).
 */

/** Échec d'établissement ou de fermeture de la connexion au réseau XRPL. */
export class XrplConnectionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "XrplConnectionError";
  }
}

/** Réponse réseau absente, malformée ou incohérente avec ce qu'on attend. */
export class XrplRequestError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "XrplRequestError";
  }
}
