import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  keccak256,
  nonceManager,
  stringToHex,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { VaultClient } from "./vault-client";
import { MARGIN_VAULT_ABI } from "./vault-abi";
import { SettlementError } from "./errors";

/** Au-delà, on abandonne l'attente du reçu (RPC muet / tx écrasée) plutôt que de bloquer le règlement. */
const RECEIPT_TIMEOUT_MS = 60_000;

/** `true` si l'erreur est un revert `AlreadySettled` du contrat (retry d'un règlement déjà appliqué). */
function isAlreadySettled(err: unknown): boolean {
  if (!(err instanceof BaseError)) return false;
  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
  return (
    revert instanceof ContractFunctionRevertedError && revert.data?.errorName === "AlreadySettled"
  );
}

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

  // nonceManager : sérialise les nonces d'une même clé opérateur → deux règlements
  // concurrents ne se collisionnent plus sur le même nonce pending.
  const account = privateKeyToAccount(operatorPrivateKey, { nonceManager });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const address = getAddress(vaultAddress);

  const settlementId = (idempotencyKey: string): `0x${string}` => {
    if (idempotencyKey === "") throw new SettlementError("idempotencyKey vide");
    return keccak256(stringToHex(idempotencyKey));
  };

  async function awaitSuccess(hash: `0x${string}`, label: string): Promise<void> {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: RECEIPT_TIMEOUT_MS,
      confirmations: 1,
    });
    if (receipt.status !== "success") {
      throw new SettlementError(`${label} échec on-chain (tx ${hash})`);
    }
  }

  // Un règlement déjà appliqué (retry après succès on-chain, réponse réseau perdue)
  // revert `AlreadySettled` → no-op idempotent, pas une erreur. Suppose des clés
  // d'idempotence uniques PAR opération (convention backend positionId:action:seq).
  async function idempotent(run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (err) {
      if (isAlreadySettled(err)) return;
      throw err;
    }
  }

  return {
    openAccounting(
      accountAddr: string,
      idempotencyKey: string,
      marginBase: bigint,
      feeBase: bigint,
    ): Promise<void> {
      const id = settlementId(idempotencyKey);
      const to = getAddress(accountAddr);
      return idempotent(async () => {
        const hash = await walletClient.writeContract({
          address,
          abi: MARGIN_VAULT_ABI,
          functionName: "openAccounting",
          args: [id, to, marginBase, feeBase],
        });
        await awaitSuccess(hash, "openAccounting");
      });
    },

    closeAccounting(
      accountAddr: string,
      idempotencyKey: string,
      marginReleaseBase: bigint,
      pnlBase: bigint,
    ): Promise<void> {
      const id = settlementId(idempotencyKey);
      const to = getAddress(accountAddr);
      return idempotent(async () => {
        const hash = await walletClient.writeContract({
          address,
          abi: MARGIN_VAULT_ABI,
          functionName: "closeAccounting",
          args: [id, to, marginReleaseBase, pnlBase],
        });
        await awaitSuccess(hash, "closeAccounting");
      });
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
