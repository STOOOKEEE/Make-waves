import type { Amount } from "xrpl";
import { ammSpotPrice, midPrice, relativeSpread } from "./spot";
import { amountToQuantity } from "./quantity";
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

/** Niveau du carnet d'ordres. Taille et total sont exprimés en base. */
export interface BookDepthLevel {
  readonly price: number;
  readonly size: number;
  readonly total: number;
}

/** Profondeur du carnet d'ordres autour du meilleur prix. */
export interface BookDepth {
  readonly asks: readonly BookDepthLevel[];
  readonly bids: readonly BookDepthLevel[];
  readonly mid: number;
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

function bookLevelForAsk(offer: BookOffer): BookDepthLevel {
  const { gets, pays } = offerAmounts(offer);
  const size = amountToQuantity(gets, "book ask size");
  return {
    price: ammSpotPrice(gets, pays),
    size,
    total: size,
  };
}

function bookLevelForBid(offer: BookOffer): BookDepthLevel {
  const { gets, pays } = offerAmounts(offer);
  const size = amountToQuantity(pays, "book bid size");
  return {
    price: ammSpotPrice(pays, gets),
    size,
    total: size,
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

/**
 * Profondeur du carnet sur `limit` niveaux par côté. Les totaux sont cumulés en
 * base. Le carnet est lu dans les deux sens natifs XRPL :
 * - asks : vendeurs qui fournissent la base contre la quote ;
 * - bids : vendeurs qui fournissent la quote contre la base.
 */
export async function readBookDepth(
  client: BookOffersClient,
  base: XrplCurrency,
  quote: XrplCurrency,
  limit = 8,
): Promise<BookDepth> {
  const askResponse = await client.request({
    command: "book_offers",
    taker_gets: base,
    taker_pays: quote,
    limit,
  });
  const bidResponse = await client.request({
    command: "book_offers",
    taker_gets: quote,
    taker_pays: base,
    limit,
  });
  const asksRaw = askResponse.result.offers;
  const bidsRaw = bidResponse.result.offers;
  if (asksRaw.length === 0 || bidsRaw.length === 0) {
    throw new InvalidPriceError("Carnet vide");
  }

  let total = 0;
  const asks = asksRaw.map((offer) => {
    const level = bookLevelForAsk(offer);
    total += level.size;
    return { ...level, total };
  });

  total = 0;
  const bids = bidsRaw.map((offer) => {
    const level = bookLevelForBid(offer);
    total += level.size;
    return { ...level, total };
  });

  const ask = asks[0]?.price;
  const bid = bids[0]?.price;
  if (ask === undefined || bid === undefined) {
    throw new InvalidPriceError("Carnet vide");
  }
  if (ask < bid) {
    throw new InvalidPriceError(`Carnet croisé: ask (${String(ask)}) < bid (${String(bid)})`);
  }
  return {
    asks,
    bids,
    mid: midPrice(bid, ask),
    spread: relativeSpread(bid, ask),
  };
}
