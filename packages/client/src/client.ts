import type {
  Balances,
  Fill,
  LeaderboardEntry,
  MarketOrderInput,
  OpenPositionInput,
  Position,
  PriceMap,
} from "@tide/core";
import type { ApiRequest, ApiTransport } from "./transport";
import { extractErrorMessage, TideApiError } from "./errors";

export type CompetitionMode = "paper" | "live";
export type CompetitionStatus = "upcoming" | "live" | "ended";

/** Vue complète issue du backend persistant, sans catalogue mock côté front. */
export interface CompetitionSummary {
  readonly id: string;
  readonly nameEn: string;
  readonly nameFr: string;
  readonly descriptionEn: string;
  readonly descriptionFr: string;
  readonly mode: CompetitionMode;
  readonly buyIn: number;
  readonly rakeRatio: number;
  readonly payoutWeights: readonly number[];
  readonly startsAt: number;
  readonly endsAt: number;
  readonly participants: number;
  readonly pot: number;
  readonly closed: boolean;
  readonly status: CompetitionStatus;
  readonly winnerUserId: string | null;
  readonly entryPaymentEnabled: boolean;
}

export interface CompetitionLeaderboardEntry {
  readonly rank: number;
  readonly userId: string;
  readonly walletAddress: string;
  readonly equity: number;
  readonly entryEquity: number;
  readonly returnPct: number;
  readonly joinedAt: number;
}

/** Payment XRP construit côté serveur, prêt à signer via GemWallet. */
export interface CompetitionEntryPayment {
  readonly TransactionType: "Payment";
  readonly Account: string;
  readonly Destination: string;
  readonly Amount: string;
  readonly SourceTag: number;
  readonly Memos: readonly unknown[];
}

/** Ligne de portefeuille valorisée en devise de référence. */
export interface Holding {
  readonly currency: string;
  readonly amount: number;
  readonly value: number;
  readonly costBasis: number | null;
  readonly averagePrice: number | null;
  readonly unrealizedPnl: number | null;
}

/** Portefeuille agrégé d'un compte : soldes valorisés, equity et PnL. */
export interface Portfolio {
  readonly balances: Balances;
  readonly holdings: Holding[];
  readonly equity: number;
  readonly pnl: number;
}

