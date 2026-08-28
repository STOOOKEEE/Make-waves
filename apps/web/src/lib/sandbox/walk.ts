/* ===== Bac à sable — mouvement de prix =====
 *
 * Le tutoriel doit pouvoir montrer un stop touché ou une liquidation **en trente
 * secondes**. Attendre que BTC bouge de 5 % en direct ne marcherait pas. On
 * anime donc le prix par une marche aléatoire ancrée sur le dernier prix réel,
 * ré-ancrée à chaque rafraîchissement du carnet.
 *
 * Le générateur est **seedé** : même graine, même série. Les tests sont donc
 * déterministes, et un scénario pédagogique (« regarde une position à 20x se
 * faire liquider ») est reproductible à la démo.
 *
 * Précédent maison : `composables/useMarket.ts` faisait déjà exactement ça.
 */

/** PRNG minimal et déterministe (mulberry32). Pas de dépendance. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WalkOptions {
  /** Volatilité par pas, en fraction du prix (0.0015 = 0,15 %). */
  readonly volatility?: number;
  /** Dérive imposée par pas — sert aux scénarios scriptés (liquidation). */
  readonly drift?: number;
}

/**
 * Prix suivant. Le résultat reste strictement positif : un prix nul ou négatif
 * ferait exploser les divisions du moteur.
 */
export function nextPrice(price: number, rand: () => number, options: WalkOptions = {}): number {
  const volatility = options.volatility ?? 0.0015;
  const drift = options.drift ?? 0;
  const shock = (rand() - 0.5) * 2 * volatility;
  const next = price * (1 + shock + drift);
  return next > 0 ? next : price;
}

/** Série de `count` prix successifs — utilisée par le bouton « accélérer ». */
export function walkSeries(
  price: number,
  count: number,
  rand: () => number,
  options: WalkOptions = {},
): number[] {
  const out: number[] = [];
  let current = price;
  for (let i = 0; i < count; i += 1) {
    current = nextPrice(current, rand, options);
    out.push(current);
  }
  return out;
}
