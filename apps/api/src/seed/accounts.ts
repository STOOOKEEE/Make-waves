import type { PaperService } from "../services/paper-service";
import type { AccountStore } from "../store/account-store";

const REFERENCE = "RLUSD";

/**
 * Compte de démo : un achat à un prix d'entrée volontairement SOUS le marché
 * courant → une fois valorisé au prix réel du feed, l'équité (et donc le
 * rendement) varie d'un trader à l'autre. Ce sont de vraies données dans le
 * système (vrais comptes, équité calculée au prix courant), juste préchargées
 * pour que le classement soit peuplé dès le premier lancement.
 */
interface DemoTrade {
  readonly userId: string;
  readonly symbol: string;
  readonly spend: number;
  readonly entryPrice: number;
}

const DEMO_TRADES: readonly DemoTrade[] = [
  { userId: "quant_viper", symbol: "XRP", spend: 6000, entryPrice: 0.4 },
  { userId: "degen_maxi", symbol: "SOL", spend: 5000, entryPrice: 40 },
  { userId: "satoshi_heir", symbol: "BTC", spend: 7000, entryPrice: 42000 },
  { userId: "liquid_zen", symbol: "ETH", spend: 5000, entryPrice: 1100 },
  { userId: "night_fader", symbol: "LINK", spend: 4000, entryPrice: 5 },
  { userId: "apex_owl", symbol: "DOGE", spend: 3000, entryPrice: 0.05 },
];

/** Précharge les comptes de démo manquants (idempotent : ignore les existants). */
export function seedDemoAccounts(paper: PaperService, store: AccountStore): void {
  for (const trade of DEMO_TRADES) {
    if (store.has(trade.userId)) {
      continue;
    }
    paper.openAccount(trade.userId);
    paper.placeOrder(trade.userId, {
      pair: { base: trade.symbol, quote: REFERENCE },
      side: "buy",
      amount: trade.spend / trade.entryPrice,
      price: trade.entryPrice,
    });
  }
}
