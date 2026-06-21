import type { Amount } from "xrpl";
import { ammSpotPrice } from "./spot";
import { InvalidPriceError } from "../errors";

/** Devise XRPL dans une requête (XRP = `{ currency: "XRP" }`, token = + issuer). */
export interface XrplCurrency {
  readonly currency: string;
  readonly issuer?: string;
}

/**
 * Sous-ensemble de la réponse `amm_info` réellement utilisé (forme vérifiée
 * contre xrpl.js 4.6.0). `amm` est typé optionnel : on ne fait pas confiance à
 * une réponse réseau, on garde le pool absent comme cas géré.
 *
 * ⚠️ `amount`/`amount2` sont renvoyés dans un ORDRE CANONIQUE INTERNE du
 * protocole, PAS dans l'ordre `asset`/`asset2` de la requête (doc XRPL). On
 * identifie donc chaque réserve par sa devise, jamais par sa position.
 */
export interface AmmInfoResult {
  readonly result: {
    readonly amm?: {
      readonly amount: Amount;
      readonly amount2: Amount;
    };
  };
}

/**
 * Client minimal capable d'exécuter `amm_info`, INJECTÉ → le lecteur est
 * testable sans réseau.
 *
 * Note d'intégration : un `Client` xrpl.js réel n'est PAS directement assignable
 * à cette interface (sa méthode `request` est générique et `Currency` est un type
 * discriminé strict). Au point d'injection mainnet, écrire un petit adaptateur
 * qui prend un `Client`, construit une vraie `AMMInfoRequest` et expose `request`.
 */
export interface AmmInfoClient {
  request(request: {
    command: "amm_info";
    asset: XrplCurrency;
    asset2: XrplCurrency;
  }): Promise<AmmInfoResult>;
}

/** Une réserve (montant) correspond-elle à la devise attendue ? */
function reserveMatchesCurrency(
  reserve: Amount,
  currency: XrplCurrency,
): boolean {
  if (typeof reserve === "string") {
    // Un montant string = XRP (drops).
    return currency.currency === "XRP";
  }
  return (
    reserve.currency === currency.currency && reserve.issuer === currency.issuer
  );
}

/**
 * Lit le prix spot d'un pool AMM on-chain : prix d'`asset` exprimé en `asset2`.
 *
 * Les réserves sont appariées à leur devise (pas à leur position dans la
 * réponse, cf. ordre canonique du protocole), puis le prix = réserve(asset2) /
 * réserve(asset) via `ammSpotPrice` (validation des montants incluse).
 *
 * Lève `InvalidPriceError` si le pool est absent ou si aucune réserve ne
 * correspond à `asset` (réponse incohérente).
 */
export async function readAmmSpotPrice(
  client: AmmInfoClient,
  asset: XrplCurrency,
  asset2: XrplCurrency,
): Promise<number> {
  const response = await client.request({ command: "amm_info", asset, asset2 });
  const amm = response.result.amm;
  if (amm === undefined) {
    throw new InvalidPriceError("amm_info: pool absent de la réponse");
  }

  let assetReserve: Amount;
  let asset2Reserve: Amount;
  if (reserveMatchesCurrency(amm.amount, asset)) {
    assetReserve = amm.amount;
    asset2Reserve = amm.amount2;
  } else if (reserveMatchesCurrency(amm.amount2, asset)) {
    assetReserve = amm.amount2;
    asset2Reserve = amm.amount;
  } else {
    throw new InvalidPriceError(
      `amm_info: aucune réserve ne correspond à asset (${asset.currency})`,
    );
  }

  return ammSpotPrice(assetReserve, asset2Reserve);
}
