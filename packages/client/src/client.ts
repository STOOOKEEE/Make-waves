import type {
  Balances,
  Competition,
  Fill,
  LeaderboardEntry,
  MarketOrderInput,
  Payout,
  PriceMap,
} from "@tide/core";
import type { ApiRequest, ApiTransport } from "./transport";
import { extractErrorMessage, TideApiError } from "./errors";

/** Résultat de clôture d'une compétition côté API. */
export interface CloseResult {
  readonly payouts: Payout[];
  readonly undistributed: number;
}

/**
 * Vue live d'une compétition (état dynamique exposé par l'API) : paramètres
 * économiques + participants réels, pot courant et clôture. Le front la fusionne
 * avec son catalogue de présentation par `id`.
 */
export interface CompetitionSummary {
  readonly id: string;
  readonly buyIn: number;
  readonly rakeRatio: number;
  readonly payoutWeights: readonly number[];
  readonly participants: number;
  readonly pot: number;
  readonly closed: boolean;
}

/** Ligne de portefeuille valorisée en devise de référence. */
export interface Holding {
  readonly currency: string;
  readonly amount: number;
  readonly value: number;
}

/** Portefeuille agrégé d'un compte : soldes valorisés, equity et PnL. */
export interface Portfolio {
  readonly balances: Balances;
  readonly holdings: Holding[];
  readonly equity: number;
  readonly pnl: number;
}

/**
 * Montant XRPL tel qu'il transite sur l'API : string de drops XRP, ou objet de
 * token émis. Type de CONTRAT HTTP (miroir du `Amount` d'xrpl.js) défini ici pour
 * que le client reste découplé de `@tide/xrpl` et de sa lib `ws` côté front.
 */
export type ApiAmount =
  | string
  | { readonly currency: string; readonly issuer: string; readonly value: string };

/** Requête de signature non-custodiale à présenter à l'utilisateur (Xaman). */
export interface SignRequest {
  readonly uuid: string;
  readonly signUrl: string;
  readonly qrPng: string;
}

/** État d'un payload Xaman (suivi de signature / connexion). */
export interface PayloadStatus {
  readonly resolved: boolean;
  readonly signed: boolean;
  readonly account: string | null;
  readonly txid: string | null;
}

/** Config publique pour la signature côté client (GemWallet). */
export interface PublicConfig {
  /** SourceTag d'attribution (entier public) ; null si Live non configuré. */
  readonly sourceTag: number | null;
  /** Symbole du token de cotation Live (ex. "RLUSD") ; null si Live non configuré. */
  readonly quoteSymbol: string | null;
}

/** Sens d'un swap côté base : acheter (payer en quote) ou vendre (recevoir en quote). */
export type ExecSide = "buy" | "sell";

/** `OfferCreate` taggé prêt à signer (miroir du type d'xrpl.js, découplé du bundle). */
export interface ApiOfferCreate {
  readonly TransactionType: "OfferCreate";
  readonly Account: string;
  readonly TakerGets: ApiAmount;
  readonly TakerPays: ApiAmount;
  readonly SourceTag: number;
}

/**
 * Plan d'exécution d'un swap Live calculé côté serveur : l'`OfferCreate` borné
 * (best execution + slippage, attribution incluse) plus les prix indicatifs. Le
 * client le signe via l'extension (GemWallet) ou le présente à Xaman.
 */
export interface ExecutionPlanDto {
  readonly offer: ApiOfferCreate;
  readonly referencePrice: number;
  readonly limitPrice: number;
  readonly venue: "amm" | "book";
}

/** Ligne de marché de la watchlist (top N coins : symbole, nom, prix, %24h). */
export interface MarketRow {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly price: number;
  readonly change24h: number;
}

