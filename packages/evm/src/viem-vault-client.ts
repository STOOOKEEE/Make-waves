import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  keccak256,
  stringToHex,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { VaultClient } from "./vault-client";
import { MARGIN_VAULT_ABI } from "./vault-abi";
import { SettlementError } from "./errors";

/**
 * Adaptateur concret `VaultClient` sur **viem** : la frontière runtime entre le
 * backend Tide et le `MarginVault` déployé sur la XRPL EVM Sidechain. Suit le
 * modèle des factories réseau du repo (ex. `createXamanApi`) : enveloppe la lib
 * chaîne + la clé opérateur, expose l'interface pure injectable. **Non testé en
 * unit** (réseau + clé) — couvert par le test e2e contre anvil.
 *
 * L'`idempotencyKey` (string stable) est hachée en `bytes32 settlementId`
 * (`keccak256(utf8)`) consommé on-chain : un retry avec la même clé revert
 * `AlreadySettled` au lieu de double-appliquer. Chaque write **attend le reçu** et
 * **échoue si `status !== "success"`** (pas d'avalement d'erreur réseau).
 */
export interface ViemVaultClientOptions {
  /** URL RPC HTTP de la chaîne EVM (ex. testnet XRPL EVM ou anvil local). */
  readonly rpcUrl: string;
  /** Chain id EVM (1449000 testnet / 1440000 mainnet XRPL EVM ; 31337 anvil). */
  readonly chainId: number;
  /** Adresse du `MarginVault` déployé. */
  readonly vaultAddress: `0x${string}`;
  /** Clé privée de l'opérateur (clé du Safe/relais qui applique la compta). */
  readonly operatorPrivateKey: `0x${string}`;
}

/** Construit un `VaultClient` branché sur une vraie chaîne via viem. */
export function createViemVaultClient(options: ViemVaultClientOptions): VaultClient {
  const { rpcUrl, chainId, vaultAddress, operatorPrivateKey } = options;

  const chain: Chain = defineChain({
    id: chainId,
    name: `evm-${String(chainId)}`,
    nativeCurrency: { name: "XRP", symbol: "XRP", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const account = privateKeyToAccount(operatorPrivateKey);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const address = getAddress(vaultAddress);

  const settlementId = (idempotencyKey: string): `0x${string}` =>
    keccak256(stringToHex(idempotencyKey));

  async function awaitSuccess(hash: `0x${string}`, label: string): Promise<void> {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new SettlementError(`${label} échec on-chain (tx ${hash})`);
    }
  }

  return {
    async openAccounting(
      accountAddr: string,
      idempotencyKey: string,
      marginBase: bigint,
      feeBase: bigint,
    ): Promise<void> {
      const hash = await walletClient.writeContract({
        address,
        abi: MARGIN_VAULT_ABI,
        functionName: "openAccounting",
        args: [settlementId(idempotencyKey), getAddress(accountAddr), marginBase, feeBase],
      });
      await awaitSuccess(hash, "openAccounting");
    },

    async closeAccounting(
      accountAddr: string,
      idempotencyKey: string,
      marginReleaseBase: bigint,
      pnlBase: bigint,
    ): Promise<void> {
      const hash = await walletClient.writeContract({
        address,
        abi: MARGIN_VAULT_ABI,
        functionName: "closeAccounting",
        args: [settlementId(idempotencyKey), getAddress(accountAddr), marginReleaseBase, pnlBase],
      });
      await awaitSuccess(hash, "closeAccounting");
    },

    collateralOf(accountAddr: string): Promise<bigint> {
      return publicClient.readContract({
        address,
        abi: MARGIN_VAULT_ABI,
        functionName: "collateral",
        args: [getAddress(accountAddr)],
      });
    },
  };
}
