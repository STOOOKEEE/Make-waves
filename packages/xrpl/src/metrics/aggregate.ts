import { assertAttributionTag } from "../tx/source-tag";
import { InvalidMetricError } from "../errors";
import type { AttributionMetrics, ObservedTx } from "./types";

/**
 * Agrège les métriques d'attribution de Tide à partir de transactions observées.
 * Ne retient que celles portant `tideSourceTag`, somme le volume, compte les
 * comptes actifs **distincts** et les transactions.
 *
 * Pur. Lève `InvalidMetricError` si une tx attribuée a un volume aberrant
 * (non fini ou négatif) : une métrique fausse vaut moins que pas de métrique.
 * Rejette `tideSourceTag = 0` (`assertAttributionTag`) : agréger sur 0 compterait
 * les tx non taggées comme nôtres (faux positif sur la métrique reine).
 */
export function aggregateAttribution(
  txs: readonly ObservedTx[],
  tideSourceTag: number,
): AttributionMetrics {
  assertAttributionTag(tideSourceTag);

  let totalVolume = 0;
  let txCount = 0;
  const accounts = new Set<string>();

  for (const tx of txs) {
    if (tx.sourceTag !== tideSourceTag) {
      continue;
    }
    if (!Number.isFinite(tx.volume) || tx.volume < 0) {
      throw new InvalidMetricError(
        `Volume invalide pour ${tx.account}: ${String(tx.volume)}`,
      );
    }
    totalVolume += tx.volume;
    txCount += 1;
    accounts.add(tx.account);
  }

  return { totalVolume, activeAccounts: accounts.size, txCount };
}

/**
 * Restreint des transactions à une fenêtre de ledgers [from, to] (inclus), pour
 * calculer des métriques sur une période (ex. leaderboard hebdomadaire).
 * Lève `InvalidMetricError` si la plage est incohérente.
 */
export function filterByLedgerRange(
  txs: readonly ObservedTx[],
  fromLedger: number,
  toLedger: number,
): ObservedTx[] {
  if (
    !Number.isInteger(fromLedger) ||
    !Number.isInteger(toLedger) ||
    fromLedger < 0 ||
    toLedger < fromLedger
  ) {
    throw new InvalidMetricError(
      `Plage de ledgers invalide: [${String(fromLedger)}, ${String(toLedger)}]`,
    );
  }
  return txs.filter(
    (tx) => tx.ledgerIndex >= fromLedger && tx.ledgerIndex <= toLedger,
  );
}
