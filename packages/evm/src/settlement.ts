import { positionPnl } from "@tide/core";
import type { Position } from "@tide/core";
import { SettlementError } from "./errors";
import { toBaseUnits, signedToBaseUnits } from "./units";
import type { CloseSettlement, OpenSettlement } from "./types";

/**
 * Traduit les mouvements de compta du domaine (PnL en `number`) en arguments
 * entiers exacts pour `MarginVault` on-chain. C'est le pont off-chain → vault :
 * le backend calcule la décision (matching/PnL), ce module la sérialise en
 * unités de base, le service de soumission appelle le contrat.
 */

/** Args pour `openAccounting` : marge + frais d'ouverture en unités de base. */
export function computeOpenSettlement(
  margin: number,
  fee: number,
  decimals: number,
): OpenSettlement {
  if (!Number.isFinite(margin) || margin < 0) {
    throw new SettlementError(`Marge invalide: ${String(margin)}`);
  }
  if (!Number.isFinite(fee) || fee < 0) {
    throw new SettlementError(`Frais invalides: ${String(fee)}`);
  }
  return { marginBase: toBaseUnits(margin, decimals), feeBase: toBaseUnits(fee, decimals) };
}

/**
 * Args pour `closeAccounting` : marge à libérer + PnL réalisé signé, en unités
 * de base. Le PnL est **plafonné à -marge** (isolated, miroir de la compta
 * backend) ; le garde-fou final garantit qu'en entiers la perte ne dépasse
 * jamais la marge libérée. Lève `InvalidPriceError` (via `positionPnl`) si le
 * prix de sortie est aberrant.
 */
export function computeCloseSettlement(
  position: Position,
  exitPrice: number,
  decimals: number,
): CloseSettlement {
  const raw = positionPnl(position, exitPrice);
  const capped = raw < -position.margin ? -position.margin : raw;
  const marginReleaseBase = toBaseUnits(position.margin, decimals);
  const pnlBase = signedToBaseUnits(capped, decimals);
  // La troncature monotone + le cap garantissent déjà pnlBase >= -marginReleaseBase ;
  // garde-fou explicite contre tout écart d'arrondi résiduel.
  if (pnlBase < -marginReleaseBase) {
    return { marginReleaseBase, pnlBase: -marginReleaseBase };
  }
  return { marginReleaseBase, pnlBase };
}
