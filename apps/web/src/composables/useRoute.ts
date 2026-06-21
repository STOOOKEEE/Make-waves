import { onMounted, onUnmounted, readonly, ref } from "vue";

/** Chemins connus du site. `/` = landing, le reste = vues de l'app. */
export const ROUTES = ["/", "/terminal", "/leaderboard", "/competitions"] as const;
export type RoutePath = (typeof ROUTES)[number];

const DEFAULT_ROUTE: RoutePath = "/";

function parseHash(hash: string): RoutePath {
  const path = hash.replace(/^#/, "") || "/";
  return (ROUTES as readonly string[]).includes(path)
    ? (path as RoutePath)
    : DEFAULT_ROUTE;
}

/**
 * Routeur minimal basé sur `location.hash` — pas de dépendance externe.
 * Expose le chemin courant (réactif) et une fonction de navigation.
 */
export function useRoute() {
  const current = ref<RoutePath>(
    typeof window === "undefined" ? DEFAULT_ROUTE : parseHash(window.location.hash),
  );

  function sync(): void {
    current.value = parseHash(window.location.hash);
  }

  function navigate(path: RoutePath): void {
    if (window.location.hash === `#${path}`) {
      return;
    }
    window.location.hash = path;
    window.scrollTo({ top: 0 });
  }

  onMounted(() => window.addEventListener("hashchange", sync));
  onUnmounted(() => window.removeEventListener("hashchange", sync));

  return { current: readonly(current), navigate };
}
