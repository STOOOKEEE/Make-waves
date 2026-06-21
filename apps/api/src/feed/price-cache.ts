import type { PriceMap } from "@tide/core";

/**
 * Cache de prix en mémoire : le serveur lit un instantané **synchrone**
 * (`current()`) tandis qu'un rafraîchisseur asynchrone (feed CEX) met à jour le
 * cache en arrière-plan. Découple la lecture (rapide, fréquente) de la
 * récupération (réseau, périodique). Copies défensives aux deux bouts.
 */
export class PriceCache {
  private prices: PriceMap = {};

  /** Instantané courant (copie : l'état interne reste encapsulé). */
  current(): PriceMap {
    return { ...this.prices };
  }

  /** Remplace l'instantané (copie : pas de référence partagée avec l'appelant). */
  set(prices: PriceMap): void {
    this.prices = { ...prices };
  }
}
