import { TideApiError } from "@tide/client";
import { locale, type Locale } from "../i18n/locale";

const NETWORK_ERROR: Record<Locale, string> = {
  en: "Network error",
  fr: "Erreur réseau",
};

/** Message d'erreur exploitable pour l'UI (erreur API typée ou réseau). */
export function errorMessage(error: unknown): string {
  // Vitest/Vite peuvent charger deux instances du package workspace : le
  // contrôle structurel conserve alors le vrai message API même si
  // `instanceof` (et parfois le realm de `Error`) traverse cette frontière.
  if (error instanceof TideApiError) return error.message;
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (record["name"] === "TideApiError" && typeof record["message"] === "string") {
      return record["message"];
    }
  }
  return NETWORK_ERROR[locale.value];
}
