import { ref } from "vue";
import { TideApiError } from "@tide/client";
import type { ExecSide, SignRequest, TideClient } from "@tide/client";
import {
  acceptNFTOffer,
  getAddress,
  getPublicKey,
  isInstalled,
  signMessage,
  submitTransaction,
} from "@gemwallet/api";
import type { BadgeAcceptTx } from "@tide/client";
import type { BadgeClaimContext } from "./useBadges";
import { useSession } from "./useSession";

/** Contexte de claim nécessaire à la signature (sans l'accept, déjà passé). */
type BadgeClaimSignCtx = Pick<
  BadgeClaimContext,
  "userId" | "code" | "walletAddress"
>;
import { useAuth } from "./useAuth";
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

let pollTimer: ReturnType<typeof setTimeout> | undefined;
let pollCount = 0;
let flowGeneration = 0;

function stopPolling(): void {
  if (pollTimer !== undefined) {
    clearTimeout(pollTimer);
    pollTimer = undefined;
  }
  pollCount = 0;
}

/** Invalide tout retour asynchrone appartenant au flux de signature précédent. */
function beginFlow(): number {
  stopPolling();
  flowGeneration += 1;
  return flowGeneration;
}

function isCurrentFlow(generation: number): boolean {
  return generation === flowGeneration;
}

