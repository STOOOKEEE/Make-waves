import type {
  Balances,
  Competition,
  Fill,
  LeaderboardEntry,
  MarketOrderInput,
  Payout,
} from "@tide/core";
import type { ApiRequest, ApiTransport } from "./transport";
import { extractErrorMessage, TideApiError } from "./errors";

/** Résultat de clôture d'une compétition côté API. */
export interface CloseResult {
  readonly payouts: Payout[];
  readonly undistributed: number;
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

  // --- Compétitions ---

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

  async signLiveOffer(
    account: string,
    gives: ApiAmount,
    wants: ApiAmount,
  ): Promise<SignRequest> {
    return this.call(
      {
        path: "/sign/live-offer",
        method: "POST",
        body: { account, gives, wants },
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
