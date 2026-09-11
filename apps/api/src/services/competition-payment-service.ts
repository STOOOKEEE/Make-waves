import { Client, convertHexToString, Wallet } from "xrpl";
import type { Payment } from "xrpl";
import {
  buildBuyInPayment,
  buildPayoutPayments,
  MEMO_TYPE_JOIN,
} from "@tide/xrpl";
import type { CompetitionDefinition } from "../store/competition-store";
import { CompetitionPaymentInvalidError } from "./errors";

const VALIDATION_ATTEMPTS = 4;
const VALIDATION_RETRY_MS = 750;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function decodeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return convertHexToString(value);
  } catch {
    return null;
  }
}

function hasJoinMemo(tx: Record<string, unknown>, competitionId: string): boolean {
  const memos = tx["Memos"];
  if (!Array.isArray(memos)) return false;
  return memos.some((wrapper) => {
    const memo = asRecord(asRecord(wrapper)?.["Memo"]);
    return (
      decodeHex(memo?.["MemoType"]) === MEMO_TYPE_JOIN &&
      decodeHex(memo?.["MemoData"]) === competitionId
    );
  });
}

/** Parse défensif pur d'une réponse `tx`, exporté pour les tests de sécurité. */
export function assertVerifiedCompetitionEntry(
  rawResult: unknown,
  expected: Payment,
  competitionId: string,
): void {
  const result = asRecord(rawResult);
  const tx = asRecord(result?.["tx_json"]) ?? result;
  const meta = asRecord(result?.["meta"]);
  if (
    result?.["validated"] !== true ||
    meta?.["TransactionResult"] !== "tesSUCCESS"
  ) {
    throw new CompetitionPaymentInvalidError(
      "Le ticket n'est pas validé avec tesSUCCESS",
    );
  }
  if (
    tx?.["TransactionType"] !== "Payment" ||
    tx["Account"] !== expected.Account ||
    tx["Destination"] !== expected.Destination ||
    tx["Amount"] !== expected.Amount ||
    tx["SourceTag"] !== expected.SourceTag ||
    !hasJoinMemo(tx, competitionId)
  ) {
    throw new CompetitionPaymentInvalidError(
      "La transaction ne correspond pas au ticket de cette compétition",
    );
  }
}

export interface CompetitionPaymentConfig {
  readonly serverUrl: string;
  readonly prizePoolAddress: string;
  readonly sourceTag: number;
  /** Injecté par les tests ; le runtime utilise un Client XRPL réel. */
  readonly clientFactory?: () => CompetitionLedgerClient;
}

export interface CompetitionLedgerClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  autofill(transaction: Payment): Promise<Payment>;
  submitAndWait(txBlob: string): Promise<{
    readonly result: { readonly hash: string; readonly meta?: unknown };
  }>;
}

/**
 * Frontière XRPL des tickets : construit le Payment sans faire confiance au
 * montant du client, puis confirme la transaction dans un ledger validé avant
 * que CompetitionService n'ajoute l'entrée.
 */
export class CompetitionPaymentService {
  constructor(private readonly config: CompetitionPaymentConfig) {}

  entryPayment(account: string, competition: CompetitionDefinition): Payment {
    return buildBuyInPayment({
      account,
      destination: this.config.prizePoolAddress,
      amount: String(Math.round(competition.buyIn * 1_000_000)),
      sourceTag: this.config.sourceTag,
      competitionId: competition.id,
    });
  }

  winnerPayout(
    competitionId: string,
    winnerAddress: string,
    potXrp: number,
  ): Payment {
    const tx = buildPayoutPayments({
      from: this.config.prizePoolAddress,
      recipients: [{ address: winnerAddress, amount: potXrp }],
      currency: { currency: "XRP" },
      sourceTag: this.config.sourceTag,
      competitionId,
    })[0];
    if (tx === undefined) {
      throw new CompetitionPaymentInvalidError("Le payout calculé est nul");
    }
    return tx;
  }

