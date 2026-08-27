import { TideApiError, type GemProof, type TideClient } from "@tide/client";

const TOKEN_KEY = "tide.sessionToken";
const PAPER_TOKEN_KEY = "tide.paperSessionToken";
const PAPER_USER_KEY = "tide.paperUserId";
const PAPER_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

export type RestoredSession = "wallet" | "paper" | "none";

/** Signe un message avec le wallet et renvoie signature + clé publique (GemWallet). */
export type GemSigner = (message: string) => Promise<{ signature: string; publicKey: string }>;

interface SessionClaims {
  readonly sub: string;
  readonly exp: number;
}

type ActiveAuthMode = "wallet" | "paper" | "none";

interface ClientAuthState {
  paperInFlight: Promise<string> | null;
  paperValidatedAt: number;
  paperValidatedUserId: string;
  sessionGeneration: number;
  mode: ActiveAuthMode;
}

/** Plusieurs vues peuvent appeler `useAuth` avec le même client. Leur session
 * Paper doit partager une seule création/rotation, sinon deux identités se
 * disputent le localStorage et le header Authorization. */
const CLIENT_AUTH_STATES = new WeakMap<TideClient, ClientAuthState>();

function stateFor(client: TideClient): ClientAuthState {
  const existing = CLIENT_AUTH_STATES.get(client);
  if (existing !== undefined) return existing;
  const created: ClientAuthState = {
    paperInFlight: null,
    paperValidatedAt: 0,
    paperValidatedUserId: "",
    sessionGeneration: 0,
    mode: "none",
  };
  CLIENT_AUTH_STATES.set(client, created);
  return created;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // localStorage indisponible (mode privé/SSR)
  }
}

/**
 * Décode uniquement les claims publics nécessaires à l'UX. La signature reste
 * évidemment vérifiée par l'API : ce contrôle client sert à ne pas afficher un
 * wallet comme authentifié avec un JWT expiré ou appartenant à une autre
 * identité.
 */
function sessionClaims(token: string): SessionClaims | null {
  const payload = token.split(".")[1];
  if (payload === undefined) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
    return typeof parsed["sub"] === "string" && typeof parsed["exp"] === "number"
      ? { sub: parsed["sub"], exp: parsed["exp"] }
      : null;
  } catch {
    return null;
  }
}

function tokenMatchesUser(token: string, userId: string, now = Date.now()): boolean {
  const claims = sessionClaims(token);
  return (
    claims !== null &&
    claims.sub === userId &&
    claims.exp * 1000 > now
  );
}

function isUnauthorized(error: unknown): boolean {
  if (error instanceof TideApiError) return error.status === 401;
  if (typeof error !== "object" || error === null) return false;
  const record = error as Record<string, unknown>;
  return record["name"] === "TideApiError" && record["status"] === 401;
}

/** JWT non expiré correspondant à l'identité active (wallet ou Paper). */
export function readTokenForUser(userId?: string): string | null {
  const walletToken = safeGet(TOKEN_KEY);
  const paperToken = safeGet(PAPER_TOKEN_KEY);
  if (userId === undefined) {
    return walletToken ?? paperToken;
  }
  if (walletToken !== null && tokenMatchesUser(walletToken, userId)) {
    return walletToken;
  }
  if (paperToken !== null && tokenMatchesUser(paperToken, userId)) {
    return paperToken;
  }
  return null;
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Indisponible : le token reste valable en mémoire (client.setToken).
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Indisponible : rien à retirer côté persistance.
  }
}

/**
 * Session d'authentification (Sign-In with XRPL). Persiste le JWT et l'injecte
 * dans le client (`Authorization: Bearer`). Les flux Xaman/Gem partent du connect
 * wallet (`useWallet`), qui fournit ici la preuve à vérifier côté serveur.
 */
