import { PAPER_STARTING_EQUITY } from "../constants";
import { pnl } from "../paper/equity";
import { equityWithPositions } from "../position/equity";
import { rankByEquity } from "../competition/ranking";
import type { PriceMap } from "../paper/types";
import type { AccountSnapshot, LeaderboardEntry } from "./types";

/**
 * Construit le classement à partir des portefeuilles paper et d'une carte de
 * prix : valorise chaque compte (equity), classe (réutilise `rankByEquity`,
 * donc déterministe et avec gestion des ex-aequo), puis ajoute le PnL.
 *
 * Pur. Lève (via `equity`) si une devise détenue n'a pas de prix valide :
 * on ne classe jamais sur une valorisation incomplète.
 *
 * `startingEquity` est le capital de départ **commun** à tous (défaut : constante
 * MVP). Limite assumée : le classement se fait à l'equity absolue (« à la
 * richesse »), pas au PnL relatif, et le PnL serait faux si des comptes
 * partaient de capitaux différents. Quand des départs hétérogènes arriveront,
 * porter le capital de départ dans `AccountSnapshot`.
 */
export function buildLeaderboard(
  accounts: readonly AccountSnapshot[],
  prices: PriceMap,
  quote: string,
  startingEquity: number = PAPER_STARTING_EQUITY,
): LeaderboardEntry[] {
  const participants = accounts.map((account) => ({
    userId: account.userId,
    equity: equityWithPositions(account.balances, account.positions ?? [], prices, quote),
  }));

  return rankByEquity(participants).map((ranked) => ({
    userId: ranked.userId,
    equity: ranked.equity,
    pnl: pnl(ranked.equity, startingEquity),
    rank: ranked.rank,
  }));
}