/** Résultat de fermeture d'une position : la position fermée et le PnL réalisé. */
export interface ClosedPosition {
  readonly position: Position;
  readonly realizedPnl: number;
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

/** Challenge d'authentification GemWallet : nonce + message à signer. */
export interface AuthChallengeDto {
  readonly nonce: string;
  readonly message: string;
}

/** Preuve GemWallet d'un challenge (signature du message par la clé de l'adresse). */
export interface GemProof {
  readonly address: string;
  readonly nonce: string;
  readonly signature: string;
  readonly publicKey: string;
}

/** Token de session délivré après vérification d'une preuve. */
export interface AuthTokenDto {
  readonly token: string;
  readonly address: string;
}

/** Session anonyme dédiée au Paper trading, signée par l'API. */
export interface PaperSessionDto {
  readonly token: string;
  readonly userId: string;
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

// --- Agents / mandats / actions ---
// DTO miroirs des types domaine côté `apps/api`. On garde les unions
// littérales pour `type` / `status` agent (validation au bord côté serveur).

/** Agent LLM piloté sous mandat : identifiant, propriétaire, état. */
export interface AgentDto {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly type: "external" | "integrated";
  readonly status: "active" | "paused" | "stopped";
  readonly hasLiveAccount: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Mandat signé (ou en attente) d'un agent : bornes de risque + statut. */
export interface MandateDto {
  readonly id: string;
  readonly agentId: string;
  readonly userId: string;
  readonly capitalMax: number;
  readonly perteMaxJour: number;
  readonly maxTradesPerDay: number;
  readonly maxLeverage: number;
  readonly pairesAutorisees: readonly string[];
  readonly style: string | null;
  readonly validUntil: number;
  readonly signedAt: number | null;
  readonly signature: string | null;
  readonly status: string;
}

/** Action exécutée par un agent (tool MCP, résultat, éventuelle erreur). */
export interface AgentActionDto {
  readonly id: string;
  readonly agentId: string;
  readonly userId: string;
  readonly toolName: string;
  readonly toolParams: string;
  readonly result: string | null;
  readonly error: string | null;
  readonly idempotencyKey: string | null;
  readonly executedAt: number;
}

export type BadgeClaimStatus = "unclaimed" | "offer_pending" | "claimed";

export interface BadgeDto {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly earned: boolean;
  readonly status: BadgeClaimStatus;
  readonly nftTokenId: string | null;
}

/** Transaction `NFTokenAcceptOffer` taggée, prête à signer côté user. */
export interface BadgeAcceptTx {
  readonly TransactionType: "NFTokenAcceptOffer";
  readonly Account: string;
  readonly NFTokenSellOffer: string;
  readonly SourceTag: number;
}

export interface ClaimBadgeResult {
  readonly sellOfferId: string;
  readonly nftTokenId: string;
  readonly acceptTx: BadgeAcceptTx;
}

/** Récompense NFT gagnée après au moins un trade Paper dans la semaine UTC. */
export interface WeeklyRewardDto {
  readonly week: string;
  readonly qualifiedAt: number;
  readonly status: "eligible" | "minting" | "offer_pending" | "claimed";
  readonly nftTokenId: string | null;
  readonly claimedAt: number | null;
}

export interface PaperWalletRewardDto {
  readonly network: "mainnet" | null;
  readonly walletAddress: string | null;
  readonly walletStatus:
    | "not_created"
    | "pending_funding"
    | "funding_in_progress"
    | "funded"
    | "funding_failed"
    | "reclaimed";
  readonly fundingTxHash: string | null;
  readonly rewardStatus: "not_earned" | "eligible" | "minting" | "offer_pending" | "claimed";
  readonly nftTokenId: string | null;
  readonly claimTxHash: string | null;
}

// --- Admin (console opérateur) ---

export type AccountSegment = "operator" | "agent" | "frontend";

export interface AdminUserDto {
  readonly userId: string;
  readonly segment: AccountSegment;
  readonly equity: number;
  readonly pnl: number;
  readonly orders: number;
  readonly positions: number;
  readonly rank: number;
}

export interface AdminAgentDto {
  readonly id: string;
  readonly name: string;
  readonly type: "external" | "integrated";
  readonly status: "active" | "paused" | "stopped";
  readonly ownerUserId: string;
  readonly hasLiveAccount: boolean;
  readonly mandate: {
    readonly capitalMax: number;
    readonly maxLeverage: number;
    readonly validUntil: number;
  } | null;
  readonly lastAction: {
    readonly toolName: string;
    readonly executedAt: number;
  } | null;
  readonly createdAt: number;
}

export interface AdminWalletDto {
  readonly address: string | null;
  readonly kind: "agent" | "paper" | "prize_pool";
  readonly agentId: string | null;
  readonly userId: string | null;
  readonly live: boolean;
  readonly status:
    | "not_created"
    | "pending_funding"
    | "funding_in_progress"
    | "funded"
    | "funding_failed"
    | "reclaimed"
    | null;
  readonly network: "mainnet" | null;
  readonly fundingTxHash: string | null;
  readonly fundedAt: number | null;
  readonly createdAt: number | null;
}

export interface AdminReclaimResultDto {
  readonly userId: string;
  readonly address: string;
  readonly state: "queued" | "burning" | "waiting" | "deleting" | "succeeded" | "failed";
  readonly burnedNfts: number;
  readonly deleteTxHash: string | null;
  readonly recoveredXrpEstimate: number;
  readonly error: string | null;
}

export interface AdminReclaimJobDto {
  readonly enabled: boolean;
  readonly network: "mainnet";
  readonly id: string | null;
  readonly state: "idle" | "running" | "succeeded" | "failed";
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
  readonly destination: string | null;
  readonly startedAt: number | null;
  readonly finishedAt: number | null;
  readonly results: readonly AdminReclaimResultDto[];
}

export interface AdminNftGrantDto {
  readonly userId: string;
  readonly walletAddress: string;
  readonly badgeCode: string;
  readonly nftTokenId: string;
  readonly sellOfferId: string;
  readonly mintHash: string;
  readonly offerHash: string;
  readonly claimHash: string;
}

export interface AdminBatchNftGrantDto {
  readonly badgeCode: string;
  readonly requested: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly (
    | { readonly userId: string; readonly status: "succeeded"; readonly grant: AdminNftGrantDto }
    | { readonly userId: string; readonly status: "failed"; readonly error: string }
  )[];
}

export interface AdminWalletProvisionDto {
  readonly network: "mainnet";
  readonly requested: number;
  readonly funded: number;
  readonly wallets: readonly {
    readonly userId: string;
    readonly address: string;
    readonly status: Exclude<AdminWalletDto["status"], null>;
    readonly fundingTxHash: string | null;
  }[];
}

export interface AdminInactiveUserDeleteDto {
  readonly requested: number;
  readonly deleted: number;
  readonly walletRowsDeleted: number;
  readonly userIds: readonly string[];
}

export interface AdminCompetitionInput {
  readonly id: string;
  readonly nameEn: string;
  readonly nameFr: string;
  readonly descriptionEn: string;
  readonly descriptionFr: string;
  readonly mode: CompetitionMode;
  readonly buyIn: number;
  readonly startsAt: number;
  readonly endsAt: number;
}

export interface AdminCompetitionWinnerDto {
  readonly userId: string;
  readonly walletAddress: string;
}

export interface AdminCompetitionCloseDto {
  readonly winner: AdminCompetitionWinnerDto | null;
  readonly pot: number;
  /** Payment multisig exact à faire signer par le quorum opérateur. */
  readonly payoutTx: CompetitionEntryPayment | null;
}

export interface AdminPortfolioManagerTradeDto {
  readonly userId: string;
  readonly symbol: string;
  readonly side: "long" | "short";
  readonly leverage: number;
  readonly notionalUsd: number;
  readonly quantity: number;
  readonly entryPrice: number;
  readonly marginUsd: number;
}

export interface AdminPortfolioManagerPlanDto {
  readonly id: string;
  readonly managerAgentId: string;
  readonly createdAt: number;
  readonly status: "prepared" | "executed";
  readonly llmCalls: 0;
  readonly profile: "standard" | "high_risk" | "sized";
  readonly confirmation: string;
  readonly trades: readonly AdminPortfolioManagerTradeDto[];
}

export interface AdminPortfolioManagerStatusDto {
  readonly enabled: boolean;
  readonly managerAgentId: string | null;
  readonly managerName: string | null;
  readonly mode: "deterministic_batch" | null;
  readonly llmCallsPerCycle: 0 | null;
  readonly maxAccountsPerCycle: number | null;
  readonly preparedPlan: AdminPortfolioManagerPlanDto | null;
}

export interface AdminPortfolioManagerExecutionDto {
  readonly planId: string;
  readonly requested: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly (
    | { readonly userId: string; readonly status: "succeeded"; readonly positionId: string }
    | { readonly userId: string; readonly status: "failed"; readonly error: string }
  )[];
}

export interface AdminOverviewDto {
  readonly totals: {
    readonly users: number;
    readonly bySegment: { readonly operator: number; readonly frontend: number; readonly agent: number };
    readonly agents: { readonly total: number; readonly active: number; readonly paused: number; readonly stopped: number };
    readonly wallets: number;
    readonly fundedWalletsWithNft: number | null;
  };
  readonly users: readonly AdminUserDto[];
  readonly agents: readonly AdminAgentDto[];
  readonly wallets: readonly AdminWalletDto[];
  readonly simulation: {
    readonly enabled: boolean;
    readonly configuredUsers: number;
    readonly provisionedUsers: number;
    readonly tradesPerTick: number;
    readonly tickIntervalMs: number;
    readonly lastTickAt: number | null;
    readonly completedTicks: number;
    readonly executedTrades: number;
    readonly skippedTrades: number;
    readonly lastError: string | null;
  };
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

