import { computed, onMounted, onUnmounted, readonly, ref } from "vue";

/** Chemins du site (landing + les écrans app). */
export const ROUTES = [
  "/",
  "/dashboard",
  "/portfolio",
  "/leaderboard",
  "/competitions",
  "/competition",
  "/arena",
  "/agent",
] as const;
export type RoutePath = (typeof ROUTES)[number];

const DEFAULT_ROUTE: RoutePath = "/";

export interface ParsedRoute {
  path: RoutePath;
  /** Segment d'identifiant pour /competition/:id. */
  id?: string;
}

function parseHash(hash: string): ParsedRoute {
  const raw = hash.replace(/^#/, "") || "/";
  const [, first = "", second = ""] = raw.split("/");
  const candidate = `/${first}` as RoutePath;
  if (first === "competition") {
    return { path: "/competition", id: second || undefined };
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
    navigate,
  };
}
