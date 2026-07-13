import { ref } from "vue";
import { TideApiError } from "@tide/client";
import type { ExecSide, SignRequest, TideClient } from "@tide/client";
import { getAddress, isInstalled, submitTransaction } from "@gemwallet/api";
import type { BadgeAcceptTx } from "@tide/client";
import { useSession } from "./useSession";
import { errorMessage } from "./messages";

const POLL_MS = 2500;
const POLL_MAX = 120; // ~5 min avant abandon du suivi
const HTTP_NOT_FOUND = 404;

type Phase = "idle" | "choose" | "pending" | "signed" | "rejected" | "error";

// État partagé (un seul flux à la fois) : la modale globale le rend.
const open = ref(false);
const phase = ref<Phase>("idle");
const title = ref("");
const signRequest = ref<SignRequest | null>(null);
const error = ref("");

let pollTimer: ReturnType<typeof setInterval> | undefined;
let pollCount = 0;

function stopPolling(): void {
  if (pollTimer !== undefined) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
  pollCount = 0;
}

/**
 * Connexion de wallet + signature, non-custodial, via Xaman (QR mobile) OU
 * GemWallet (extension navigateur). Singleton : une seule modale pour toute l'app.
 */
export function useWallet(client: TideClient) {
  const session = useSession();

  function close(): void {
    open.value = false;
    phase.value = "idle";
    signRequest.value = null;
    error.value = "";
    stopPolling();
  }

  /** Ouvre le choix du wallet (Xaman / GemWallet). */
  function connect(): void {
    title.value = "Connect wallet";
    error.value = "";
    signRequest.value = null;
    phase.value = "choose";
    open.value = true;
  }

  // ---- Xaman (QR + polling) ----

  async function poll(uuid: string, onSigned: (account: string | null) => void): Promise<void> {
    pollCount += 1;
    if (pollCount > POLL_MAX) {
      stopPolling();
      return;
    }
    try {
      const status = await client.signStatus(uuid);
      if (!status.resolved) {
        return;
      }
      stopPolling();
      if (status.signed) {
        phase.value = "signed";
        onSigned(status.account);
      } else {
        phase.value = "rejected";
      }
    } catch (e) {
      stopPolling();
      phase.value = "error";
      error.value = errorMessage(e);
    }
  }

  async function startXaman(
    titleText: string,
    create: () => Promise<SignRequest>,
    onSigned: (account: string | null) => void,
  ): Promise<void> {
    title.value = titleText;
    error.value = "";
    phase.value = "pending";
    signRequest.value = null;
    open.value = true;
    stopPolling();
    let request: SignRequest;
    try {
      request = await create();
    } catch (e) {
      phase.value = "error";
      error.value =
        e instanceof TideApiError && e.status === HTTP_NOT_FOUND
          ? "Mode Live non configuré côté serveur (clés XUMM manquantes)."
          : errorMessage(e);
      return;
    }
    signRequest.value = request;
    pollCount = 0;
    pollTimer = setInterval(() => void poll(request.uuid, onSigned), POLL_MS);
  }

  async function chooseXaman(): Promise<void> {
    await startXaman(
      "Connect with Xaman",
      () => client.connectWallet(),
      (account) => {
        if (account !== null) {
          session.setWallet(account, "xaman");
        }
      },
    );
  }

  // ---- GemWallet (extension) ----

  async function chooseGem(): Promise<void> {
    title.value = "Connect with GemWallet";
    error.value = "";
    phase.value = "pending";
    try {
      const installed = await isInstalled();
      if (!installed.result.isInstalled) {
        phase.value = "error";
        error.value = "GemWallet n'est pas installé (extension navigateur).";
        return;
      }
      const response = await getAddress();
      const address = response.result?.address;
      if (address === undefined) {
        phase.value = "rejected";
        return;
      }
      session.setWallet(address, "gem");
      phase.value = "signed";
    } catch (e) {
      phase.value = "error";
      error.value = errorMessage(e);
    }
  }

  // ---- Swap Live ----
  // L'intention (base/side/quantité/slippage) part au serveur, qui calcule
  // l'OfferCreate borné (best execution + slippage) et injecte l'attribution
  // et l'issuer du quote. Le front ne construit jamais les montants lui-même.

  async function liveOfferGem(
    account: string,
    base: string,
    side: ExecSide,
    amountBase: number,
    slippageTolerance: number,
  ): Promise<void> {
    title.value = "Live swap";
    error.value = "";
    signRequest.value = null;
    phase.value = "pending";
    open.value = true;
    stopPolling();
    try {
      const plan = await client.planLiveOffer(account, base, side, amountBase, slippageTolerance);
      // GemWallet attend un objet de transaction xrpl ; le plan serveur en est un
      // (OfferCreate taggé, montants bornés). Cast localisé via unknown.
      const result = await submitTransaction({
        transaction: plan.offer as unknown as Parameters<typeof submitTransaction>[0]["transaction"],
      });
      phase.value = result.result?.hash !== undefined ? "signed" : "rejected";
    } catch (e) {
      phase.value = "error";
      error.value = errorMessage(e);
    }
  }

  /** Signe un swap Live (OfferCreate) avec le wallet connecté (Xaman ou GemWallet). */
  async function signLiveOffer(
    base: string,
    side: ExecSide,
    amountBase: number,
    slippageTolerance: number,
  ): Promise<void> {
    const account = session.liveAddress.value;
    if (account === "") {
      title.value = "Live swap";
      phase.value = "error";
      error.value = "Connecte d'abord ton wallet.";
      open.value = true;
      return;
    }
    if (session.walletType.value === "gem") {
      await liveOfferGem(account, base, side, amountBase, slippageTolerance);
      return;
    }
    await startXaman(
      "Live swap",
      () => client.signLiveOffer(account, base, side, amountBase, slippageTolerance),
      () => undefined,
    );
  }

  // ---- Claim de badge NFT ----
  // Le serveur a minté le badge + créé une sell-offer à 0 vers le wallet du user.
  // Ici le user signe l'`NFTokenAcceptOffer` pour recevoir le NFT (preuve humaine).

  async function signBadgeAccept(
    acceptTx: BadgeAcceptTx,
  ): Promise<string | null> {
    const account = session.liveAddress.value;
    if (account === "") {
      title.value = "Claim badge";
      phase.value = "error";
      error.value = "Connecte d'abord ton wallet.";
      open.value = true;
      return null;
    }
    if (session.walletType.value !== "gem") {
      // Xaman : l'accept de badge n'est pas encore câblé (route /sign/badge-accept).
      title.value = "Claim badge";
      phase.value = "error";
      error.value = "Claim on-chain via GemWallet pour l'instant.";
      open.value = true;
      return null;
    }
    title.value = "Claim badge";
    error.value = "";
    signRequest.value = null;
    phase.value = "pending";
    open.value = true;
    try {
      // Le serveur a construit l'accept déjà taggé (SourceTag Tide) : on le
      // soumet tel quel via GemWallet.
      const result = await submitTransaction({
        transaction: acceptTx as unknown as Parameters<typeof submitTransaction>[0]["transaction"],
      });
      const hash = result.result?.hash ?? null;
      phase.value = hash !== null ? "signed" : "rejected";
      return hash;
    } catch (e) {
      phase.value = "error";
      error.value = errorMessage(e);
      return null;
    }
  }

  return {
    open,
    phase,
    title,
    signRequest,
    error,
    connect,
    chooseXaman,
    chooseGem,
    signLiveOffer,
    signBadgeAccept,
    close,
  };
}