  /** JWT de session courant, injecté en `Authorization: Bearer` sur chaque appel. */
  private token: string | null = null;

  /** Pose (ou retire avec `null`) le token de session. */
  setToken(token: string | null): void {
    this.token = token;
  }

  // --- Authentification (Sign-In with XRPL) ---

  /** Demande un challenge GemWallet pour l'adresse : nonce + message à signer. */
  async authChallenge(address: string): Promise<AuthChallengeDto> {
    return this.call({ path: "/auth/challenge", method: "POST", body: { address } }, 200);
  }

  /** Crée une identité Paper opaque et récupère son JWT de session. */
  async authPaper(): Promise<PaperSessionDto> {
    return this.call({ path: "/auth/paper", method: "POST" }, 200);
  }

  /** Renouvelle le JWT Paper signe sans changer l'identite anonyme. */
  async authRefreshPaper(): Promise<PaperSessionDto> {
    return this.call({ path: "/auth/paper/refresh", method: "POST" }, 200);
  }

  /** Vérifie une preuve GemWallet et récupère un token de session. */
  async authVerifyGem(proof: GemProof): Promise<AuthTokenDto> {
    return this.call(
      { path: "/auth/verify", method: "POST", body: { wallet: "gem", ...proof } },
      200,
    );
  }

