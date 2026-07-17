import "dotenv/config";
import { Client, Wallet, type AccountDelete, type NFTokenBurn } from "xrpl";
import { readMasterKey, decryptPrivateKey, type EncryptedPayload } from "@tide/mcp/crypto";
import * as env from "../config/env";
import { openDatabase } from "../store/sqlite";
import { SqlitePaperWalletStore } from "../store/sqlite-paper-wallet-store";

const ACCOUNT_DELETE_LEDGER_DELAY = 255;

function readUserId(argv: readonly string[]): string {
  const arg = argv.find((value) => value.startsWith("--user-id="));
  const userId = arg?.slice("--user-id=".length).trim() ?? "";
  if (!userId.startsWith("paper:") || userId.length < 16) {
    throw new Error("Usage: pnpm --filter @tide/api paper-wallet:reclaim -- --user-id=paper:...");
  }
  return userId;
}

function assertSuccess(meta: unknown, operation: string): void {
  if (
    typeof meta !== "object" ||
    meta === null ||
    (meta as Record<string, unknown>)["TransactionResult"] !== "tesSUCCESS"
  ) {
    throw new Error(`${operation} non validée: ${JSON.stringify(meta)}`);
  }
}

async function submit(
  client: Client,
  wallet: Wallet,
  tx: NFTokenBurn | AccountDelete,
  failHard = false,
): Promise<string> {
  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob, { failHard });
  assertSuccess(result.result.meta, tx.TransactionType);
  return result.result.hash;
}

async function main(): Promise<void> {
  const runtime = env.readPaperWalletRuntimeConfig();
  if (runtime === undefined) {
    throw new Error("Configuration wallet Paper Testnet incomplète");
  }

  const userId = readUserId(process.argv.slice(2));
  const store = new SqlitePaperWalletStore(openDatabase(env.readDbPath()));
  const record = await store.get(userId);
  if (record === null) throw new Error(`Aucun wallet Paper pour ${userId}`);
  if (record.status === "reclaimed") {
    console.log(JSON.stringify({ userId, status: "already_reclaimed" }));
    return;
  }

  const encrypted = JSON.parse(record.encryptedSeed) as EncryptedPayload;
  const seed = decryptPrivateKey(encrypted, readMasterKey(runtime.masterKeyHex));
  const wallet = Wallet.fromSeed(seed);
  if (wallet.classicAddress !== record.address) {
    throw new Error("La seed déchiffrée ne correspond pas à l'adresse persistée");
  }
  const destination = Wallet.fromSeed(runtime.funderSeed).classicAddress;
  const client = new Client(runtime.serverUrl);
  await client.connect();
  try {
    const owned = await client.request({
      command: "account_nfts",
      account: wallet.classicAddress,
      ledger_index: "validated",
      limit: 400,
    });
    if (owned.result.account_nfts.length > 0) {
      const burns: string[] = [];
      for (const nft of owned.result.account_nfts) {
        burns.push(
          await submit(client, wallet, {
            TransactionType: "NFTokenBurn",
            Account: wallet.classicAddress,
            NFTokenID: nft.NFTokenID,
            SourceTag: runtime.sourceTag,
          }),
        );
      }
      const account = await client.request({
        command: "account_info",
        account: wallet.classicAddress,
        ledger_index: "validated",
      });
      console.log(JSON.stringify({
        userId,
        address: wallet.classicAddress,
        status: "nfts_burned_wait_before_delete",
        burnTxHashes: burns,
        deleteEligibleFromLedger:
          account.result.account_data.Sequence + ACCOUNT_DELETE_LEDGER_DELAY,
      }));
      return;
    }

    const [account, ledger, server] = await Promise.all([
      client.request({
        command: "account_info",
        account: wallet.classicAddress,
        ledger_index: "validated",
      }),
      client.request({ command: "ledger_current" }),
      client.request({ command: "server_info" }),
    ]);
    const info = account.result.account_data;
    if (info.OwnerCount !== 0) {
      throw new Error(`Suppression refusée: ${String(info.OwnerCount)} objet(s) XRPL restant(s)`);
    }
    const eligibleLedger = info.Sequence + ACCOUNT_DELETE_LEDGER_DELAY;
    if (ledger.result.ledger_current_index < eligibleLedger) {
      console.log(JSON.stringify({
        userId,
        address: wallet.classicAddress,
        status: "waiting",
        currentLedger: ledger.result.ledger_current_index,
        deleteEligibleFromLedger: eligibleLedger,
      }));
      return;
    }
    const reserve = server.result.info.validated_ledger?.reserve_inc_xrp;
    if (reserve === undefined) throw new Error("Owner reserve Testnet indisponible");
    const feeDrops = String(Math.ceil(reserve * 1_000_000));
    const deleteHash = await submit(
      client,
      wallet,
      {
        TransactionType: "AccountDelete",
        Account: wallet.classicAddress,
        Destination: destination,
        SourceTag: runtime.sourceTag,
        Fee: feeDrops,
      },
      true,
    );
    await store.markReclaimed(userId);
    const balanceBefore = Number(info.Balance) / 1_000_000;
    const feeXrp = Number(feeDrops) / 1_000_000;
    console.log(JSON.stringify({
      userId,
      address: wallet.classicAddress,
      status: "reclaimed",
      destination,
      deleteTxHash: deleteHash,
      recoveredXrpEstimate: Math.max(0, balanceBefore - feeXrp),
      recoveryRatioEstimate: balanceBefore === 0 ? 0 : (balanceBefore - feeXrp) / balanceBefore,
    }));
  } finally {
    await client.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
