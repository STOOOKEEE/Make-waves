import { computed, ref } from "vue";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TideClient } from "@tide/client";
import { useAuth } from "./useAuth";
import { useSession } from "./useSession";

const PROFILE_KEY = "tide.externalIdentity";
const RETURN_PATH_KEY = "tide.authReturnPath";
const modalOpen = ref(false);
const loading = ref(false);
const emailSent = ref(false);
const error = ref("");

interface AccountProfile {
  readonly userId: string;
  readonly provider: string;
  readonly email: string | null;
}

function loadProfile(): AccountProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw === null) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (typeof value["userId"] !== "string" || typeof value["provider"] !== "string") return null;
    return {
      userId: value["userId"],
      provider: value["provider"],
      email: typeof value["email"] === "string" ? value["email"] : null,
    };
  } catch {
    return null;
  }
}

const profile = ref<AccountProfile | null>(loadProfile());
let supabase: SupabaseClient | null = null;
let supabaseInFlight: Promise<SupabaseClient> | null = null;
let bootstrapped = false;
let exchangeInFlight: Promise<void> | null = null;

function configured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.trim() &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

async function authClient(): Promise<SupabaseClient> {
  if (!configured()) throw new Error("Login email/social non configuré");
  if (supabase !== null) return supabase;
  supabaseInFlight ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(
      import.meta.env.VITE_SUPABASE_URL ?? "",
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } },
    ),
  );
  supabase = await supabaseInFlight;
  return supabase;
}

function saveProfile(value: AccountProfile | null): void {
  profile.value = value;
  try {
    if (value === null) localStorage.removeItem(PROFILE_KEY);
    else localStorage.setItem(PROFILE_KEY, JSON.stringify(value));
  } catch {
    // Le profil d'affichage reste disponible en mémoire.
  }
}

function saveReturnPath(path: string | null): void {
  try {
    if (path === null) localStorage.removeItem(RETURN_PATH_KEY);
    else localStorage.setItem(RETURN_PATH_KEY, path);
  } catch {
    // La connexion fonctionne ; seule la redirection automatique sera perdue.
  }
}

function consumeReturnPath(): string | null {
  try {
    const value = localStorage.getItem(RETURN_PATH_KEY);
    localStorage.removeItem(RETURN_PATH_KEY);
    return value === "/dashboard" ? value : null;
  } catch {
    return null;
  }
}

async function exchangeSession(client: TideClient, accessToken: string): Promise<void> {
  if (exchangeInFlight !== null) return exchangeInFlight;
  exchangeInFlight = (async () => {
    loading.value = true;
    error.value = "";
    try {
      const linked = await useAuth(client).loginExternal(accessToken);
      saveProfile(linked);
      useSession().setPaperUser(linked.userId);
      modalOpen.value = false;
      const path = consumeReturnPath();
      if (path !== null) window.location.hash = `#${path}`;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "Connexion impossible";
    } finally {
      loading.value = false;
      exchangeInFlight = null;
    }
  })();
  return exchangeInFlight;
}

/** Initialise une fois le retour OAuth/magic-link au démarrage de l'app. */
export function bootstrapAccountAuth(client: TideClient): void {
  if (bootstrapped || !configured()) return;
  bootstrapped = true;
  void authClient().then(({ auth }) => {
    auth.onAuthStateChange((_event, session) => {
      if (session?.access_token !== undefined) {
        queueMicrotask(() => void exchangeSession(client, session.access_token));
      }
    });
    void auth.getSession().then(({ data }) => {
      if (data.session?.access_token !== undefined) {
        void exchangeSession(client, data.session.access_token);
      }
    });
  });
}

export function useAccountAuth(client: TideClient) {
  const session = useSession();
  const signedIn = computed(() => profile.value !== null);
  const canLogout = computed(() => signedIn.value || session.connected.value);
  const anonymousPaper = computed(
    () => !signedIn.value && session.userId.value.startsWith("paper:"),
  );
  const label = computed(() => {
    if (profile.value?.email) return profile.value.email;
    if (profile.value?.provider === "google") return "Compte Google";
    if (signedIn.value) return "Compte Tide";
    const userId = session.userId.value.trim();
    if (userId.startsWith("paper:")) {
      const suffix = userId.slice("paper:".length);
      return `Paper · ${suffix.length > 10 ? `${suffix.slice(0, 6)}…${suffix.slice(-4)}` : suffix}`;
    }
    if (userId !== "") {
      return `XRPL · ${userId.length > 12 ? `${userId.slice(0, 6)}…${userId.slice(-4)}` : userId}`;
    }
    return "Se connecter";
  });

  function open(nextPath: "/dashboard" | null = null): void {
    error.value = "";
    emailSent.value = false;
    saveReturnPath(nextPath);
    modalOpen.value = true;
  }

  function close(): void {
    modalOpen.value = false;
  }

  async function sendEmail(email: string): Promise<void> {
    loading.value = true;
    error.value = "";
    emailSent.value = false;
    try {
      const { error: authError } = await (await authClient()).auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (authError !== null) throw authError;
      emailSent.value = true;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "Email impossible à envoyer";
    } finally {
      loading.value = false;
    }
  }

  async function loginGoogle(): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      const { error: authError } = await (await authClient()).auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (authError !== null) throw authError;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "Connexion Google impossible";
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      if (configured() && signedIn.value) {
        await (await authClient()).auth.signOut();
      }
    } catch {
      // La déconnexion locale doit rester possible si Supabase est indisponible.
    } finally {
      useAuth(client).logoutAll();
      saveProfile(null);
      saveReturnPath(null);
      session.disconnectWallet();
      session.setPaperUser("");
      modalOpen.value = false;
      loading.value = false;
    }
  }

  return {
    configured: configured(),
    modalOpen,
    loading,
    emailSent,
    error,
    profile,
    signedIn,
    canLogout,
    anonymousPaper,
    label,
    open,
    close,
    sendEmail,
    loginGoogle,
    logout,
  };
}