export function useAuth(client: TideClient) {
  const state = stateFor(client);

  function persist(token: string): void {
    safeSet(TOKEN_KEY, token);
    client.setToken(token);
    state.mode = "wallet";
  }

  function activatePaperToken(token: string): void {
    // Une réponse Paper tardive ne doit jamais remplacer un JWT wallet qui a
    // été authentifié entre-temps. Le token Paper reste toutefois persisté
    // pour la prochaine déconnexion.
    if (state.mode === "wallet") return;
    client.setToken(token);
    state.mode = "paper";
  }

  /**
   * Réinjecte la session persistée au boot. Un wallet n'est restauré que si son
   * JWT est encore valide et porte exactement la même adresse. Sinon on retombe
   * sur la session Paper et l'appelant peut demander une reconnexion wallet.
   */
  function restore(walletAddress = ""): RestoredSession {
    const address = walletAddress.trim();
    const walletToken = safeGet(TOKEN_KEY);
    if (
      address !== "" &&
      walletToken !== null &&
      tokenMatchesUser(walletToken, address)
    ) {
      client.setToken(walletToken);
      state.mode = "wallet";
      return "wallet";
    }
    if (address !== "") {
      safeRemove(TOKEN_KEY);
    }
    const paperToken = safeGet(PAPER_TOKEN_KEY);
    client.setToken(paperToken);
    state.mode = paperToken === null ? "none" : "paper";
    return paperToken === null ? "none" : "paper";
  }

  /** Purge la session (déconnexion / token invalide). */
  function clear(): void {
    safeRemove(TOKEN_KEY);
    const paperToken = safeGet(PAPER_TOKEN_KEY);
    client.setToken(paperToken);
    state.mode = paperToken === null ? "none" : "paper";
  }

  function assertCurrentSession(generation: number): void {
    if (state.sessionGeneration !== generation) {
      throw new Error("session interrompue par la déconnexion");
    }
  }

  async function createPaperSession(generation: number): Promise<string> {
    const created = await client.authPaper();
    assertCurrentSession(generation);
    if (!created.userId.startsWith("paper:")) {
      throw new Error("la nouvelle session Paper contient une identite invalide");
    }
    safeSet(PAPER_USER_KEY, created.userId);
    safeSet(PAPER_TOKEN_KEY, created.token);
    activatePaperToken(created.token);
    state.paperValidatedAt = Date.now();
    state.paperValidatedUserId = created.userId;
    return created.userId;
  }

  /**
   * Retourne la session Paper persistée, ou en demande une nouvelle à l'API.
   * Token et userId sont séparés de la session wallet pour pouvoir revenir au
   * même portefeuille virtuel après une déconnexion Xaman/GemWallet.
   */
  async function resolvePaperSession(generation: number): Promise<string> {
    assertCurrentSession(generation);
    const userId = safeGet(PAPER_USER_KEY);
    const token = safeGet(PAPER_TOKEN_KEY);
    if (userId !== null && userId.startsWith("paper:") && token !== null) {
      activatePaperToken(token);
      if (
        state.paperValidatedUserId === userId &&
        Date.now() - state.paperValidatedAt < PAPER_REFRESH_INTERVAL_MS
      ) {
        return userId;
      }
      try {
        const refreshed = await client.authRefreshPaper();
        assertCurrentSession(generation);
        if (!refreshed.userId.startsWith("paper:")) {
          throw new Error("la session Paper renouvelee contient une identite invalide");
        }
        // Le `sub` vérifié par le serveur est la source de vérité. Si deux
        // écritures localStorage ont été désynchronisées (deux onglets, crash),
        // on réaligne l'identité sur le JWT valide au lieu de boucler en erreur.
        safeSet(PAPER_USER_KEY, refreshed.userId);
        safeSet(PAPER_TOKEN_KEY, refreshed.token);
        activatePaperToken(refreshed.token);
        state.paperValidatedAt = Date.now();
        state.paperValidatedUserId = refreshed.userId;
        return refreshed.userId;
      } catch (error) {
        // Signature devenue invalide (rotation du secret, stockage corrompu) :
        // cette identité n'est plus récupérable côté serveur. On ne remplace
        // jamais le compte sur une panne réseau/5xx, seulement sur un refus 401.
        if (!isUnauthorized(error)) throw error;
        safeRemove(PAPER_USER_KEY);
        safeRemove(PAPER_TOKEN_KEY);
        state.paperValidatedAt = 0;
        state.paperValidatedUserId = "";
        if (state.mode !== "wallet") {
          client.setToken(null);
          state.mode = "none";
        }
        return await createPaperSession(generation);
      }
    }
    return createPaperSession(generation);
  }

  function ensurePaperSession(): Promise<string> {
    if (state.paperInFlight !== null) return state.paperInFlight;
    const operation = resolvePaperSession(state.sessionGeneration);
    const tracked = operation.finally(() => {
      if (state.paperInFlight === tracked) {
        state.paperInFlight = null;
      }
    });
    state.paperInFlight = tracked;
    return tracked;
  }

  /** Auth Xaman : le payload SignIn (uuid) prouve la possession de l'adresse. */
  async function loginXaman(
    uuid: string,
    expectedAddress?: string,
    isCurrent: () => boolean = () => true,
    linkPaperUserId?: string,
  ): Promise<boolean> {
    const { token, address } =
      linkPaperUserId === undefined
        ? await client.authVerifyXaman(uuid)
        : await client.authVerifyXaman(uuid, linkPaperUserId);
    if (!isCurrent()) return false;
    if (expectedAddress !== undefined && address !== expectedAddress) {
      throw new Error("le wallet signé ne correspond pas au compte Xaman connecté");
    }
    persist(token);
    return true;
  }

  /** Auth GemWallet : challenge → signature du message → vérification serveur. */
  async function loginGem(
    address: string,
    sign: GemSigner,
    isCurrent: () => boolean = () => true,
    linkPaperUserId?: string,
  ): Promise<boolean> {
    const { message, nonce } = await client.authChallenge(address);
    if (!isCurrent()) return false;
    const { signature, publicKey } = await sign(message);
    if (!isCurrent()) return false;
    const proof: GemProof = { address, nonce, signature, publicKey };
    const { token, address: verifiedAddress } =
      linkPaperUserId === undefined
        ? await client.authVerifyGem(proof)
        : await client.authVerifyGem(proof, linkPaperUserId);
    if (!isCurrent()) return false;
    if (verifiedAddress !== address) {
      throw new Error("le wallet signé ne correspond pas au compte GemWallet connecté");
    }
    persist(token);
    return true;
  }

  /** Échange une session email/social contre le JWT du compte Paper lié. */
  async function loginExternal(accessToken: string): Promise<{
    userId: string;
    provider: string;
    email: string | null;
  }> {
    const generation = state.sessionGeneration;
    await ensurePaperSession();
    const linked = await client.authExternal(accessToken);
    assertCurrentSession(generation);
    safeSet(PAPER_USER_KEY, linked.userId);
    safeSet(PAPER_TOKEN_KEY, linked.token);
    client.setToken(linked.token);
    state.mode = "paper";
    state.paperValidatedAt = Date.now();
    state.paperValidatedUserId = linked.userId;
    return { userId: linked.userId, provider: linked.provider, email: linked.email };
  }

  /** Déconnecte localement l'identité externe ; la liaison serveur reste récupérable. */
  function logoutExternal(): void {
    state.sessionGeneration += 1;
    state.paperInFlight = null;
    safeRemove(PAPER_USER_KEY);
    safeRemove(PAPER_TOKEN_KEY);
    state.paperValidatedAt = 0;
    state.paperValidatedUserId = "";
    if (state.mode !== "wallet") {
      client.setToken(null);
      state.mode = "none";
    }
  }

  /** Oublie toute l'identité de ce navigateur, Paper comme wallet Live. */
  function logoutAll(): void {
    state.sessionGeneration += 1;
    state.paperInFlight = null;
    safeRemove(TOKEN_KEY);
    safeRemove(PAPER_USER_KEY);
    safeRemove(PAPER_TOKEN_KEY);
    state.paperValidatedAt = 0;
    state.paperValidatedUserId = "";
    client.setToken(null);
    state.mode = "none";
  }

  return {
    restore,
    clear,
    ensurePaperSession,
    loginXaman,
    loginGem,
    loginExternal,
    logoutExternal,
    logoutAll,
  };
}