/** Bougie historique pour le chart. */
export interface Candle {
  readonly t: number;
  readonly o: number;
  readonly h: number;
  readonly l: number;
  readonly c: number;
  /** Source de l'historique : vrai OHLC CEX ou série de prix reconstruite. */
  readonly source?: "Binance" | "Gate" | "CoinGecko" | "GeckoTerminal";
  /** Nature de la donnée : `ohlc` = vraies bougies, `price` = points de prix. */
  readonly mode?: "ohlc" | "price";
}

/** Niveau du carnet retourné par l'API : prix, taille et total cumulés. */
export interface BookLevel {
  readonly price: number;
  readonly size: number;
  readonly total: number;
}

/** Carnet d'ordres réel exposé au dashboard. */
export interface BookDepth {
  readonly symbol: string;
  readonly quoteSymbol: string;
  readonly source: string;
  readonly asks: readonly BookLevel[];
  readonly bids: readonly BookLevel[];
  readonly mid: number;
  readonly spread: number;
}

/** Métriques d'attribution du hackathon (miroir de `@tide/xrpl`). */
export interface AttributionMetrics {
  readonly totalVolume: number;
  readonly activeAccounts: number;
  readonly txCount: number;
}

function path(...segments: string[]): string {
  return "/" + segments.map((s) => encodeURIComponent(s)).join("/");
}

/**
 * Client typé de l'API Tide. Toute la communication passe par un `ApiTransport`
 * injecté → testable contre le vrai serveur (`inject`) sans réseau réel. Les
 * réponses (issues de notre propre API typée) sont castées vers le type attendu.
 */
export class TideClient {
  constructor(private readonly transport: ApiTransport) {}

  // --- Comptes ---

  async openAccount(userId: string): Promise<{ userId: string }> {
    return this.call(
      { path: "/accounts", method: "POST", body: { userId } },
      201,
    );
  }

  async ensureAccount(userId: string): Promise<{ userId: string; created: boolean }> {
    return this.call(
      { path: "/accounts/ensure", method: "POST", body: { userId } },
      200,
    );
  }

  async balances(userId: string): Promise<Balances> {
    return this.call({ path: path("accounts", userId, "balances"), method: "GET" }, 200);
  }

  async orders(userId: string): Promise<readonly Fill[]> {
    return this.call({ path: path("accounts", userId, "orders"), method: "GET" }, 200);
  }

  async placeOrder(userId: string, order: MarketOrderInput): Promise<Fill> {
    return this.call(
      { path: path("accounts", userId, "orders"), method: "POST", body: order },
      201,
    );
  }

  async leaderboard(): Promise<LeaderboardEntry[]> {
    return this.call({ path: "/leaderboard", method: "GET" }, 200);
  }

  /** Portefeuille agrégé d'un compte (soldes valorisés, equity, PnL). */
  async portfolio(userId: string): Promise<Portfolio> {
    return this.call({ path: path("accounts", userId, "portfolio"), method: "GET" }, 200);
  }

  // --- Prix ---

  /** Carte de prix courante du feed off-chain (devise → prix en référence). */
  async prices(): Promise<PriceMap> {
    return this.call({ path: "/prices", method: "GET" }, 200);
  }

  /** Liste des marchés (top N coins : symbole, nom, prix, %24h) pour la watchlist. */
  async markets(): Promise<MarketRow[]> {
    return this.call({ path: "/markets", method: "GET" }, 200);
  }

  /** Config publique (SourceTag) pour la signature côté client. */
  async config(): Promise<PublicConfig> {
    return this.call({ path: "/config", method: "GET" }, 200);
  }

  /** Historique OHLC réel d'un symbole (Binance), par intervalle de bougie. */
  async history(
    symbol: string,
    interval: string,
    limit = 120,
  ): Promise<Candle[]> {
    return this.call(
      {
        path:
          `${path("history", symbol)}` +
          `?interval=${encodeURIComponent(interval)}&limit=${String(limit)}`,
        method: "GET",
      },
      200,
    );
  }

