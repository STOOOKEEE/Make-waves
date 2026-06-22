import type { AmmInfoClient, XrplCurrency } from "../price/amm-reader";
import { readAmmSpotPrice } from "../price/amm-reader";
import type { XrplConnection, XrplResponseEnvelope } from "./connection";
import { parseAmmInfoResult } from "./parse";
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
   * Prix spot d'un pool AMM (`asset` exprimé en `asset2`). Se connecte au besoin,
   * lit `amm_info`, parse défensivement la réponse puis délègue le calcul au
   * lecteur pur audité. Lève `XrplRequestError`/`InvalidPriceError` si la donnée
   * est incohérente — jamais de prix faux silencieux.
   */
  async ammSpotPrice(asset: XrplCurrency, asset2: XrplCurrency): Promise<number> {
    await this.connect();
    const ammClient: AmmInfoClient = {
      request: async (request) => {
        let response: XrplResponseEnvelope;
        try {
          response = await this.connection.request(request);
        } catch (error) {
          // Panne réseau post-connexion (ws coupé, timeout, rippled tooBusy) :
          // la cause est réseau → erreur typée, pas une donnée incohérente.
          throw new XrplConnectionError("Requête réseau XRPL échouée", {
            cause: error,
          });
        }
        // Les XrplRequestError de parsing (donnée malformée) remontent telles quelles.
        return parseAmmInfoResult(response.result);
      },
    };
    return readAmmSpotPrice(ammClient, asset, asset2);
  }
}
