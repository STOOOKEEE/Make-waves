import type { VolumeTradeEval, VolumeTradeInputs } from "./evaluate";
import { evaluateVolumeTrade } from "./evaluate";
import { InvalidAmountError } from "../errors";

export interface VolumeEngineConfig {
  /** Activation EXPLICITE du moteur (défaut produit : désactivé). */
  readonly enabled: boolean;
  /** L'orga a CONFIRMÉ que le volume self-généré compte pour l'attribution. */
  readonly selfGeneratedAttributionConfirmed: boolean;
  /** Edge net minimal exigé pour trader (marge de sécurité au-dessus de 0). */
  readonly minNetEdge: number;
}

export type VolumePlan =
  | { readonly action: "skip"; readonly reason: string }
  | { readonly action: "trade"; readonly evaluation: VolumeTradeEval };

/**
 * Décide s'il faut générer un round-trip de volume taggé.
 *
 * GARDE-FOU DUR — refuse (`skip`) tant que l'UNE de ces conditions n'est pas
 * remplie, dans cet ordre :
 * 1. le moteur n'est pas explicitement activé (défaut = OFF) ;
 * 2. l'orga n'a pas confirmé que le volume self-généré est attribué (sinon on
 *    paierait des frais pour un volume qui ne compte même pas) ;
 * 3. l'edge net n'atteint pas la marge minimale (`netEdge < minNetEdge` → skip ;
 *    `netEdge ≥ minNetEdge` → trade) → **ne jamais wash-trader à perte** (cf.
 *    SPEC §9, garde-fou quant de la roadmap).
 *
 * `minNetEdge` DOIT être fini ≥ 0 (sinon le garde-fou serait contournable : une
 * marge négative autoriserait un edge négatif, donc une perte). On le rejette à
 * la source. Ne fait que DÉCIDER ; construction/soumission d'ordre ailleurs (F5/F8).
 */
export function planVolumeTrade(
  config: VolumeEngineConfig,
  inputs: VolumeTradeInputs,
): VolumePlan {
  if (!Number.isFinite(config.minNetEdge) || config.minNetEdge < 0) {
    throw new InvalidAmountError(
      `minNetEdge doit être fini ≥ 0 (une marge négative autoriserait une perte): ${String(config.minNetEdge)}`,
    );
  }
  if (!config.enabled) {
    return { action: "skip", reason: "moteur de volume désactivé" };
  }
  if (!config.selfGeneratedAttributionConfirmed) {
    return {
      action: "skip",
      reason: "volume self-généré non confirmé par l'orga (ne pas payer pour rien)",
    };
  }
  const evaluation = evaluateVolumeTrade(inputs);
  if (evaluation.netEdge < config.minNetEdge) {
    return {
      action: "skip",
      reason: `edge net ${String(evaluation.netEdge)} < marge minimale ${String(config.minNetEdge)} (ne pas wash-trader à perte)`,
    };
  }
  return { action: "trade", evaluation };
}
