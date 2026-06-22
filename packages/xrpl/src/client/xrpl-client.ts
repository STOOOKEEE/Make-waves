import { assertValidAddress } from "../tx/address";
import type { AmmInfoClient, XrplCurrency } from "../price/amm-reader";
import { readAmmSpotPrice } from "../price/amm-reader";
import type { BookOffersClient, BookQuote } from "../price/book-reader";
import { readBookQuote } from "../price/book-reader";
import type {
  XrplConnection,
  XrplRequestEnvelope,
  XrplResponseEnvelope,
} from "./connection";
import type { AccountTxPage } from "./parse";
import {
  parseAccountTxResult,
  parseAmmInfoResult,
  parseBookOffersResult,
} from "./parse";
import type { SubmitOutcome } from "./submit";
import { parseSubmitResult } from "./submit";
import { XrplConnectionError, XrplRequestError } from "./errors";

/** Options de lecture `account_tx`. */
export interface AccountTxOptions {
  /** Ne lire qu'à partir de ce ledger (curseur de progression de l'indexeur). */
  readonly ledgerIndexMin?: number;
  /**
   * Borne haute de ledger. À FIGER pendant une session de pagination : sans elle,
   * le serveur vise le dernier ledger validé, qui bouge entre les pages (fenêtre
   * mouvante → risque de miss/recompte). L'indexeur la fige sur la 1re page.
   */
  readonly ledgerIndexMax?: number;
  /** Nombre max d'entrées par page. */
  readonly limit?: number;
  /** Marker de pagination (renvoyé par une page précédente). */
  readonly marker?: unknown;
}

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

  /**
   * Transactions d'un compte (`account_tx`), en ordre chronologique (forward).
   * Renvoie les entrées brutes + la borne haute de ledger (curseur). L'extraction
   * des tx taggées est faite par `extractTaggedTxs` (pur). Valide l'adresse.
   */
  async accountTx(
    account: string,
    options: AccountTxOptions = {},
  ): Promise<AccountTxPage> {
    assertValidAddress(account, "account");
    const request: XrplRequestEnvelope = {
      command: "account_tx",
      account,
      forward: true,
      ...(options.ledgerIndexMin !== undefined
        ? { ledger_index_min: options.ledgerIndexMin }
        : {}),
      ...(options.ledgerIndexMax !== undefined
        ? { ledger_index_max: options.ledgerIndexMax }
        : {}),
      ...(options.limit !== undefined ? { limit: options.limit } : {}),
      ...(options.marker !== undefined ? { marker: options.marker } : {}),
    };
    return this.request(request, parseAccountTxResult);
  }

  /**
   * Soumet une transaction signée (`tx_blob`). Le résultat est **provisoire**
   * (avis du nœud, pas la finalité) : confirmer ensuite via le ledger validé.
   * Ne lève PAS sur un échec applicatif (`tec*`/`tem*`…) — il est rapporté dans
   * `SubmitOutcome.category` pour que l'appelant décide (jamais avalé). Une panne
   * réseau, elle, est typée `XrplConnectionError`.
   */
  async submit(txBlob: string): Promise<SubmitOutcome> {
    if (txBlob.trim() === "") {
      throw new XrplRequestError("submit: tx_blob vide");
    }
    return this.request({ command: "submit", tx_blob: txBlob }, parseSubmitResult);
  }
}
