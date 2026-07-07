import { TideApiError } from "@tide/client";
import { locale, type Locale } from "../i18n/locale";

const NETWORK_ERROR: Record<Locale, string> = {
  en: "Network error",
  fr: "Erreur réseau",
};

/** Message d'erreur exploitable pour l'UI (erreur API typée ou réseau). */
export function errorMessage(error: unknown): string {
  return error instanceof TideApiError
    ? error.message
    : NETWORK_ERROR[locale.value];
}