  /** Soumet le ticket exact depuis un seed Paper conservé côté serveur. */
  async submitManagedEntry(
    seed: string,
    competition: CompetitionDefinition,
  ): Promise<{ readonly account: string; readonly hash: string }> {
    let wallet: Wallet;
    try {
      wallet = Wallet.fromSeed(seed);
    } catch {
      throw new CompetitionPaymentInvalidError("Seed Paper invalide");
    }
    const expected = this.entryPayment(wallet.classicAddress, competition);
    const client =
      this.config.clientFactory?.() ??
      (new Client(this.config.serverUrl) as unknown as CompetitionLedgerClient);
    try {
      await client.connect();
      const prepared = await client.autofill(expected);
      const preparedRecord = asRecord(prepared);
      if (
        preparedRecord?.["TransactionType"] !== "Payment" ||
        preparedRecord["Account"] !== expected.Account ||
        preparedRecord["Destination"] !== expected.Destination ||
        preparedRecord["Amount"] !== expected.Amount ||
        preparedRecord["SourceTag"] !== expected.SourceTag ||
        !hasJoinMemo(preparedRecord, competition.id)
      ) {
        throw new CompetitionPaymentInvalidError(
          "Le ticket Paper préparé ne correspond pas à la compétition",
        );
      }
      const signed = wallet.sign(prepared);
      const submitted = await client.submitAndWait(signed.tx_blob);
      const meta = submitted.result.meta;
      if (
        typeof meta !== "object" ||
        meta === null ||
        (meta as { readonly TransactionResult?: unknown }).TransactionResult !== "tesSUCCESS"
      ) {
        throw new CompetitionPaymentInvalidError("Le ticket Paper a été refusé par le ledger");
      }
      return { account: wallet.classicAddress, hash: submitted.result.hash };
    } catch (error) {
      if (error instanceof CompetitionPaymentInvalidError) throw error;
      throw new CompetitionPaymentInvalidError("Soumission du ticket Paper impossible");
    } finally {
      if (client.isConnected()) await client.disconnect();
    }
  }

  async verifyEntry(
    txHash: string,
    account: string,
    competition: CompetitionDefinition,
  ): Promise<void> {
    if (!/^[A-Fa-f0-9]{64}$/.test(txHash)) {
      throw new CompetitionPaymentInvalidError("Hash de ticket XRPL invalide");
    }
    const expected = this.entryPayment(account, competition);
    const client = new Client(this.config.serverUrl);
    try {
      await client.connect();
      for (let attempt = 0; attempt < VALIDATION_ATTEMPTS; attempt += 1) {
        let ledgerValidated = false;
        try {
          const response = await client.request({
            command: "tx",
            transaction: txHash,
            binary: false,
          });
          ledgerValidated = asRecord(response.result)?.["validated"] === true;
          if (ledgerValidated) {
            // Dès qu'un ledger a validé la transaction, une différence de
            // montant/destination/tag/memo est définitive et ne doit pas être
            // masquée par les retries.
            assertVerifiedCompetitionEntry(response.result, expected, competition.id);
            return;
          }
        } catch (error) {
          if (ledgerValidated && error instanceof CompetitionPaymentInvalidError) {
            throw error;
          }
          // `txnNotFound` juste après la signature est courant : le nœud peut
          // ne pas avoir encore fermé le ledger. On réessaie brièvement.
        }
        if (attempt + 1 < VALIDATION_ATTEMPTS) {
          await new Promise<void>((resolve) => setTimeout(resolve, VALIDATION_RETRY_MS));
        }
      }
      throw new CompetitionPaymentInvalidError(
        "Le ticket XRPL n'est pas encore visible dans un ledger validé",
      );
    } catch (error) {
      if (error instanceof CompetitionPaymentInvalidError) throw error;
      throw new CompetitionPaymentInvalidError("Ticket XRPL introuvable ou illisible");
    } finally {
      if (client.isConnected()) await client.disconnect();
    }
  }
}
