import type { Amount } from "xrpl";
import { ammSpotPrice, midPrice, relativeSpread } from "./spot";
import type { XrplCurrency } from "./amm-reader";
import { InvalidPriceError } from "../errors";

/**
 * Offre du carnet réellement consommée. On lit le prix depuis `TakerGets`/
 * `TakerPays` (via `ammSpotPrice` → `amountToQuantity`, qui gère les drops XRP)
 * plutôt que le champ `quality` du protocole, dont l'échelle dépend de la
 * présence de XRP d'un côté (piège classique de conversion). Les variantes
 * `*_funded` (montant réellement disponible) priment si présentes.
 */
export interface BookOffer {
  readonly TakerGets: Amount;
  readonly TakerPays: Amount;
  readonly taker_gets_funded?: Amount;
  readonly taker_pays_funded?: Amount;
}

/** Sous-ensemble utilisé de la réponse `book_offers`. */
export interface BookOffersResult {
  readonly result: {
    readonly offers: readonly BookOffer[];
  };
}

/**
 * Client minimal capable d'exécuter `book_offers`, INJECTÉ → lecteur testable
 * sans réseau (cf. note d'intégration sur `AmmInfoClient`).
 */
export interface BookOffersClient {
  request(request: {
    command: "book_offers";
    taker_gets: XrplCurrency;
    taker_pays: XrplCurrency;
    limit?: number;
  }): Promise<BookOffersResult>;
}

/** Cotation agrégée d'une paire au carnet d'ordres. */
export interface BookQuote {
  /** Meilleur prix d'achat possible (ask) : coût pour acquérir 1 base, en quote. */
  readonly ask: number;
  /** Meilleur prix de vente possible (bid) : produit de 1 base vendue, en quote. */
  readonly bid: number;
  /** Prix milieu. */
  readonly mid: number;
  /** Spread relatif `(ask - bid) / mid`. */
  readonly spread: number;
}

/**
 * Montants réellement disponibles d'une offre (funded si présent). Les deux
 * `*_funded` sont émis ENSEMBLE par rippled (même facteur de réduction, prix
 * d'offre fixe). On impose donc le tout-ou-rien : mélanger un côté funded
 * (réduit) avec l'autre côté offert (plein) fausserait le ratio → prix faux
 * silencieux. Un funded partiel (un seul côté) est rejeté.
 */
function offerAmounts(offer: BookOffer): { gets: Amount; pays: Amount } {
  const getsFunded = offer.taker_gets_funded;
  const paysFunded = offer.taker_pays_funded;
  if ((getsFunded === undefined) !== (paysFunded === undefined)) {
    throw new InvalidPriceError(
      "Offre à funded partiel (un seul côté présent) : ratio de prix incohérent",
    );
  }
  return {
    gets: getsFunded ?? offer.TakerGets,
    pays: paysFunded ?? offer.TakerPays,
  };
}

async function bestOffer(
  client: BookOffersClient,
  takerGets: XrplCurrency,
  takerPays: XrplCurrency,
  side: string,
): Promise<BookOffer> {
  const response = await client.request({
    command: "book_offers",
    taker_gets: takerGets,
    taker_pays: takerPays,
    limit: 1,
  });
  const best = response.result.offers[0];
  if (best === undefined) {
    throw new InvalidPriceError(`Carnet vide (${side})`);
  }
  return best;
}

/**
 * Meilleur ask : coût d'achat de `base` exprimé en `quote`. On lit le book où
 * les vendeurs FOURNISSENT `base` (TakerGets) contre `quote` (TakerPays). Prix =
 * quote/base de la meilleure offre.
 */
export async function readBestAsk(
  client: BookOffersClient,
  base: XrplCurrency,
  quote: XrplCurrency,
): Promise<number> {
  const { gets, pays } = offerAmounts(await bestOffer(client, base, quote, "ask"));
  return ammSpotPrice(gets, pays);
}

/**
 * Meilleur bid : produit de vente de `base` exprimé en `quote`. On lit le book
 * inverse (vendeurs fournissant `quote` contre `base`) et on exprime le prix en
 * quote par base.
 */
export async function readBestBid(
  client: BookOffersClient,
  base: XrplCurrency,
  quote: XrplCurrency,
): Promise<number> {
  const { gets, pays } = offerAmounts(await bestOffer(client, quote, base, "bid"));
  // gets = quote, pays = base → prix = quote/base
  return ammSpotPrice(pays, gets);
}

/**
 * Cotation complète d'une paire au carnet : bid, ask, mid, spread. Lève
 * `InvalidPriceError` si un côté est vide ou si le carnet est croisé (ask < bid),
 * signe d'une donnée incohérente — jamais de prix faux silencieux.
 *
 * Dette assumée : ask et bid sont lus en DEUX requêtes (ledger courant non figé).
 * Sous forte activité, un croisement transitoire peut lever `InvalidPriceError` —
 * c'est une protection, pas un bug ; l'appelant (feed) retente. Lecture atomique
 * sur un `ledger_index` figé = amélioration future si nécessaire.
 */
export async function readBookQuote(
  client: BookOffersClient,
  base: XrplCurrency,
  quote: XrplCurrency,
): Promise<BookQuote> {
  const ask = await readBestAsk(client, base, quote);
  const bid = await readBestBid(client, base, quote);
  return {
    ask,
    bid,
    mid: midPrice(bid, ask),
    spread: relativeSpread(bid, ask),
  };
}
