import { computed, type ComputedRef } from "vue";
import { locale, type Locale } from "./locale";

/** Dictionnaire plat clé → texte pour une langue. */
export type Dict = Record<string, string>;
/** Messages d'un composant : une entrée par langue supportée. */
export type Messages = Record<Locale, Dict>;

export interface I18nApi {
  /** Traduit `key` dans la langue courante, avec interpolation `{var}` optionnelle. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: typeof locale;
  /** Locale BCP-47 pour `Intl.*` (ex. "fr-FR" / "en-US"). */
  intlLocale: ComputedRef<string>;
}

const INTL_TAGS: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
};

/**
 * i18n maison léger (pas de dépendance) : messages co-localisés par composant.
 * Repli sur l'anglais puis sur la clé brute si une traduction manque.
 */
export function useI18n(messages: Messages): I18nApi {
  function t(key: string, vars?: Record<string, string | number>): string {
    let value = messages[locale.value][key] ?? messages.en[key] ?? key;
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
      }
    }
    return value;
  }

  return {
    t,
    locale,
    intlLocale: computed(() => INTL_TAGS[locale.value]),
  };
}
