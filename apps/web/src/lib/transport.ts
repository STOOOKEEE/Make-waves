import type { ApiRequest, ApiResponse, ApiTransport } from "@tide/client";

/** Sous-ensemble de `fetch` dont on a besoin (injectable pour les tests). */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ status: number; json: () => Promise<unknown> }>;

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

/**
 * Transport HTTP réel pour `@tide/client` : sérialise le corps en JSON et appelle
 * l'API. `fetchLike` est injectable → testable sans réseau.
 */
export function createFetchTransport(
  baseUrl: string,
  fetchLike: FetchLike = defaultFetch,
): ApiTransport {
  return async (request: ApiRequest): Promise<ApiResponse> => {
    const hasBody = request.body !== undefined;
    // On ne pose `content-type: application/json` QUE s'il y a un corps : sinon
    // Fastify tente de parser un body JSON vide (POST sans body /sign/connect,
    // /competitions/:id/close) et renvoie une erreur.
    const response = await fetchLike(baseUrl + request.path, {
      method: request.method,
      headers: hasBody ? { "content-type": "application/json" } : {},
      ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
}
