import { randomBytes } from "node:crypto";
import { access, chmod, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "xrpl";

const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";
const DEFAULT_OUTPUT = ".env.paper-wallet-testnet";
const DEFAULT_PORT = 3100;

function outputPath(): string {
  const argument = process.argv.find((value) => value.startsWith("--output="));
  const requested = argument?.slice("--output=".length) ?? DEFAULT_OUTPUT;
  return resolve(process.cwd(), requested);
}

async function main(): Promise<void> {
  const destination = outputPath();
  let outputExists = true;
  try {
    await access(destination);
  } catch {
    outputExists = false;
  }
  if (outputExists) {
    throw new Error(`Le fichier ${destination} existe déjà; aucun compte Testnet n'a été créé`);
  }
  const client = new Client(TESTNET_WSS);
  await client.connect();
  try {
    const funder = await client.fundWallet(null, {
      amount: "1000",
      usageContext: "Tide Testnet wallet funder",
    });
    const issuer = await client.fundWallet(null, {
      amount: "1000",
      usageContext: "Tide Testnet NFT issuer",
    });
    if (funder.wallet.seed === undefined || issuer.wallet.seed === undefined) {
      throw new Error("Le faucet Testnet n'a pas retourné les seeds attendues");
    }
    const lines = [
      "# Généré localement par testnet:bootstrap-wallets. Ne jamais committer.",
      "NODE_ENV=development",
      `PORT=${String(DEFAULT_PORT)}`,
      "TIDE_DB_PATH=tide-paper-wallet-testnet.db",
      `TIDE_SESSION_SECRET=${randomBytes(32).toString("hex")}`,
      `TIDE_ADMIN_TOKEN=${randomBytes(24).toString("hex")}`,
      "TIDE_PAPER_WALLET_NETWORK=testnet",
      `TIDE_PAPER_WALLET_WSS_URL=${TESTNET_WSS}`,
      "TIDE_PAPER_WALLET_SOURCE_TAG=100",
      `TIDE_PAPER_WALLET_ISSUER_SEED=${issuer.wallet.seed}`,
      `TIDE_PAPER_WALLET_FUNDER_SEED=${funder.wallet.seed}`,
      `TIDE_PAPER_WALLET_KEY_MASTER=${randomBytes(32).toString("hex")}`,
      "TIDE_PAPER_WALLET_KEY_ID=paper-testnet-v1",
      `TIDE_PUBLIC_BASE_URL=http://127.0.0.1:${String(DEFAULT_PORT)}`,
      "TIDE_CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173",
      "",
    ];
    await writeFile(destination, lines.join("\n"), { encoding: "utf8", flag: "wx", mode: 0o600 });
    await chmod(destination, 0o600);
    console.log(`Configuration Testnet écrite dans ${destination} (permissions 0600).`);
    console.log(`Funder Testnet: ${funder.wallet.classicAddress}`);
    console.log(`Issuer / collecteur Testnet: ${issuer.wallet.classicAddress}`);
    console.log("Les seeds et le token admin restent uniquement dans le fichier local ignoré par Git.");
  } finally {
    await client.disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Bootstrap Testnet échoué");
  process.exitCode = 1;
});
