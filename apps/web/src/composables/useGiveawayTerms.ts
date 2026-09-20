import { computed, ref, type ComputedRef, type Ref } from "vue";
import { TERMS_VERSION } from "../data/giveaway-terms";

/*
 * Acceptation du règlement de la tombola.
 *
 * ⚠️ Portée réelle : cette acceptation vit dans le localStorage du visiteur.
 * Elle empêche de participer sans avoir coché la case, ce qui est déjà l'essentiel
 * côté produit, mais elle ne PROUVE rien a posteriori : un navigateur vidé
 * l'efface, et rien n'est horodaté côté serveur. L'enregistrement serveur
 * (adresse + version + horodatage, écrit en même temps que l'entrée) fait partie
 * de la spec backend, cf.
 * docs/superpowers/specs/2026-09-09-giveaway-entries-design.md.
 */

const STORAGE_KEY = "tide.giveawayTermsAccepted";

function load(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // localStorage indisponible (navigation privée) : l'acceptation reste
    // valable en mémoire pour la session en cours.
    return "";
  }
}

// État partagé au niveau module : la case cochée dans une section de la page
// débloque les boutons de toutes les autres.
const acceptedVersion = ref(load());

export interface GiveawayTermsApi {
  /** Version du règlement en vigueur. */
  readonly version: string;
  /** La version EN VIGUEUR a-t-elle été acceptée ? */
  readonly accepted: ComputedRef<boolean>;
  /** Version effectivement acceptée, vide si aucune. */
  readonly acceptedVersion: Ref<string>;
  setAccepted(value: boolean): void;
}

export function useGiveawayTerms(): GiveawayTermsApi {
  // Comparaison à la version courante, pas simple booléen : réviser le
  // règlement doit redemander l'accord, sinon on opposerait à quelqu'un un
  // texte qu'il n'a jamais lu.
  const accepted = computed(() => acceptedVersion.value === TERMS_VERSION);

  function setAccepted(value: boolean): void {
    acceptedVersion.value = value ? TERMS_VERSION : "";
    try {
      if (value) localStorage.setItem(STORAGE_KEY, TERMS_VERSION);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Indisponible : l'état reste valable en mémoire.
    }
  }

  return { version: TERMS_VERSION, accepted, acceptedVersion, setAccepted };
}
