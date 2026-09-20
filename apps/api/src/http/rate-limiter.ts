/**
 * Limiteur de débit à fenêtre fixe, en mémoire (F7). Chaque clé (typiquement une
 * IP) a un compteur qui se réinitialise à chaque fenêtre. `hit` renvoie `false`
 * quand la clé dépasse `max` dans la fenêtre courante.
 *
 * Choisi plutôt que `@fastify/rate-limit` : ce dernier exige `await register`
 * AVANT l'enregistrement des routes, incompatible avec un `buildServer`
 * synchrone (le rendre async casserait toute la suite de tests). Fenêtre fixe =
 * suffisant pour borner l'abus à l'échelle du hackathon (un conteneur).
 * ponytail : pas d'éviction des clés expirées (mémoire bornée par le nombre d'IP
 * distinctes/fenêtre) — ajouter un prune si le nombre d'IP explose.
 */
export interface RateLimiter {
  /** Enregistre un appel pour `key` ; `true` si sous la limite, `false` sinon. */
  hit(key: string): boolean;
}

export function createRateLimiter(
  max: number,
  windowMs: number,
  now: () => number = () => Date.now(),
): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    hit(key: string): boolean {
      const t = now();
      const bucket = buckets.get(key);
      if (bucket === undefined || t >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: t + windowMs });
        return true;
      }
      if (bucket.count >= max) {
        return false;
      }
      bucket.count += 1;
      return true;
    },
  };
}
