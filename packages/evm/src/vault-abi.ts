/**
 * ABI **minimal** du `MarginVault`, restreint à ce dont l'adaptateur a besoin :
 * les deux instructions opérateur (open/close), la lecture du collatéral, et les
 * erreurs custom (pour que viem décode les reverts, dont l'anti-rejeu
 * `AlreadySettled`). Typé `as const` → inférence des types d'arguments/retours par
 * viem, sans `any`.
 *
 * Volontairement figé ici plutôt qu'importé de `packages/contracts/out/` : le
 * typecheck TS ne dépend pas d'un `forge build` préalable, et le contrat de l'ABI
 * consommé reste lisible en review. Doit rester aligné sur `MarginVault.sol`.
 */
export const MARGIN_VAULT_ABI = [
  {
    type: "function",
    name: "openAccounting",
    stateMutability: "nonpayable",
    inputs: [
      { name: "settlementId", type: "bytes32" },
      { name: "account", type: "address" },
      { name: "margin", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "closeAccounting",
    stateMutability: "nonpayable",
    inputs: [
      { name: "settlementId", type: "bytes32" },
      { name: "account", type: "address" },
      { name: "marginRelease", type: "uint256" },
      { name: "pnl", type: "int256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "collateral",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  { type: "error", name: "AlreadySettled", inputs: [] },
  { type: "error", name: "ZeroSettlementId", inputs: [] },
  { type: "error", name: "NotOperator", inputs: [] },
  { type: "error", name: "InsufficientFreeCollateral", inputs: [] },
  { type: "error", name: "MarginExceedsLocked", inputs: [] },
  { type: "error", name: "PoolInsolvent", inputs: [] },
] as const;
