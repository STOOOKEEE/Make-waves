import { computeCloseSettlement, computeOpenSettlement } from "./settlement";
import type { VaultClient } from "./vault-client";
import { assertValidDecimals } from "./units";
import type { Position } from "@tide/core";

/**
 * Orchestrateur de règlement : applique une décision de trading (PnL/marge
 * calculés par le backend) sur le `MarginVault`. Tout passe par les fonctions
 * pures `compute*` (cf. `settlement.ts`) — ce service est un **adaptateur
 * idempotent** (best-effort : on évite la double-application au niveau de la
 * couche d'appel, pas on-chain).
 *
 * Raison d'être :
 *  - garder le backend (Node + Express/Fastify) **découplé** du contrat ;
 *  - pouvoir tester la traduction de bout en bout (paper position → tx vault)
 *    avec un `VaultClient` faux, sans RPC ni clés ;
 *  - centraliser les invariants cross-couches (`pnl ≥ -marge` re-imposé ici
 *    en garde-fou, miroir du plafond on-chain de `closeAccounting`).
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

  /** Ouvre une position sur le vault. */
  async openPosition(account: string, margin: number, fee: number): Promise<void> {
    const { marginBase, feeBase } = computeOpenSettlement(margin, fee, this.#decimals);
    await this.#vault.openAccounting(account, marginBase, feeBase);
  }

  /**
   * Ferme une position et applique le PnL réalisé au prix de sortie. Le PnL
   * est plafonné à -marge (isolated) par `computeCloseSettlement` — l'autorité
   * unique du plafond vit dans `settlement.ts`. Lève `InvalidPriceError`
   * (via `positionPnl`) si `exitPrice` est aberrant. L'adresse de compte
   * (EVM) est fournie par l'appelant — la `Position.id` est locale au backend,
   * pas une adresse chaîne.
   */
  async closePosition(
    account: string,
    position: Position,
    exitPrice: number,
  ): Promise<void> {
    const { marginReleaseBase, pnlBase } = computeCloseSettlement(
      position,
      exitPrice,
      this.#decimals,
    );
    await this.#vault.closeAccounting(account, marginReleaseBase, pnlBase);
  }

  /** Lit le collatéral on-chain (sert de plafond réel pour l'ouverture). */
  collateralOf(account: string): Promise<bigint> {
    return this.#vault.collateralOf(account);
  }
}