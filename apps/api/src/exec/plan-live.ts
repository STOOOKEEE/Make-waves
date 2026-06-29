import type { PriceMap } from "@tide/core";
import { planExecution } from "@tide/xrpl";
import type { ExecutionPlan, ExecSide, XrplCurrency } from "@tide/xrpl";

/**
 * Faute d'intention de swap Live (actif non tradable, prix indisponible) : 400.
 * Distincte d'`InvalidAmountError` (montants/slippage, levée par `planExecution`)
 * et de `PriceFeedError` (panne amont, 502).
 */
export class LiveExecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveExecError";
  }
}

/** Devise de cotation (quote) d'un swap Live, configurée côté serveur. */
export interface LiveQuote {
  /** Code de devise XRPL (RLUSD = code hex 160-bit). */
  readonly currency: string;
  /** Émetteur du token de cotation. */
  readonly issuer: string;
  /** Symbole lisible (clé du feed de prix, ex. "RLUSD"). */
  readonly symbol: string;
}

/** RLUSD encodé en code de devise XRPL (160-bit hex : « RLUSD » + padding). */
export const RLUSD_CURRENCY = "524C555344000000000000000000000000000000";
/** Symbole lisible du token de cotation Live. */
export const RLUSD_SYMBOL = "RLUSD";
/**
 * Émetteur RLUSD sur le mainnet XRPL (Ripple USD). Adresse publique fixe, vérifiée
 * via la doc Ripple / XRPScan / whitepaper. Sert de quote Live par défaut.
 */
export const RLUSD_MAINNET_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
/** Quote Live par défaut : RLUSD mainnet (le token de cotation du produit). */
export const DEFAULT_LIVE_QUOTE: LiveQuote = {
  currency: RLUSD_CURRENCY,
  issuer: RLUSD_MAINNET_ISSUER,
  symbol: RLUSD_SYMBOL,
};

/** Seul actif XRPL natif tradable en Live (base des paires spot). */
const NATIVE_BASE = "XRP";

/**
 * Intention de swap Live telle qu'exprimée par le client : QUOI échanger et avec
 * quelle tolérance, jamais les montants bruts (`gives`/`wants`) ni l'attribution.
 * Le serveur en dérive l'`OfferCreate` borné via le moteur de best execution.
 */
export interface LiveOfferIntent {
  /** Compte qui trade (signera). */
  readonly account: string;
  /** Symbole de l'actif tradé (base) — ex. "XRP". */
  readonly base: string;
  /** Acheter (payer en quote) ou vendre (recevoir en quote) la base. */
  readonly side: ExecSide;
  /** Quantité de base à échanger. */
  readonly amountBase: number;
  /** Tolérance de slippage dans [0, 1) (ex. 0.01 = 1 %). */
  readonly slippageTolerance: number;
}

/** Dépendances du moteur d'exécution Live (prix de référence + attribution + quote). */
export interface LivePlanDeps {
  readonly getPrices: () => PriceMap;
  readonly sourceTag: number;
  readonly quote: LiveQuote;
}

/** Résout le symbole d'actif tradé en `XrplCurrency` (seul XRP natif supporté). */
function resolveBaseCurrency(base: string, quote: LiveQuote): XrplCurrency {
  if (base === quote.symbol) {
    throw new LiveExecError(`base et quote identiques (${base})`);
  }
  if (base !== NATIVE_BASE) {
    throw new LiveExecError(
      `actif non tradable en Live: ${base} (seul ${NATIVE_BASE}/${quote.symbol} est supporté)`,
    );
  }
  return { currency: NATIVE_BASE };
}

/**
 * Planifie l'exécution d'un swap Live à partir d'une intention : résout les
 * devises (base native, quote configurée), prend le prix de référence du feed
 * et délègue à `planExecution` (compare AMM/carnet, borne le slippage, produit
 * l'`OfferCreate` taggé). Le `sourceTag` et l'issuer du quote restent serveur.
 *
 * Note : faute de pool on-chain câblé, on alimente le plan avec le prix du feed
 * (RLUSD pegué ≈ USD) comme prix AMM ET carnet ; la borne de slippage protège
 * l'exécution réelle. Avec un pool on-chain, ces deux prix divergeraient.
 */
export function planLiveOffer(
  deps: LivePlanDeps,
  intent: LiveOfferIntent,
): ExecutionPlan {
  const base = resolveBaseCurrency(intent.base, deps.quote);
  const referencePrice = deps.getPrices()[intent.base];
  if (referencePrice === undefined || !Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new LiveExecError(`prix indisponible pour ${intent.base}`);
  }
  return planExecution({
    account: intent.account,
    base,
    quote: { currency: deps.quote.currency, issuer: deps.quote.issuer },
    side: intent.side,
    amountBase: intent.amountBase,
    ammPrice: referencePrice,
    bookPrice: referencePrice,
    slippageTolerance: intent.slippageTolerance,
    sourceTag: deps.sourceTag,
  });
}