  /** Profondeur réelle du carnet pour un symbole coté en USDT. */
  async bookDepth(symbol: string, limit = 8): Promise<BookDepth> {
    return this.call(
      {
        path: `${path("book", symbol)}?limit=${String(limit)}`,
        method: "GET",
      },
      200,
    );
  }

  // --- Compétitions ---

  /** Liste publique des compétitions avec leur état live. */
  async competitions(): Promise<CompetitionSummary[]> {
    return this.call({ path: "/competitions", method: "GET" }, 200);
  }

  /** État live d'une compétition. */
  async competition(competitionId: string): Promise<CompetitionSummary> {
    return this.call({ path: path("competitions", competitionId), method: "GET" }, 200);
  }

  async createCompetition(competition: Competition): Promise<{ id: string }> {
    return this.call(
      { path: "/competitions", method: "POST", body: competition },
      201,
    );
  }

  async joinCompetition(
    competitionId: string,
    userId: string,
  ): Promise<{ competitionId: string; userId: string }> {
    return this.call(
      {
        path: path("competitions", competitionId, "join"),
        method: "POST",
        body: { userId },
      },
      200,
    );
  }

  async participants(competitionId: string): Promise<string[]> {
    return this.call(
      { path: path("competitions", competitionId, "participants"), method: "GET" },
      200,
    );
  }

  async closeCompetition(competitionId: string): Promise<CloseResult> {
    return this.call(
      { path: path("competitions", competitionId, "close"), method: "POST" },
      200,
    );
  }

  // --- Métriques d'attribution (hackathon) ---

  async metrics(): Promise<AttributionMetrics> {
    return this.call({ path: "/metrics", method: "GET" }, 200);
  }

  // --- Signature non-custodiale (Xaman) ---
  // Le sourceTag (attribution) et la destination du prize pool sont ajoutés CÔTÉ
  // SERVEUR : le client ne les fournit jamais.

  /** Connexion de wallet : payload SignIn à présenter (QR/deeplink). */
  async connectWallet(): Promise<SignRequest> {
    return this.call({ path: "/sign/connect", method: "POST" }, 201);
  }

  /** État d'un payload Xaman (polling de signature/connexion). */
  async signStatus(uuid: string): Promise<PayloadStatus> {
    return this.call({ path: path("sign", "status", uuid), method: "GET" }, 200);
  }

  async signBuyIn(
    account: string,
    amount: ApiAmount,
    competitionId: string,
  ): Promise<SignRequest> {
    return this.call(
      {
        path: "/sign/buy-in",
        method: "POST",
        body: { account, amount, competitionId },
      },
      201,
    );
  }

  /**
   * Swap Live via Xaman : envoie l'INTENTION (base/side/quantité/slippage), le
   * serveur calcule l'`OfferCreate` borné et injecte l'attribution + l'issuer.
   */
  async signLiveOffer(
    account: string,
    base: string,
    side: ExecSide,
    amountBase: number,
    slippageTolerance: number,
  ): Promise<SignRequest> {
    return this.call(
      {
        path: "/sign/live-offer",
        method: "POST",
        body: { account, base, side, amountBase, slippageTolerance },
      },
      201,
    );
  }

  /**
   * Plan d'exécution d'un swap Live (best execution + slippage) calculé serveur,
   * pour signature côté extension (GemWallet). Même intention que `signLiveOffer`.
   */
  async planLiveOffer(
    account: string,
    base: string,
    side: ExecSide,
    amountBase: number,
    slippageTolerance: number,
  ): Promise<ExecutionPlanDto> {
    return this.call(
      {
        path: "/exec/plan",
        method: "POST",
        body: { account, base, side, amountBase, slippageTolerance },
      },
      201,
    );
  }

  private async call<T>(request: ApiRequest, okStatus: number): Promise<T> {
    const response = await this.transport(request);
    if (response.status !== okStatus) {
      throw new TideApiError(
        response.status,
        extractErrorMessage(response.body),
      );
    }
    // Réponse de notre propre API typée : cast vers le type attendu.
    return response.body as T;
  }
}