  /** Vérifie un payload Xaman SignIn (par uuid) et récupère un token de session. */
  async authVerifyXaman(uuid: string): Promise<AuthTokenDto> {
    return this.call(
      { path: "/auth/verify", method: "POST", body: { wallet: "xaman", uuid } },
      200,
    );
  }

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

  /** Positions perp ouvertes d'un compte. */
  async positions(userId: string): Promise<readonly Position[]> {
    return this.call({ path: path("accounts", userId, "positions"), method: "GET" }, 200);
  }

  /** Historique persistant des ouvertures de positions perp. */
  async perpOrders(userId: string): Promise<readonly Position[]> {
    return this.call({ path: path("accounts", userId, "perp-orders"), method: "GET" }, 200);
  }

  /** Ouvre une position perp (marge réservée, frais débités du cash). */
  async openPosition(userId: string, input: OpenPositionInput): Promise<Position> {
    return this.call(
      { path: path("accounts", userId, "positions"), method: "POST", body: input },
      201,
    );
  }

  /** Ferme une position ; le PnL est valorisé au prix serveur (autoritatif). */
  async closePosition(userId: string, positionId: string): Promise<ClosedPosition> {
    return this.call(
      { path: path("accounts", userId, "positions", positionId, "close"), method: "POST" },
      200,
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

  async joinCompetition(
    competitionId: string,
    userId: string,
    txHash: string,
  ): Promise<{ competitionId: string; userId: string; txHash: string }> {
    return this.call(
      {
        path: path("competitions", competitionId, "join"),
        method: "POST",
        body: { userId, txHash },
      },
      200,
    );
  }

  async competitionLeaderboard(
    competitionId: string,
  ): Promise<CompetitionLeaderboardEntry[]> {
    return this.call(
      { path: path("competitions", competitionId, "leaderboard"), method: "GET" },
      200,
    );
  }

  async competitionEntryPayment(
    competitionId: string,
    account: string,
  ): Promise<CompetitionEntryPayment> {
    return this.call(
      {
        path: path("competitions", competitionId, "entry", "tx"),
        method: "POST",
        body: { account },
      },
      200,
    );
  }

  async signCompetitionEntry(
    competitionId: string,
    account: string,
  ): Promise<SignRequest> {
    return this.call(
      {
        path: path("competitions", competitionId, "entry", "xaman"),
        method: "POST",
        body: { account },
      },
      201,
    );
  }

  async participants(competitionId: string): Promise<string[]> {
    return this.call(
      { path: path("competitions", competitionId, "participants"), method: "GET" },
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

  // --- Agents / mandats / actions ---
  // Le serveur valide les entrées au bord (`parseCreateAgent`,
  // `parseUpdateAgent`, etc.) ; les champs sensibles (`userId`, `id`,
  // `createdAt`) ne peuvent pas être forcés côté client.

  /** Liste les agents d'un utilisateur. */
  async agents(userId: string): Promise<AgentDto[]> {
    return this.call(
      { path: `/api/agents?userId=${encodeURIComponent(userId)}`, method: "GET" },
      200,
    );
  }

  /** Récupère un agent par id (404 si absent). */
  async agent(id: string): Promise<AgentDto> {
    return this.call({ path: path("api", "agents", id), method: "GET" }, 200);
  }

  /** Crée un agent (status=active, hasLiveAccount=false par défaut). */
  async createAgent(input: {
    userId: string;
    name: string;
    type: "external" | "integrated";
  }): Promise<AgentDto> {
    return this.call(
      { path: "/api/agents", method: "POST", body: input },
      201,
    );
  }

  /**
   * Mise à jour partielle (name/type/status). `id`/`userId`/`createdAt`/
   * `hasLiveAccount` sont protégés côté serveur — le serveur filtre la diff.
   */
  async updateAgent(
    id: string,
    patch: { name?: string; type?: "external" | "integrated"; status?: "active" | "paused" | "stopped" },
  ): Promise<AgentDto> {
    return this.call(
      { path: path("api", "agents", id), method: "PATCH", body: patch },
      200,
    );
  }

  /** Supprime un agent. Idempotent côté store (404 si absent). */
  async deleteAgent(id: string): Promise<{ deleted: true }> {
    return this.call(
      { path: path("api", "agents", id), method: "DELETE" },
      200,
    );
  }

  /** Tue un agent (status=stopped + révocation des mandats actifs). */
  async killAgent(id: string): Promise<AgentDto> {
    return this.call(
      { path: path("api", "agents", id, "kill"), method: "POST" },
      200,
    );
  }

  /** Liste les mandats d'un agent (tous statuts). */
  async mandates(agentId: string): Promise<MandateDto[]> {
    return this.call(
      { path: `/api/mandates?agentId=${encodeURIComponent(agentId)}`, method: "GET" },
      200,
    );
  }

  /** Crée un mandat en status=pending (non signé). */
  async createMandate(input: {
    agentId: string;
    userId: string;
    capitalMax: number;
    perteMaxJour: number;
    maxTradesPerDay: number;
    maxLeverage: number;
    pairesAutorisees: readonly string[];
    style: string | null;
    validUntil: number;
  }): Promise<MandateDto> {
    return this.call(
      { path: "/api/mandates", method: "POST", body: input },
      201,
    );
  }

  /**
   * Active un mandat `pending` via le callback de signature. La signature
   * Xaman réelle (non-custodial) n'est pas encore branchée : l'UI passe une
   * signature simulée pour rendre l'agent utilisable en paper/démo. Le backend
   * ne vérifie pas la signature (cf. `onSignCallback`). À remplacer par la
   * signature Xaman réelle avant le mode Live.
   */
  async signMandate(mandateId: string, signature: string): Promise<MandateDto> {
    return this.call(
      {
        path: "/api/sign/mandate-callback",
        method: "POST",
        body: { mandateId, signature },
      },
      200,
    );
  }

  /**
   * Historique d'actions d'un agent (alimenté côté MCP). `limit` borné
   * côté serveur à [1, 200] ; défaut 100.
   */
  async agentActions(agentId: string, limit?: number): Promise<AgentActionDto[]> {
    const qs =
      limit === undefined
        ? `?agentId=${encodeURIComponent(agentId)}`
        : `?agentId=${encodeURIComponent(agentId)}&limit=${String(limit)}`;
    return this.call({ path: `/api/agent-actions${qs}`, method: "GET" }, 200);
  }

  /** Statut des badges d'un utilisateur (mérite dérivé + claims). */
  async badges(userId: string): Promise<BadgeDto[]> {
    return this.call(
      { path: path("accounts", userId, "badges"), method: "GET" },
      200,
    );
  }

  /** Réclame un badge : mint on-demand, renvoie l'offer à faire signer. */
  async claimBadge(
    userId: string,
    code: string,
    walletAddress: string,
  ): Promise<ClaimBadgeResult> {
    return this.call(
      {
        path: path("badges", code, "claim"),
        method: "POST",
        body: { userId, walletAddress },
      },
      200,
    );
  }

  /** Confirme le claim (le user a signé l'accept) → statut claimed. */
  async confirmBadgeClaim(
    userId: string,
    code: string,
    txHash?: string,
  ): Promise<void> {
    await this.call(
      {
        path: path("badges", code, "claim", "confirm"),
        method: "POST",
        body: txHash === undefined ? { userId } : { userId, txHash },
      },
      200,
    );
  }

  /** Récompenses hebdomadaires éligibles du compte Paper. */
  async weeklyRewards(userId: string): Promise<WeeklyRewardDto[]> {
    return this.call(
      { path: path("accounts", userId, "weekly-rewards"), method: "GET" },
      200,
    );
  }

  /** Wallet technique Mainnet + état du NFT First Trade (jamais la seed). */
  async paperWalletStatus(userId: string): Promise<PaperWalletRewardDto> {
    return this.call(
      { path: path("accounts", userId, "paper-wallet"), method: "GET" },
      200,
    );
  }

  /** Claim explicite : le serveur accepte le NFT dans le wallet Paper custodial. */
  async claimWeeklyReward(userId: string, week: string): Promise<WeeklyRewardDto> {
    return this.call(
      {
        path: path("weekly-rewards", week, "claim"),
        method: "POST",
        body: { userId },
      },
      200,
    );
  }

  private async call<T>(request: ApiRequest, okStatus: number): Promise<T> {
    const authed =
      this.token === null
        ? request
        : {
            ...request,
            headers: { ...request.headers, authorization: `Bearer ${this.token}` },
          };
    const response = await this.transport(authed);
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
