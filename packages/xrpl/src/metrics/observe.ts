import type { Amount } from "xrpl";
import { assertAttributionTag } from "../tx/source-tag";
import { isAmount } from "../client/parse";

/**
 * Transaction taggée extraite d'une réponse `account_tx`, réduite aux champs
 * utiles à l'attribution. Le `volume` n'est PAS calculé ici : la normalisation
 * en devise de référence (drops/IOU, prix) est le point unique de l'indexeur
 * (via le feed de prix) — ce module reste pur et sans notion de prix.
 */
export interface TaggedTx {
  readonly account: string;
  readonly sourceTag: number;
  readonly ledgerIndex: number;
  readonly transactionType: string;
  /** Hash de la tx (clé d'idempotence pour le store). */
  readonly hash: string;
  /** Montant d'un `Payment` (buy-in). */
  readonly amount?: Amount;
  /** Montant fourni d'un `OfferCreate` (swap). */
  readonly takerGets?: Amount;
  /** Montant demandé d'un `OfferCreate` (swap). */
  readonly takerPays?: Amount;
}

/** Résultat d'extraction : tx retenues + nombre d'entrées ignorées par catégorie. */
export interface ExtractResult {
  readonly txs: TaggedTx[];
  /** Entrées portant NOTRE SourceTag mais inexploitables (champ critique manquant). */
  readonly skippedTagged: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Transaction interne d'une entrée account_tx (v2 `tx_json`, v1 `tx`). */
function innerTx(wrapper: Record<string, unknown>): Record<string, unknown> | undefined {
  return asRecord(wrapper["tx_json"]) ?? asRecord(wrapper["tx"]);
}

function optionalAmount(value: unknown): Amount | undefined {
  return isAmount(value) ? value : undefined;
}

/** Statut final d'une entrée : appliquée avec succès et validée ? */
function isAppliedSuccess(wrapper: Record<string, unknown>): boolean {
  const meta = asRecord(wrapper["meta"]);
  return (
    wrapper["validated"] === true &&
    meta !== undefined &&
    meta["TransactionResult"] === "tesSUCCESS"
  );
}

/** Statut lisible (meta object présent) ? Sinon on ne peut pas trancher le succès. */
function statusKnown(wrapper: Record<string, unknown>): boolean {
  return asRecord(wrapper["meta"]) !== undefined;
}

/**
 * Extrait les transactions portant le `SourceTag` de Tide depuis une liste
 * d'entrées `account_tx` (forme brute, réseau non fiable → parsing défensif).
 *
 * Ne retient QUE les tx **appliquées avec succès et validées** (`validated` +
 * `meta.TransactionResult === "tesSUCCESS"`) portant notre `SourceTag` : une tx
 * échouée (`tec*`) ou non validée porte le tag mais n'a aucun effet on-chain —
 * la compter gonflerait artificiellement volume et comptes actifs (le compteur
 * de l'orga, lui, ne compte que les tx appliquées). Une tx échouée est donc
 * **ignorée** (pas un trou). En revanche une tx à NOTRE tag, validée, mais dont
 * le statut est illisible ou à laquelle il manque un champ critique (Account,
 * ledger, type, hash) est **comptée comme ignorée** (`skippedTagged`) : un trou
 * signalé plutôt qu'un sous-comptage muet.
 *
 * Rejette `tideSourceTag = 0` (agréger sur 0 = compter les tx non taggées).
 */
export function extractTaggedTxs(
  transactions: readonly unknown[],
  tideSourceTag: number,
): ExtractResult {
  assertAttributionTag(tideSourceTag);

  const txs: TaggedTx[] = [];
  let skippedTagged = 0;

  for (const entry of transactions) {
    const wrapper = asRecord(entry);
    if (wrapper === undefined) {
      continue;
    }
    const tx = innerTx(wrapper);
    if (tx === undefined) {
      continue;
    }
    if (tx["SourceTag"] !== tideSourceTag) {
      continue; // pas à nous : ignoré normalement (pas compté comme trou)
    }

    // Statut illisible (meta absente/binaire) sur une tx taggée = trou signalé.
    if (!statusKnown(wrapper)) {
      skippedTagged += 1;
      continue;
    }
    // Tx échouée ou non validée : porte notre tag mais sans effet → non comptée.
    if (!isAppliedSuccess(wrapper)) {
      continue;
    }

    const account = tx["Account"];
    const ledgerIndex = wrapper["ledger_index"];
    const transactionType = tx["TransactionType"];
    const hash = wrapper["hash"] ?? tx["hash"];
    if (
      typeof account !== "string" ||
      typeof ledgerIndex !== "number" ||
      typeof transactionType !== "string" ||
      typeof hash !== "string"
    ) {
      skippedTagged += 1; // succès mais inexploitable → trou signalé, pas avalé
      continue;
    }

    txs.push({
      account,
      sourceTag: tideSourceTag,
      ledgerIndex,
      transactionType,
      hash,
      amount: optionalAmount(tx["Amount"]),
      takerGets: optionalAmount(tx["TakerGets"]),
      takerPays: optionalAmount(tx["TakerPays"]),
    });
  }

  return { txs, skippedTagged };
}
