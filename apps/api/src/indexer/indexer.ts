import type { PriceMap } from "@tide/core";
import type { AccountTxOptions, AccountTxPage, ObservedTx, TaggedTx } from "@tide/xrpl";
import { extractTaggedTxs } from "@tide/xrpl";
import type { FeedLogger } from "../feed/compose-price";
import { normalizeVolume } from "./normalize-volume";

/** Lecture `account_tx` (la classe `XrplClient` de `@tide/xrpl` la satisfait). */
export interface AccountTxReader {
  accountTx(account: string, options?: AccountTxOptions): Promise<AccountTxPage>;
}

/** Persistance d'une tx observée (le `SqliteAttributionStore` la satisfait). */
export interface AttributionRecorder {
  record(tx: ObservedTx): void;
}

export interface IndexerConfig {
  /**
   * Comptes à scanner. Le prize pool capte les buy-ins (`Payment` taggés), mais
   * les swaps Live (`OfferCreate`) se signent sur le compte du JOUEUR : il faut
   * donc inclure les comptes joueurs Live connus pour mesurer le volume de
   * trading. Alternative future : lire le flux de ledgers et filtrer le SourceTag.
   */
  readonly accounts: readonly string[];
  /** SourceTag de Tide (attribution). */
  readonly sourceTag: number;
  /** Devise de référence pour le volume normalisé. */
  readonly referenceCurrency: string;
  /** Ledger de départ (ne pas réindexer toute l'histoire). Défaut : 0. */
  readonly startLedger?: number;
}

export interface IndexerDeps {
  readonly client: AccountTxReader;
  readonly recorder: AttributionRecorder;
  /** Instantané de prix courant (feed) pour la normalisation du volume. */
  readonly getPrices: () => PriceMap;
  /** Journal (replis volume, trous, pagination tronquée) — sinon silencieux. */
  readonly logger?: FeedLogger;
}

export interface SyncResult {
  /** Nombre de tx taggées enregistrées lors de ce sync. */
  readonly recorded: number;
  /** Tx taggées inexploitables ignorées (trou signalé, pas avalé). */
  readonly skippedTagged: number;
  /** Curseur de ledger après ce sync. */
  readonly cursor: number;
}

/** Garde-fou anti-boucle de pagination (un marker qui ne se vide jamais). */
const MAX_PAGES = 200;

/**
 * Borne haute de ledger figée pour un `sync()` : fixée une seule fois (sur la 1re
 * page lue) puis réutilisée sur toutes les pages et tous les comptes, pour une
 * fenêtre de pagination stable.
 */
class FrozenWindow {
  private high: number | undefined = undefined;

  value(): number | undefined {
    return this.high;
  }

  freeze(ledgerIndexMax: number): void {
    if (this.high === undefined) {
      this.high = ledgerIndexMax;
    }
  }
}

/**
 * Indexeur d'attribution : lit les transactions taggées d'un compte on-chain,
 * normalise leur volume (point unique via le feed) et les persiste pour le calcul
 * des métriques du hackathon.
 *
 * Anti-double-comptage ET anti-miss :
 * - chaque `sync()` lit depuis `cursor + 1` et **fige la borne haute** sur la 1re
 *   page (`ledgerIndexMax`), qu'il réutilise sur toutes les pages et tous les
 *   comptes : sans ça, le serveur viserait le dernier ledger validé, qui bouge
 *   pendant la pagination (fenêtre mouvante → miss/recompte) ;
 * - **pagine entièrement** (suit le `marker`) avant d'avancer le curseur à la
 *   borne figée ;
 * - le store dé-duplique par hash (idempotent) → le redémarrage de l'indexeur ne
 *   double-compte pas, même si le curseur (en mémoire) repart de `startLedger`.
 */
export class AttributionIndexer {
  private readonly deps: IndexerDeps;
  private readonly config: IndexerConfig;
  private cursor: number;

  constructor(deps: IndexerDeps, config: IndexerConfig) {
    this.deps = deps;
    this.config = config;
    this.cursor = (config.startLedger ?? 0) - 1;
  }

  /** Plus haut ledger déjà indexé (curseur courant). */
  get ledgerCursor(): number {
    return this.cursor;
  }

  async sync(): Promise<SyncResult> {
    const prices = this.deps.getPrices();
    const window = new FrozenWindow();
    let recorded = 0;
    let skippedTagged = 0;

    for (const account of this.config.accounts) {
      const counts = await this.syncAccount(account, prices, window);
      recorded += counts.recorded;
      skippedTagged += counts.skippedTagged;
    }

    if (skippedTagged > 0) {
      this.deps.logger?.warn(
        `indexeur: ${String(skippedTagged)} tx taggées inexploitables ignorées`,
      );
    }
    const high = window.value();
    if (high !== undefined && high > this.cursor) {
      this.cursor = high;
    }
    return { recorded, skippedTagged, cursor: this.cursor };
  }

  private async syncAccount(
    account: string,
    prices: PriceMap,
    window: FrozenWindow,
  ): Promise<{ recorded: number; skippedTagged: number }> {
    let recorded = 0;
    let skippedTagged = 0;
    let marker: unknown = undefined;
    let pages = 0;

    do {
      const high = window.value();
      const page = await this.deps.client.accountTx(account, {
        ledgerIndexMin: this.cursor + 1,
        ...(high !== undefined ? { ledgerIndexMax: high } : {}),
        marker,
      });
      if (window.value() === undefined) {
        window.freeze(page.ledgerIndexMax);
        if (page.ledgerIndexMax < this.cursor + 1) {
          this.deps.logger?.warn(
            `indexeur: ledgerIndexMax (${String(page.ledgerIndexMax)}) < curseur+1 — nœud à historique partiel ?`,
          );
        }
      }

      const extracted = extractTaggedTxs(page.transactions, this.config.sourceTag);
      for (const tx of extracted.txs) {
        this.deps.recorder.record({
          account: tx.account,
          sourceTag: tx.sourceTag,
          volume: this.safeVolume(tx, prices),
          ledgerIndex: tx.ledgerIndex,
          hash: tx.hash,
        });
        recorded += 1;
      }
      skippedTagged += extracted.skippedTagged;

      const previousMarker = marker;
      marker = page.marker;
      pages += 1;
      if (marker !== undefined && marker === previousMarker) {
        this.deps.logger?.warn(
          `indexeur: marker répété pour ${account} — arrêt de la pagination`,
        );
        break;
      }
      if (pages >= MAX_PAGES && marker !== undefined) {
        this.deps.logger?.warn(
          `indexeur: pagination tronquée à ${String(MAX_PAGES)} pages (${account}) — sync incomplet`,
        );
        break;
      }
    } while (marker !== undefined);

    return { recorded, skippedTagged };
  }

  /** Volume normalisé, conservateur : prix manquant → 0 journalisé (pas inventé). */
  private safeVolume(tx: TaggedTx, prices: PriceMap): number {
    try {
      return normalizeVolume(tx, prices, this.config.referenceCurrency);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.deps.logger?.warn(
        `indexeur: volume non normalisable (${reason}) pour ${tx.account}, compté à 0`,
      );
      return 0;
    }
  }
}
