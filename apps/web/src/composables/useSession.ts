import { computed, ref } from "vue";

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

// État partagé au niveau module : l'adresse XRPL connectée est l'identité
// utilisateur unique. Même le paper trading utilise cette adresse comme compte,
// afin que les participants restent comptabilisables par wallet.
function loadWalletType(): WalletType {
  const v = load(WALLET_TYPE_KEY);
  return v === "xaman" || v === "gem" ? v : "";
}

const liveAddress = ref(load(WALLET_KEY));
const userId = ref(liveAddress.value);
const walletType = ref<WalletType>(loadWalletType());

/** Session courante : compte paper + wallet Live, partagés et persistants. */
export function useSession() {
  const connected = computed(() => liveAddress.value.trim() !== "");
  const walletConnected = computed(() => liveAddress.value.trim() !== "");

  function setWallet(address: string, type: WalletType): void {
    liveAddress.value = address.trim();
    userId.value = liveAddress.value;
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
    setWallet,
    disconnectWallet,
  };
}
