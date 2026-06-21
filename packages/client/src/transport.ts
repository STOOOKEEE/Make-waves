/** Requête API abstraite (découplée de la lib HTTP). */
export interface ApiRequest {
  readonly path: string;
  readonly method: "GET" | "POST";
  readonly body?: unknown;
}

/** Réponse API : code de statut + corps déjà parsé. */
export interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

/**
 * Transport injecté : exécute une requête et retourne la réponse. Le front
 * fournit une implémentation basée sur `fetch` ; les tests fournissent un
 * transport branché sur le vrai serveur (`inject`) ou un faux.
 */
export type ApiTransport = (request: ApiRequest) => Promise<ApiResponse>;
