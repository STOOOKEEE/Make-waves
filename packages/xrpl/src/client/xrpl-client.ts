import type { AmmInfoClient, XrplCurrency } from "../price/amm-reader";
import { readAmmSpotPrice } from "../price/amm-reader";
import type { BookOffersClient, BookQuote } from "../price/book-reader";
import { readBookQuote } from "../price/book-reader";
import type {
  XrplConnection,
  XrplRequestEnvelope,
  XrplResponseEnvelope,
} from "./connection";
import { parseAmmInfoResult, parseBookOffersResult } from "./parse";
import { XrplConnectionError } from "./errors";

/**
 * Client XRPL de haut niveau de Tide. Détient une `XrplConnection` (injectée :
 * faux en test, `adaptXrplClient(new Client(url))` en mainnet), gère le cycle de
 * connexion avec des erreurs typées, et expose des lectures applicatives qui
 * réutilisent les modules purs déjà testés (ex. `readAmmSpotPrice`).
 *
 * Les lecteurs de carnet, l'indexeur et la soumission viendront se greffer ici
 * (mêmes garanties : parsing défensif, erreurs typées, aucune confiance réseau).
 */
export class XrplClient {
  private readonly connection: XrplConnection;
  /** Connexion en cours, partagée → des appels concurrents ne connectent qu'une fois. */
  private connecting: Promise<void> | null = null;

  constructor(connection: XrplConnection) {
    this.connection = connection;
  }

  /**
   * Connecte si nécessaire (idempotent, sûr en concurrence : N lectures
   * simultanées au démarrage d'un feed ne déclenchent qu'une connexion).
   * Type l'échec réseau en `XrplConnectionError`.
   */
  async connect(): Promise<void> {
    if (this.connection.isConnected()) {
      return;
    }
    if (this.connecting !== null) {
      return this.connecting;
    }
    this.connecting = this.openConnection();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async openConnection(): Promise<void> {
    try {
      await this.connection.connect();
    } catch (error) {
      throw new XrplConnectionError("Connexion au réseau XRPL échouée", {
        cause: error,
      });
    }
  }

  /** Ferme la connexion (idempotent), en typant l'échec. */
  async disconnect(): Promise<void> {
    if (!this.connection.isConnected()) {
      return;
    }
    try {
      await this.connection.disconnect();
    } catch (error) {
      throw new XrplConnectionError("Déconnexion du réseau XRPL échouée", {
        cause: error,
      });
    }
  }

  isConnected(): boolean {
    return this.connection.isConnected();
  }

  /**
   * Exécute une requête après connexion et parse défensivement le `result`.
   * Une panne réseau (ws coupé, timeout, rippled tooBusy) → `XrplConnectionError`
   * (cause réseau) ; les `XrplRequestError` du parseur (donnée incohérente)
   * remontent telles quelles. Point unique de gestion d'erreur réseau des lectures.
   */
  private async request<T>(
    request: XrplRequestEnvelope,
    parse: (result: unknown) => T,
  ): Promise<T> {
    await this.connect();
    let response: XrplResponseEnvelope;
    try {
      response = await this.connection.request(request);
    } catch (error) {
      throw new XrplConnectionError("Requête réseau XRPL échouée", {
        cause: error,
      });
    }
    return parse(response.result);
  }

  /**
   * Prix spot d'un pool AMM (`asset` exprimé en `asset2`). Délègue le calcul au
   * lecteur pur audité. Lève `XrplRequestError`/`InvalidPriceError` si la donnée
   * est incohérente — jamais de prix faux silencieux.
   */
  async ammSpotPrice(asset: XrplCurrency, asset2: XrplCurrency): Promise<number> {
    const ammClient: AmmInfoClient = {
      request: (request) => this.request(request, parseAmmInfoResult),
    };
    return readAmmSpotPrice(ammClient, asset, asset2);
  }

  /**
   * Cotation d'une paire au carnet d'ordres natif : bid, ask, mid, spread.
   * Lève `InvalidPriceError` si un côté est vide ou si le carnet est croisé.
   */
  async bookQuote(base: XrplCurrency, quote: XrplCurrency): Promise<BookQuote> {
    const bookClient: BookOffersClient = {
      request: (request) => this.request(request, parseBookOffersResult),
    };
    return readBookQuote(bookClient, base, quote);
  }
}
