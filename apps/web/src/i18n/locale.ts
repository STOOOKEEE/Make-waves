import { ref, readonly } from "vue";

/** Langues supportées par le front (vitrine bilingue). */
export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

const STORAGE_KEY = "tide.locale";
const DEFAULT_LOCALE: Locale = "en";

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

/**
 * Langue initiale : choix mémorisé > langue du navigateur > défaut (EN).
 * Le défaut EN est volontaire (vitrine hackathon internationale).
 */
function detectInitial(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) {
    return stored;
  }
  const nav = window.navigator.language.slice(0, 2).toLowerCase();
  return isLocale(nav) ? nav : DEFAULT_LOCALE;
}

const current = ref<Locale>(detectInitial());

function syncDocumentLang(value: Locale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = value;
  }
}
syncDocumentLang(current.value);

/** Langue courante (réactive, lecture seule — passer par `setLocale` pour muter). */
export const locale = readonly(current);

/** Change la langue, la persiste et met à jour `<html lang>`. */
export function setLocale(value: Locale): void {
  current.value = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, value);
  }
  syncDocumentLang(value);
}
