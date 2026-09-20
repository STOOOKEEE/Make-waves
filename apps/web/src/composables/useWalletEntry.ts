import { ref } from "vue";

/** Événement émis quand le claim du wallet Paper a terminé. */
export const PAPER_WALLET_CHANGED_EVENT = "tide:paper-wallet-changed";

const open = ref(false);

/** Point d'entrée partagé du choix « créer ou connecter un wallet ». */
export function useWalletEntry() {
  function show(): void {
    open.value = true;
  }

  function close(): void {
    open.value = false;
  }

  return { open, show, close };
}
