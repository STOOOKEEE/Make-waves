// Catalogue des badges de trading Tide. Statique (constantes), pas une table
// de config : le set est fixe et versionné avec le code. Chaque badge a un
// `taxon` XLS-20 stable (regroupe les NFT d'un même type).

export const BADGE_CODES = {
  FIRST_TRADE: "first_trade",
  TEN_TRADES: "ten_trades",
  FIRST_COMPETITION: "first_competition",
} as const;

export type BadgeCode = (typeof BADGE_CODES)[keyof typeof BADGE_CODES];

export interface BadgeDef {
  readonly code: BadgeCode;
  readonly title: string;
  readonly description: string;
  /** Chemin relatif de l'image (résolu en URL absolue dans les métadonnées). */
  readonly imageUrl: string;
  /** `NFTokenTaxon` stable du badge. */
  readonly taxon: number;
}

export const BADGE_CATALOG: readonly BadgeDef[] = [
  {
    code: BADGE_CODES.FIRST_TRADE,
    title: "First Trade",
    description: "Place your first order on Tide.",
    imageUrl: "/badges/first_trade.svg",
    taxon: 1,
  },
  {
    code: BADGE_CODES.TEN_TRADES,
    title: "Ten Trades",
    description: "Place ten orders on Tide.",
    imageUrl: "/badges/ten_trades.svg",
    taxon: 2,
  },
  {
    code: BADGE_CODES.FIRST_COMPETITION,
    title: "First Competition",
    description: "Join your first Tide competition.",
    imageUrl: "/badges/first_competition.svg",
    taxon: 3,
  },
];

/** Retourne la définition d'un badge par son code, ou `undefined`. */
export function badgeByCode(code: string): BadgeDef | undefined {
  return BADGE_CATALOG.find((badge) => badge.code === code);
}
