/**
 * Chargement optionnel de Plausible. Toute la configuration est publique :
 * aucun token ni identifiant utilisateur Tide ne doit être envoyé au tracker.
 */
const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
// URL publique fournie par le compte Plausible TideTrade. Elle peut être
// remplacée par une instance CE/proxy via l'environnement de build.
const DEFAULT_SCRIPT_URL = "https://plausible.io/js/pa-X7OX-EF-u2mc1ml-3SlB6.js";
const scriptUrl = import.meta.env.VITE_PLAUSIBLE_SCRIPT_URL?.trim() || DEFAULT_SCRIPT_URL;
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
    readonly formSubmissions: boolean;
  }) => void;
  q?: unknown[];
  o?: unknown;
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
    !isSafeAnalyticsUrl(scriptUrl) ||
    document.getElementById(SCRIPT_ID) !== null
  ) {
    return false;
  }

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.defer = true;
  if (domain !== undefined && domain !== "") script.dataset.domain = domain;
  script.src = scriptUrl;
  // Même file d'attente que le snippet officiel. L'initialisation précède le
  // chargement async du script, afin que Plausible connaisse les routes hash
  // et les mesures optionnelles dès le premier pageview.
  const tracker = window.plausible ?? Object.assign(
    ((eventName: string, options?: PlausibleOptions) => {
      tracker.q = tracker.q ?? [];
      tracker.q.push([eventName, options]);
    }) as PlausibleTracker,
    {
      init(options: PlausibleTracker["init"] extends (options: infer T) => void ? T : never) {
        tracker.o = options;
      },
    },
  );
  window.plausible = tracker;
  tracker.init?.({
    ...(endpoint !== undefined && endpoint !== "" && isSafeAnalyticsUrl(endpoint)
      ? { endpoint }
      : {}),
    hashBasedRouting: true,
    outboundLinks: true,
    fileDownloads: true,
    formSubmissions: true,
  });
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
