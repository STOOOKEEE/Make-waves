import { computeCloseSettlement, computeOpenSettlement } from "./settlement";
import type { VaultClient } from "./vault-client";
import { assertValidDecimals } from "./units";
import { assertEvmAddress } from "./address";
import { SettlementError } from "./errors";
import type { Position } from "@tide/core";

/**
 * Orchestrateur de règlement : applique une décision de trading (PnL/marge
 * calculés par le backend) sur le `MarginVault`. Tout passe par les fonctions
 * pures `compute*` (cf. `settlement.ts`) — ce service est l'adaptateur entre le
 * moteur de position et le contrat.
 *
 * Idempotence : chaque instruction porte une `idempotencyKey` **stable** fournie
 * par l'appelant. Elle est transmise au `VaultClient`, qui la hache en
 * `settlementId` consommé **on-chain** (exactly-once garanti par le contrat, plus
 * seulement au niveau de la couche d'appel). Un retry doit réutiliser la même clé.
 *
 * Raison d'être :
 *  - garder le backend (Node + Fastify) **découplé** du contrat ;
 *  - tester la traduction de bout en bout (paper position → tx vault) avec un
 *    `VaultClient` faux, sans RPC ni clés ;
 *  - centraliser les invariants cross-couches (`pnl ≥ -marge` re-imposé dans
 *    `settlement.ts`, miroir du plafond on-chain ; validation d'adresse EVM ici).
 */

export interface SettlementServiceOptions {
  /** Nombre de décimales du token de collatéral (ex. RLUSD). */
  readonly collateralDecimals: number;
}

export class SettlementService {
  readonly #vault: VaultClient;
  readonly #decimals: number;

  constructor(vault: VaultClient, options: SettlementServiceOptions) {
    assertValidDecimals(options.collateralDecimals);
    this.#vault = vault;
    this.#decimals = options.collateralDecimals;
  }

  /** Ouvre une position sur le vault. `idempotencyKey` : identifiant stable de l'ouverture. */
  async openPosition(
    account: string,
    idempotencyKey: string,
    margin: number,
    fee: number,
  ): Promise<void> {
    assertEvmAddress(account);
    assertIdempotencyKey(idempotencyKey);
    const { marginBase, feeBase } = computeOpenSettlement(margin, fee, this.#decimals);
    await this.#vault.openAccounting(account, idempotencyKey, marginBase, feeBase);
  }

  /**
   * Ferme une position et applique le PnL réalisé au prix de sortie. Le PnL
   * est plafonné à -marge (isolated) par `computeCloseSettlement` — l'autorité
   * unique du plafond vit dans `settlement.ts`. Lève `InvalidPriceError`
   * (via `positionPnl`) si `exitPrice` est aberrant. L'adresse de compte
   * (EVM) est fournie par l'appelant — la `Position.id` est locale au backend,
   * pas une adresse chaîne. `idempotencyKey` : identifiant stable de la fermeture.
   */
  async closePosition(
    account: string,
    idempotencyKey: string,
    position: Position,
    exitPrice: number,
  ): Promise<void> {
    assertEvmAddress(account);
    assertIdempotencyKey(idempotencyKey);
    const { marginReleaseBase, pnlBase } = computeCloseSettlement(
      position,
      exitPrice,
      this.#decimals,
    );
    await this.#vault.closeAccounting(account, idempotencyKey, marginReleaseBase, pnlBase);
  }

  /** Lit le collatéral on-chain (sert de plafond réel pour l'ouverture). */
  async collateralOf(account: string): Promise<bigint> {
    assertEvmAddress(account);
    return this.#vault.collateralOf(account);
  }
}

/** Une clé d'idempotence vide priverait le règlement de sa garantie exactly-once. */
function assertIdempotencyKey(key: string): void {
  if (key.length === 0) {
    throw new SettlementError("idempotencyKey vide");
  }
}
