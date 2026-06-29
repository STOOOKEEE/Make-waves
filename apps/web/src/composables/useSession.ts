import { computed, ref } from "vue";

const USER_KEY = "tide.userId";
const WALLET_KEY = "tide.liveAddress";
const WALLET_TYPE_KEY = "tide.walletType";

export type WalletType = "" | "xaman" | "gem";

function load(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    // localStorage indisponible (mode privé, SSR) : on démarre vide.
    return "";
  }
}

function persist(key: string, value: string): void {
  try {
    if (value === "") {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // localStorage indisponible : la valeur reste valable en mémoire.
  }
}

// État partagé au niveau module : une SEULE identité pour toute l'application.
// `userId` = compte paper (terminal) ; `liveAddress` = adresse XRPL connectée via
// Xaman (mode Live). Portfolio/compétitions/header les lisent.
function loadWalletType(): WalletType {
  const v = load(WALLET_TYPE_KEY);
  return v === "xaman" || v === "gem" ? v : "";
}

const userId = ref(load(USER_KEY));
const liveAddress = ref(load(WALLET_KEY));
const walletType = ref<WalletType>(loadWalletType());

/** Session courante : compte paper + wallet Live, partagés et persistants. */
export function useSession() {
  const connected = computed(() => userId.value.trim() !== "");
  const walletConnected = computed(() => liveAddress.value.trim() !== "");

  function setUserId(id: string): void {
    userId.value = id.trim();
    persist(USER_KEY, userId.value);
  }

  function setWallet(address: string, type: WalletType): void {
    liveAddress.value = address.trim();
    walletType.value = type;
    persist(WALLET_KEY, liveAddress.value);
    persist(WALLET_TYPE_KEY, type);
  }

  function disconnectWallet(): void {
    setWallet("", "");
  }

  return {
    userId,
    liveAddress,
    walletType,
    connected,
    walletConnected,
    setUserId,
    setWallet,
    disconnectWallet,
  };
}
