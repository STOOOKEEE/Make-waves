import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  toHex,
  type Abi,
  type Address,
  type Chain,
  type PublicClient,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import type { Position } from "@tide/core";
import { SettlementService, createViemVaultClient } from "../src/index";

/**
 * Test e2e « inject » du flux perp on-chain complet contre une vraie EVM (anvil) :
 * deposit → open → close(gain) → collateralOf → withdraw, à travers l'adaptateur
 * viem réel + `SettlementService`, plus la garantie anti-rejeu (rejouer une clé
 * d'idempotence → revert, pas de double-lock).
 *
 * Dépend du binaire `anvil` (Foundry) et des artefacts `packages/contracts/out/`
 * (produits par `forge build`). En leur absence, la suite **skip proprement** :
 * le `pnpm test` standard reste vert sans Foundry. Lancement manuel :
 *   (cd packages/contracts && forge build) && pnpm exec vitest run packages/evm/test/viem-vault-client.e2e.test.ts
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../contracts/out");
const VAULT_ARTIFACT = resolve(OUT, "MarginVault.sol/MarginVault.json");
const TOKEN_ARTIFACT = resolve(OUT, "MockERC20.sol/MockERC20.json");

const MNEMONIC = "test test test test test test test test test test test junk";
const PORT = 8555;
const RPC = `http://127.0.0.1:${String(PORT)}`;
const CHAIN_ID = 31337;

function anvilInstalled(): boolean {
  try {
    execSync("anvil --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// anvil suffit : `beforeAll` (re)compile les contrats, donc pas de faux résultat
// sur un `out/` périmé (les artefacts sont toujours frais quand la suite tourne).
const CAN_RUN = anvilInstalled();

interface Artifact {
  readonly abi: Abi;
  readonly bytecode: { readonly object: `0x${string}` };
}

function loadArtifact(path: string): Artifact {
  return JSON.parse(readFileSync(path, "utf8")) as Artifact;
}

function privateKeyAt(index: number): `0x${string}` {
  const pk = mnemonicToAccount(MNEMONIC, { addressIndex: index }).getHdKey().privateKey;
  if (pk === null) throw new Error("clé privée dérivée absente");
  return toHex(pk);
}

const chain: Chain = defineChain({
  id: CHAIN_ID,
  name: "anvil-e2e",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

function walletAt(index: number) {
  return createWalletClient({
    account: mnemonicToAccount(MNEMONIC, { addressIndex: index }),
    chain,
    transport: http(RPC),
  });
}

async function waitReady(client: PublicClient, tries = 50): Promise<void> {
  for (let i = 0; i < tries; i++) {
    try {
      await client.getBlockNumber();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("anvil n'a pas démarré à temps");
}

describe.skipIf(!CAN_RUN)("createViemVaultClient (e2e anvil)", () => {
  let anvil: ChildProcess;
  let publicClient: PublicClient;
  let vaultAddress: Address;
  let tokenAddress: Address;
  let vaultAbi: Abi;
  let tokenAbi: Abi;

  const ownerAddr = mnemonicToAccount(MNEMONIC, { addressIndex: 0 }).address;
  const operatorAddr = mnemonicToAccount(MNEMONIC, { addressIndex: 1 }).address;
  const traderAddr = mnemonicToAccount(MNEMONIC, { addressIndex: 2 }).address;

  beforeAll(async () => {
    // Artefacts toujours à jour vs MarginVault.sol (sinon test contre un vieux bytecode).
    execSync("forge build", { cwd: resolve(HERE, "../../contracts"), stdio: "ignore" });
    anvil = spawn("anvil", ["--port", String(PORT), "--silent"], { stdio: "ignore" });
    publicClient = createPublicClient({ chain, transport: http(RPC) });
    await waitReady(publicClient);

    const vaultArt = loadArtifact(VAULT_ARTIFACT);
    const tokenArt = loadArtifact(TOKEN_ARTIFACT);
    vaultAbi = vaultArt.abi;
    tokenAbi = tokenArt.abi;

    const owner = walletAt(0);

    // Déploie MockERC20 (proxy RLUSD, 18 déc.).
    const tokenHash = await owner.deployContract({ abi: tokenAbi, bytecode: tokenArt.bytecode.object });
    const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
    tokenAddress = tokenReceipt.contractAddress as Address;

    // Déploie MarginVault(token, operator, owner).
    const vaultHash = await owner.deployContract({
      abi: vaultAbi,
      bytecode: vaultArt.bytecode.object,
      args: [tokenAddress, operatorAddr, ownerAddr],
    });
    const vaultReceipt = await publicClient.waitForTransactionReceipt({ hash: vaultHash });
    vaultAddress = vaultReceipt.contractAddress as Address;
  }, 60_000);

  afterAll(() => {
    anvil.kill();
  });

  async function mint(to: Address, amount: bigint): Promise<void> {
    const hash = await walletAt(0).writeContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "mint",
      args: [to, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function approve(walletIndex: number, amount: bigint): Promise<void> {
    const hash = await walletAt(walletIndex).writeContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "approve",
      args: [vaultAddress, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function send(walletIndex: number, functionName: string, args: readonly unknown[]): Promise<void> {
    const hash = await walletAt(walletIndex).writeContract({
      address: vaultAddress,
      abi: vaultAbi,
      functionName,
      args,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  function readVault<T>(functionName: string, args: readonly unknown[]): Promise<T> {
    return publicClient.readContract({
      address: vaultAddress,
      abi: vaultAbi,
      functionName,
      args,
    }) as Promise<T>;
  }

  function readToken<T>(functionName: string, args: readonly unknown[]): Promise<T> {
    return publicClient.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName,
      args,
    }) as Promise<T>;
  }

  it("cycle de vie complet + anti-rejeu à travers l'adaptateur", async () => {
    const svc = new SettlementService(
      createViemVaultClient({
        rpcUrl: RPC,
        chainId: CHAIN_ID,
        vaultAddress: vaultAddress as `0x${string}`,
        operatorPrivateKey: privateKeyAt(1), // opérateur = compte anvil #1
      }),
      { collateralDecimals: 18 },
    );

    // 1. Le trader dépose 100 de collatéral.
    await mint(traderAddr, parseEther("100"));
    await approve(2, parseEther("100"));
    await send(2, "deposit", [parseEther("100")]);
    expect(await readVault<bigint>("collateral", [traderAddr])).toBe(parseEther("100"));

    // 2. L'owner finance le pool de garantie (paie les gains).
    await mint(ownerAddr, parseEther("100"));
    await approve(0, parseEther("100"));
    await send(0, "fundPool", [parseEther("100")]);
    expect(await readVault<bigint>("protocolPool", [])).toBe(parseEther("100"));

    // 3. Ouverture via l'adaptateur (marge 40, fee 0).
    const openKey = "pos-e2e:open:0";
    await svc.openPosition(traderAddr, openKey, 40, 0);
    expect(await readVault<bigint>("lockedMargin", [traderAddr])).toBe(parseEther("40"));

    // 4. Anti-rejeu : rejouer la MÊME clé → no-op idempotent (résout, contrat revert
    //    AlreadySettled avalé par l'adaptateur), aucun double-lock.
    await svc.openPosition(traderAddr, openKey, 40, 0);
    expect(await readVault<bigint>("lockedMargin", [traderAddr])).toBe(parseEther("40")); // toujours 40, pas 80

    // 5. Fermeture avec gain +50 (long, entry 2 → exit 2.5, qty 100).
    const position: Position = {
      id: "pos-e2e",
      product: "perp",
      symbol: "XRP",
      side: "long",
      qty: 100,
      entry: 2,
      leverage: 5,
      margin: 40,
      fee: 0,
    };
    await svc.closePosition(traderAddr, "pos-e2e:close:0", position, 2.5);
    expect(await readVault<bigint>("lockedMargin", [traderAddr])).toBe(0n);
    expect(await readVault<bigint>("collateral", [traderAddr])).toBe(parseEther("150")); // 100 + 50
    expect(await readVault<bigint>("protocolPool", [])).toBe(parseEther("50")); // 100 - 50

    // 6. Lecture du collatéral via l'adaptateur (plafond de marge réel).
    expect(await svc.collateralOf(traderAddr)).toBe(parseEther("150"));

    // 7. Le trader retire tout son libre.
    await send(2, "withdraw", [parseEther("150")]);
    expect(await readVault<bigint>("collateral", [traderAddr])).toBe(0n);
    expect(await readToken<bigint>("balanceOf", [traderAddr])).toBe(parseEther("150"));
  }, 60_000);
});
