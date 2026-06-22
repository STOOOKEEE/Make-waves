import { InvalidAmountError } from "../errors";

export interface VolumeTradeInputs {
  /** Taille du round-trip (devise de référence). */
  readonly notional: number;
  /** Spread relatif du carnet (ex. 0.002 = 0,2 %). */
  readonly relativeSpread: number;
  /** Frais de trading AMM par jambe (ex. 0.003). */
  readonly ammFeeRate: number;
  /** Frais réseau fixes par transaction (devise de référence). */
  readonly txFee: number;
  /**
   * Coût de slippage / impact de marché RELATIF par jambe (ex. 0.001). Toujours
   * un coût sur un round-trip, et croît avec la taille : à estimer depuis la
   * profondeur du carnet/pool, jamais 0 pour une taille non négligeable.
   */
  readonly slippageRate: number;
  /** Incitation/rebate par unité de volume généré (0 si aucune). */
  readonly rebateRate: number;
}

export interface VolumeCost {
  readonly spreadCost: number;
  readonly ammCost: number;
  readonly txCost: number;
  readonly slippageCost: number;
  readonly rebate: number;
}

export interface VolumeTradeEval {
  /** Strictement rentable (netEdge > 0) ? */
  readonly profitable: boolean;
  /** Gain net attendu ; négatif = perte = wash-trading. */
  readonly netEdge: number;
  readonly cost: VolumeCost;
}

function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidAmountError(`${label} doit être fini ≥ 0: ${String(value)}`);
  }
}

/**
 * Évalue l'edge net d'un round-trip de volume auto-généré.
 *
 * Un aller-retour (acheter puis revendre) paie : le **spread** (une fois sur le
 * round-trip — `relativeSpread` est le spread complet ask−bid/mid), les **frais
 * AMM** (2 jambes), les **frais réseau** (2 tx) et le **slippage/impact de
 * marché** (2 jambes, croît avec la taille) ; il ne rapporte que d'éventuelles
 * **incitations**. Sans rebate supérieur à ces coûts, générer du volume revient
 * à **perdre de l'argent** (wash-trading). Pur ; la qualité de la décision
 * dépend d'un `slippageRate` réaliste (sous-estimé = on croit être +EV à tort).
 */
export function evaluateVolumeTrade(inputs: VolumeTradeInputs): VolumeTradeEval {
  assertNonNegative(inputs.notional, "notional");
  assertNonNegative(inputs.relativeSpread, "relativeSpread");
  assertNonNegative(inputs.ammFeeRate, "ammFeeRate");
  assertNonNegative(inputs.txFee, "txFee");
  assertNonNegative(inputs.slippageRate, "slippageRate");
  assertNonNegative(inputs.rebateRate, "rebateRate");

  const spreadCost = inputs.notional * inputs.relativeSpread;
  const ammCost = inputs.notional * inputs.ammFeeRate * 2;
  const txCost = inputs.txFee * 2;
  const slippageCost = inputs.notional * inputs.slippageRate * 2;
  const rebate = inputs.notional * inputs.rebateRate;
  const netEdge = rebate - (spreadCost + ammCost + txCost + slippageCost);

  return {
    profitable: netEdge > 0,
    netEdge,
    cost: { spreadCost, ammCost, txCost, slippageCost, rebate },
  };
}
