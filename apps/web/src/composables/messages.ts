import { TideApiError } from "@tide/client";

/** Message d'erreur exploitable pour l'UI (erreur API typée ou réseau). */
export function errorMessage(error: unknown): string {
  return error instanceof TideApiError ? error.message : "Erreur réseau";
}