/** Identité Paper anonyme du navigateur, pour la liaison déclarative anti-farming. */
function currentPaperUserId(): string | undefined {
  try {
    const value = localStorage.getItem("tide.paperUserId");
    return value !== null && value.startsWith("paper:") ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Connexion de wallet + signature, non-custodial, via Xaman (QR mobile) OU
 * GemWallet (extension navigateur). Singleton : une seule modale pour toute l'app.
 */
export function useWallet(client: TideClient) {
  const session = useSession();
  const auth = useAuth(client);

  function close(): void {
    beginFlow();
    open.value = false;
    phase.value = "idle";
    signRequest.value = null;
    error.value = "";
  }

  /** Ouvre le choix du wallet (Xaman / GemWallet). */
  function connect(): void {
    beginFlow();
    title.value = "Connect wallet";
    error.value = "";
    signRequest.value = null;
    phase.value = "choose";
    open.value = true;
  }

  /** Déconnexion : retire le wallet ET purge le token de session. */
  function disconnect(): void {
    beginFlow();
    session.disconnectWallet();
    auth.clear();
  }

  // ---- Xaman (QR + polling) ----

  async function poll(
    generation: number,
    uuid: string,
    onSigned: (
      account: string | null,
      uuid: string,
      txid: string | null,
      isCurrent: () => boolean,
    ) => void | Promise<void>,
  ): Promise<void> {
    if (!isCurrentFlow(generation)) return;
    pollCount += 1;
    if (pollCount > POLL_MAX) {
      stopPolling();
      return;
    }
    try {
      const status = await client.signStatus(uuid);
      if (!isCurrentFlow(generation)) return;
      if (!status.resolved) {
        schedulePoll(generation, uuid, onSigned);
        return;
      }
      stopPolling();
      if (status.signed) {
        await onSigned(
          status.account,
          uuid,
          status.txid,
          () => isCurrentFlow(generation),
        );
        if (!isCurrentFlow(generation)) return;
        phase.value = "signed";
      } else {
        phase.value = "rejected";
      }
    } catch (e) {
      if (!isCurrentFlow(generation)) return;
      stopPolling();
      phase.value = "error";
      error.value = errorMessage(e);
    }
  }

  function schedulePoll(
    generation: number,
    uuid: string,
    onSigned: (
      account: string | null,
      uuid: string,
      txid: string | null,
      isCurrent: () => boolean,
    ) => void | Promise<void>,
  ): void {
    if (!isCurrentFlow(generation)) return;
    pollTimer = setTimeout(() => void poll(generation, uuid, onSigned), POLL_MS);
  }

  async function startXaman(
    titleText: string,
    create: () => Promise<SignRequest>,
    onSigned: (
      account: string | null,
      uuid: string,
      txid: string | null,
      isCurrent: () => boolean,
    ) => void | Promise<void>,
  ): Promise<void> {
    const generation = beginFlow();
    title.value = titleText;
    error.value = "";
    phase.value = "pending";
    signRequest.value = null;
    open.value = true;
    let request: SignRequest;
    try {
      request = await create();
    } catch (e) {
      if (!isCurrentFlow(generation)) return;
      phase.value = "error";
      error.value =
        e instanceof TideApiError && e.status === HTTP_NOT_FOUND
          ? "Mode Live non configuré côté serveur (clés XUMM manquantes)."
          : errorMessage(e);
      return;
    }
    if (!isCurrentFlow(generation)) return;
    signRequest.value = request;
    pollCount = 0;
    schedulePoll(generation, request.uuid, onSigned);
  }

  async function chooseXaman(): Promise<void> {
    await startXaman(
      "Connect with Xaman",
      () => client.connectWallet(),
      async (account, uuid, _txid, isCurrent) => {
        if (account === null) {
          throw new Error("Xaman n'a renvoyé aucun compte signé.");
        }
        // Le wallet ne devient visible qu'après l'échange réussi contre un JWT
        // portant la même adresse. Cela supprime la fenêtre 401/403 du parcours
        // Agent (et évite de persister une fausse connexion si l'auth échoue).
        const authenticated = await auth.loginXaman(
          uuid,
          account,
          isCurrent,
          currentPaperUserId(),
        );
        if (!authenticated || !isCurrent()) return;
        session.setWallet(account, "xaman");
      },
    );
  }

  // ---- GemWallet (extension) ----

  async function chooseGem(): Promise<void> {
    const generation = beginFlow();
    title.value = "Connect with GemWallet";
    error.value = "";
    phase.value = "pending";
    signRequest.value = null;
    open.value = true;
    try {
      const installed = await isInstalled();
      if (!isCurrentFlow(generation)) return;
      if (!installed.result.isInstalled) {
        phase.value = "error";
        error.value = "GemWallet n'est pas installé (extension navigateur).";
        return;
      }
      const response = await getAddress();
      if (!isCurrentFlow(generation)) return;
      const address = response.result?.address;
      if (address === undefined) {
        phase.value = "rejected";
        return;
      }
      // Signe le challenge serveur pour prouver le contrôle de l'adresse (SIWX).
      const linkPaperUserId = currentPaperUserId();
      const authenticated = await auth.loginGem(address, async (message) => {
        const signed = await signMessage(message);
        const pub = await getPublicKey();
        const signature = signed.result?.signedMessage;
        const publicKey = pub.result?.publicKey;
        if (signature === undefined || publicKey === undefined) {
          throw new Error("Signature GemWallet incomplète.");
        }
        return { signature, publicKey };
      }, () => isCurrentFlow(generation), linkPaperUserId);
      if (!authenticated || !isCurrentFlow(generation)) return;
      session.setWallet(address, "gem");
      phase.value = "signed";
    } catch (e) {
      if (!isCurrentFlow(generation)) return;
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
    const generation = beginFlow();
    title.value = "Live swap";
    error.value = "";
    signRequest.value = null;
    phase.value = "pending";
    open.value = true;
    try {
      const plan = await client.planLiveOffer(account, base, side, amountBase, slippageTolerance);
      if (!isCurrentFlow(generation)) return;
      // GemWallet attend un objet de transaction xrpl ; le plan serveur en est un
      // (OfferCreate taggé, montants bornés). Cast localisé via unknown.
      const result = await submitTransaction({
        transaction: plan.offer as unknown as Parameters<typeof submitTransaction>[0]["transaction"],
      });
      if (!isCurrentFlow(generation)) return;
      phase.value = result.result?.hash !== undefined ? "signed" : "rejected";
    } catch (e) {
      if (!isCurrentFlow(generation)) return;
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
      beginFlow();
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

  // ---- Ticket de compétition ----

  async function competitionEntryGem(
    competitionId: string,
    account: string,
  ): Promise<void> {
    const generation = beginFlow();
    title.value = "Competition entry";
    error.value = "";
    signRequest.value = null;
    phase.value = "pending";
    open.value = true;
    try {
      const payment = await client.competitionEntryPayment(competitionId, account);
      if (!isCurrentFlow(generation)) return;
      const result = await submitTransaction({
        transaction: payment as unknown as Parameters<typeof submitTransaction>[0]["transaction"],
      });
      if (!isCurrentFlow(generation)) return;
      const hash = result.result?.hash;
      if (hash === undefined) {
        phase.value = "rejected";
        return;
      }
      await client.joinCompetition(competitionId, account, hash);
      if (!isCurrentFlow(generation)) return;
      phase.value = "signed";
    } catch (e) {
      if (!isCurrentFlow(generation)) return;
      phase.value = "error";
      error.value = errorMessage(e);
    }
  }

  /** Paie le ticket exact, puis confirme l'inscription après validation XRPL. */
  async function signCompetitionEntry(competitionId: string): Promise<void> {
    const account = session.liveAddress.value;
    if (account === "") {
      connect();
      return;
    }
    if (session.walletType.value === "gem") {
      await competitionEntryGem(competitionId, account);
      return;
    }
    await startXaman(
      "Competition entry",
      () => client.signCompetitionEntry(competitionId, account),
      async (signedAccount, _uuid, txid, isCurrent) => {
        if (signedAccount !== account || txid === null) {
          throw new Error("Le ticket signé ne correspond pas au wallet connecté.");
        }
        if (!isCurrent()) return;
        // Le nœud peut mettre quelques secondes à rendre la transaction via
        // `tx`; l'erreur reste visible et un refresh permet de réessayer.
        await client.joinCompetition(competitionId, account, txid);
      },
    );
  }

  // ---- Claim de badge NFT ----
  // Le serveur a minté le badge + créé une sell-offer à 0 vers le wallet du user.
  // Ici le user signe l'`NFTokenAcceptOffer` pour recevoir le NFT (preuve humaine) :
  // - GemWallet : l'accept construit par le serveur (déjà taggé) est soumis tel quel ;
  // - Xaman : le serveur crée le payload XUMM de l'accept, le user le signe dans
  //   l'app mobile, on suit la signature par polling `/sign/status/:uuid`.

  function pollBadgeAccept(
    generation: number,
    uuid: string,
    resolve: (txid: string | null) => void,
  ): void {
    if (!isCurrentFlow(generation)) {
      resolve(null);
      return;
    }
    pollCount += 1;
    if (pollCount > POLL_MAX) {
      stopPolling();
      resolve(null);
      return;
    }
    void client
      .signStatus(uuid)
      .then((status) => {
        if (!isCurrentFlow(generation)) {
          resolve(null);
          return;
        }
        if (!status.resolved) {
          pollTimer = setTimeout(
            () => pollBadgeAccept(generation, uuid, resolve),
            POLL_MS,
          );
          return;
        }
        stopPolling();
        if (status.signed) {
          phase.value = "signed";
          resolve(status.txid);
        } else {
          phase.value = "rejected";
          resolve(null);
        }
      })
      .catch((e) => {
        if (!isCurrentFlow(generation)) {
          resolve(null);
          return;
        }
        stopPolling();
        phase.value = "error";
        error.value = errorMessage(e);
        resolve(null);
      });
  }

  async function badgeAcceptXaman(
    generation: number,
    claim: BadgeClaimSignCtx,
  ): Promise<string | null> {
    title.value = "Claim badge";
    error.value = "";
    signRequest.value = null;
    phase.value = "pending";
    open.value = true;
    let request: SignRequest;
    try {
      // Le serveur fait le claim (mint + sell-offer, repris si déjà offer_pending)
      // puis crée le payload Xaman de l'accept taggé.
      request = await client.signBadgeAcceptXaman(
        claim.userId,
        claim.code,
        claim.walletAddress,
      );
    } catch (e) {
      if (!isCurrentFlow(generation)) return null;
      phase.value = "error";
      error.value = errorMessage(e);
      return null;
    }
    if (!isCurrentFlow(generation)) return null;
    signRequest.value = request;
    pollCount = 0;
    return await new Promise<string | null>((resolve) => {
      pollBadgeAccept(generation, request.uuid, resolve);
    });
  }

  async function signBadgeAccept(
    acceptTx: BadgeAcceptTx,
    claim: BadgeClaimSignCtx,
  ): Promise<string | null> {
    const generation = beginFlow();
    const account = session.liveAddress.value;
    if (account === "") {
      title.value = "Claim badge";
      phase.value = "error";
      error.value = "Connecte d'abord ton wallet.";
      open.value = true;
      return null;
    }
    if (session.walletType.value !== "gem") {
      return badgeAcceptXaman(generation, claim);
    }
    title.value = "Claim badge";
    error.value = "";
    signRequest.value = null;
    phase.value = "pending";
    open.value = true;
    try {
      // GemWallet expose un flux NFT dédié : il ouvre directement l'écran
      // d'acceptation, autofill/signe/soumet la transaction et conserve le
      // SourceTag Tide. L'offre est déjà réservée au wallet connecté.
      const result = await acceptNFTOffer({
        NFTokenSellOffer: acceptTx.NFTokenSellOffer,
        sourceTag: acceptTx.SourceTag,
      });
      if (!isCurrentFlow(generation)) return null;
      const hash = result.result?.hash ?? null;
      phase.value = hash !== null ? "signed" : "rejected";
      return hash;
    } catch (e) {
      if (!isCurrentFlow(generation)) return null;
      phase.value = "error";
      // Les erreurs de l'extension traversent une frontière de realm : elles
      // ne sont pas toujours reconnues comme `Error`. Garde leur message réel
      // au lieu de les réduire systématiquement à « Network error ».
      const walletMessage =
        typeof e === "object" &&
        e !== null &&
        typeof (e as Record<string, unknown>)["message"] === "string"
          ? String((e as Record<string, unknown>)["message"])
          : "";
      error.value = walletMessage.trim() === "" ? errorMessage(e) : walletMessage;
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
    disconnect,
    chooseXaman,
    chooseGem,
    signLiveOffer,
    signCompetitionEntry,
    signBadgeAccept,
    close,
  };
}
