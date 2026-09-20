/** Erreur retournée par l'API Tide (statut HTTP non attendu). */
export class TideApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "TideApiError";
  }
}

/** Extrait un message d'erreur du corps `{ error: string }` renvoyé par l'API. */
export function extractErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    const error = (body as Record<string, unknown>)["error"];
    if (typeof error === "string") {
      return error;
    }
  }
  return "Erreur API";
}
