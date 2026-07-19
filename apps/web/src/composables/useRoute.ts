import { computed, onMounted, onUnmounted, readonly, ref } from "vue";

/** Chemins du site (landing + les écrans app). */
const PUBLIC_ROUTES = [
  "/landing",
  "/dashboard",
  "/portfolio",
  "/leaderboard",
  "/competitions",
  "/competition",
  "/arena",
  "/agent",
  "/learn",
] as const;

/** `/admin` n'existe que dans le serveur de développement local. */
export type RoutePath = (typeof PUBLIC_ROUTES)[number] | "/admin";
export const ROUTES: readonly RoutePath[] = import.meta.env.DEV
  ? [...PUBLIC_ROUTES, "/admin"]
  : PUBLIC_ROUTES;

// Tide est un terminal de trading : arriver sans hash ouvre directement
// l'interface bleue plutôt que la landing marketing.
const DEFAULT_ROUTE: RoutePath = "/dashboard";

export interface ParsedRoute {
  path: RoutePath;
  /** Segment d'identifiant pour /competition/:id et /learn/:slug. */
  id?: string;
}

function parseHash(hash: string): ParsedRoute {
  const raw = hash.replace(/^#/, "");
  if (!raw || raw === "/") {
    return { path: DEFAULT_ROUTE };
  }
  const [, first = "", second = ""] = raw.split("/");
  const candidate = `/${first}` as RoutePath;
  if (first === "competition") {
    return { path: "/competition", id: second || undefined };
  }
  if (first === "learn") {
    return { path: "/learn", id: second || undefined };
  }
  if ((ROUTES as readonly string[]).includes(candidate)) {
    return { path: candidate };
  }
  return { path: DEFAULT_ROUTE };
}

/**
 * Routeur minimal basé sur `location.hash` — pas de dépendance externe.
 * Expose la route courante (réactive) et une fonction de navigation.
 */
export function useRoute() {
  const route = ref<ParsedRoute>(
    typeof window === "undefined"
      ? { path: DEFAULT_ROUTE }
      : parseHash(window.location.hash),
  );

  function sync(): void {
    route.value = parseHash(window.location.hash);
  }

  function navigate(path: string): void {
    const next = path.startsWith("/") ? path : `/${path}`;
    if (window.location.hash === `#${next}`) {
      return;
    }
    window.location.hash = next;
    window.scrollTo({ top: 0 });
  }

  onMounted(() => window.addEventListener("hashchange", sync));
  onUnmounted(() => window.removeEventListener("hashchange", sync));

  return {
    route: readonly(route),
    current: computed(() => route.value.path),
    competitionId: computed(() => route.value.id),
    /** Segment d'identifiant générique (/learn/:slug, etc.). */
    routeId: computed(() => route.value.id),
    navigate,
  };
}
