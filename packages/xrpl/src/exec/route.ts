import type { Amount, OfferCreate } from "xrpl";
import type { XrplCurrency } from "../price/amm-reader";
import { buildLiveOffer } from "../tx/offer";
import { DROPS_PER_XRP } from "../constants";
import { InvalidAmountError } from "../errors";

/** Sens du trade côté `base` : acheter (payer en quote) ou vendre (recevoir en quote). */
export type ExecSide = "buy" | "sell";

export interface ExecutionRequest {
  readonly account: string;
  readonly base: XrplCurrency;
  readonly quote: XrplCurrency;
  readonly side: ExecSide;
  /** Quantité de `base` à échanger. */
  readonly amountBase: number;
  /** Prix spot AMM (quote par base). */
  readonly ammPrice: number;
  /** Meilleur prix au carnet (quote par base) : ask si achat, bid si vente. */
  readonly bookPrice: number;
  /** Tolérance de slippage dans [0, 1) (ex. 0.01 = 1 %). */
  readonly slippageTolerance: number;
  readonly sourceTag: number;
}

export interface ExecutionPlan {
  /** Source affichant le meilleur prix au moment du plan (indicatif). */
  readonly venue: "amm" | "book";
  /** Meilleur prix retenu (quote par base). */
  readonly referencePrice: number;
  /** Prix limite après slippage : plafond (achat) ou plancher (vente). */
  readonly limitPrice: number;
  /** `OfferCreate` taggé prêt à signer (gives/wants bornés par le slippage). */
  readonly offer: OfferCreate;
}

const MAX_SLIPPAGE = 1; // exclu
const IOU_SIG_DIGITS = 15; // précision max d'un montant IOU XRPL

/** Sens d'arrondi : `down` = ce qu'on FOURNIT, `up` = ce qu'on EXIGE de recevoir. */
type Rounding = "down" | "up";

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidAmountError(`${label} doit être un nombre fini > 0: ${String(value)}`);
  }
}

/**
 * Sérialise un montant IOU en décimal propre : ≤ 15 chiffres significatifs et
 * SANS notation scientifique. `String(number)` brut produit sinon `"1.23e-10"`
 * ou `"0.30000000000000004"` (résidu binaire) → tx rejetée à la signature. On
 * arrondit à la précision IOU et on refuse bruyamment un exposant (plutôt qu'une
 * tx malformée signée silencieusement).
 */
function formatIouValue(value: number): string {
  const rounded = Number(value.toPrecision(IOU_SIG_DIGITS));
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new InvalidAmountError(`Montant IOU invalide: ${String(value)}`);
  }
  const text = rounded.toString();
  if (/[eE]/.test(text)) {
    throw new InvalidAmountError(
      `Montant IOU hors plage décimale représentable (exposant): ${text}`,
    );
  }
  return text;
}

/**
 * Convertit une quantité en `Amount` XRPL (drops pour XRP, IOU sinon). L'arrondi
 * des drops suit le sens : ce qu'on fournit est arrondi **vers le bas**, ce qu'on
 * exige **vers le haut** — jamais en défaveur de l'utilisateur (la borne de
 * slippage reste un vrai plafond/plancher, au drop près).
 */
function toAmount(value: number, currency: XrplCurrency, rounding: Rounding): Amount {
  assertPositive(value, `montant ${currency.currency}`);
  if (currency.currency === "XRP") {
    const scaled = value * DROPS_PER_XRP;
    const drops = rounding === "up" ? Math.ceil(scaled) : Math.floor(scaled);
    if (drops <= 0) {
      throw new InvalidAmountError(`Montant XRP arrondi à 0 drops: ${String(value)}`);
    }
    return String(drops);
  }
  if (currency.issuer === undefined) {
    throw new InvalidAmountError(`issuer requis pour le token ${currency.currency}`);
  }
  return {
    currency: currency.currency,
    issuer: currency.issuer,
    value: formatIouValue(value),
  };
}

/**
 * Planifie l'exécution d'un swap spot : compare le prix AMM et le carnet, retient
 * le meilleur, applique une borne de slippage et produit l'`OfferCreate` taggé.
 *
 * Note XRPL : sur le DEX natif, un `OfferCreate` croise AUTOMATIQUEMENT le carnet
 * ET l'AMM (XLS-30) au meilleur prix — on ne « route » donc pas l'exécution
 * nous-mêmes. Ce plan sert au **bornage du slippage** (limite gives/wants) et à
 * l'affichage du prix attendu ; `venue` indique juste quelle source cote le mieux.
 *
 * Achat : on FOURNIT au plus `amountBase × prix×(1+slippage)` de quote pour
 * `amountBase` de base. Vente : on FOURNIT `amountBase` de base contre au moins
 * `amountBase × prix×(1−slippage)` de quote. La limite protège l'utilisateur.
 */
export function planExecution(request: ExecutionRequest): ExecutionPlan {
  assertPositive(request.amountBase, "amountBase");
  assertPositive(request.ammPrice, "ammPrice");
  assertPositive(request.bookPrice, "bookPrice");
  if (
    !Number.isFinite(request.slippageTolerance) ||
    request.slippageTolerance < 0 ||
    request.slippageTolerance >= MAX_SLIPPAGE
  ) {
    throw new InvalidAmountError(
      `slippageTolerance hors [0, 1): ${String(request.slippageTolerance)}`,
    );
  }

  const buying = request.side === "buy";
  // Achat : meilleur = prix le plus BAS ; vente : meilleur = prix le plus HAUT.
  const ammBetter = buying
    ? request.ammPrice <= request.bookPrice
    : request.ammPrice >= request.bookPrice;
  const venue = ammBetter ? "amm" : "book";
  const referencePrice = buying
    ? Math.min(request.ammPrice, request.bookPrice)
    : Math.max(request.ammPrice, request.bookPrice);

  let limitPrice: number;
  let gives: Amount;
  let wants: Amount;
  if (buying) {
    limitPrice = referencePrice * (1 + request.slippageTolerance);
    // On fournit la quote (arrondi bas), on exige la base (arrondi haut).
    gives = toAmount(request.amountBase * limitPrice, request.quote, "down");
    wants = toAmount(request.amountBase, request.base, "up");
  } else {
    limitPrice = referencePrice * (1 - request.slippageTolerance);
    // On fournit la base (arrondi bas), on exige la quote (arrondi haut).
    gives = toAmount(request.amountBase, request.base, "down");
    wants = toAmount(request.amountBase * limitPrice, request.quote, "up");
  }

  const offer = buildLiveOffer({
    account: request.account,
    gives,
    wants,
    sourceTag: request.sourceTag,
  });
  return { venue, referencePrice, limitPrice, offer };
}
