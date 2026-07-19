/**
 * Chargement optionnel de Plausible. Toute la configuration est publique :
 * aucun token ni identifiant utilisateur Tide ne doit être envoyé au tracker.
 */
const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
const scriptUrl = import.meta.env.VITE_PLAUSIBLE_SCRIPT_URL?.trim();
const endpoint = import.meta.env.VITE_PLAUSIBLE_ENDPOINT?.trim();
const SCRIPT_ID = "tide-plausible";

type PlausibleOptions = {
  readonly props?: Record<string, string | number | boolean>;
  readonly callback?: () => void;
};

type PlausibleTracker = {
  (eventName: string, options?: PlausibleOptions): void;
  init?: (options: {
    readonly endpoint?: string;
    readonly hashBasedRouting: boolean;
    readonly outboundLinks: boolean;
    readonly fileDownloads: boolean;
  }) => void;
};

declare global {
  interface Window {
    plausible?: PlausibleTracker;
  }
}

function isSafeAnalyticsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Ajoute le tracker à <head> uniquement dans un build configuré pour la prod.
 * Le routeur Tide utilise des hashes (#/dashboard), donc l'option dédiée est
 * indispensable pour obtenir une page par vue dans le dashboard Plausible.
 */
export function startPlausible(): boolean {
  if (
    import.meta.env.DEV ||
    domain === undefined ||
    domain === "" ||
    scriptUrl === undefined ||
    !isSafeAnalyticsUrl(scriptUrl) ||
    document.getElementById(SCRIPT_ID) !== null
  ) {
    return false;
  }

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.defer = true;
  script.dataset.domain = domain;
  script.src = scriptUrl;
  script.addEventListener("load", () => {
    window.plausible?.init?.({
      ...(endpoint !== undefined && endpoint !== "" && isSafeAnalyticsUrl(endpoint)
        ? { endpoint }
        : {}),
      hashBasedRouting: true,
      outboundLinks: true,
      fileDownloads: true,
    });
  }, { once: true });
  document.head.append(script);
  return true;
}

/** Pour les futurs objectifs produit, sans données personnelles ni wallet. */
export function trackPlausibleEvent(
  eventName: string,
  props?: Record<string, string | number | boolean>,
): void {
  window.plausible?.(eventName, props === undefined ? undefined : { props });
}
