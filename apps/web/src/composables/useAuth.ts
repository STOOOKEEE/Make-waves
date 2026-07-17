import type { GemProof, TideClient } from "@tide/client";

const TOKEN_KEY = "tide.sessionToken";
const PAPER_TOKEN_KEY = "tide.paperSessionToken";
const PAPER_USER_KEY = "tide.paperUserId";
const PAPER_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

/** Signe un message avec le wallet et renvoie signature + clé publique (GemWallet). */
export type GemSigner = (message: string) => Promise<{ signature: string; publicKey: string }>;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // localStorage indisponible (mode privé/SSR)
  }
}

/**
 * Token de session courant (persisté). Utile hors client typé — flux SSE qui ne
 * passent pas par `TideClient` : EventSource (`?token=`) et le fetch du chat agent
 * (`Authorization: Bearer`).
 */
export function readSessionToken(): string | null {
  return safeGet(TOKEN_KEY) ?? safeGet(PAPER_TOKEN_KEY);
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
  let paperRefreshInFlight: Promise<string> | null = null;
  let paperValidatedAt = 0;
  let paperValidatedUserId = "";

  function persist(token: string): void {
    safeSet(TOKEN_KEY, token);
    client.setToken(token);
  }

  /** Réinjecte un token persisté dans le client (au boot de l'app). */
  function restore(): void {
    const token = readSessionToken();
    if (token !== null) {
      client.setToken(token);
    }
  }

  /** Purge la session (déconnexion / token invalide). */
  function clear(): void {
    safeRemove(TOKEN_KEY);
    client.setToken(safeGet(PAPER_TOKEN_KEY));
  }

  /**
   * Retourne la session Paper persistée, ou en demande une nouvelle à l'API.
   * Token et userId sont séparés de la session wallet pour pouvoir revenir au
   * même portefeuille virtuel après une déconnexion Xaman/GemWallet.
   */
  async function ensurePaperSession(): Promise<string> {
    const userId = safeGet(PAPER_USER_KEY);
    const token = safeGet(PAPER_TOKEN_KEY);
    if (userId !== null && userId.startsWith("paper:") && token !== null) {
      client.setToken(token);
      if (
        paperValidatedUserId === userId &&
        Date.now() - paperValidatedAt < PAPER_REFRESH_INTERVAL_MS
      ) {
        return userId;
      }
      paperRefreshInFlight ??= (async () => {
        const refreshed = await client.authRefreshPaper();
        if (refreshed.userId !== userId) {
          throw new Error("la session Paper renouvelee ne correspond pas a l'identite locale");
        }
        safeSet(PAPER_TOKEN_KEY, refreshed.token);
        client.setToken(refreshed.token);
        paperValidatedAt = Date.now();
        paperValidatedUserId = userId;
        return userId;
      })();
      try {
        return await paperRefreshInFlight;
      } finally {
        paperRefreshInFlight = null;
      }
    }
    const created = await client.authPaper();
    safeSet(PAPER_USER_KEY, created.userId);
    safeSet(PAPER_TOKEN_KEY, created.token);
    client.setToken(created.token);
    paperValidatedAt = Date.now();
    paperValidatedUserId = created.userId;
    return created.userId;
  }

  /** Auth Xaman : le payload SignIn (uuid) prouve la possession de l'adresse. */
  async function loginXaman(uuid: string): Promise<void> {
    const { token } = await client.authVerifyXaman(uuid);
    persist(token);
  }

  /** Auth GemWallet : challenge → signature du message → vérification serveur. */
  async function loginGem(address: string, sign: GemSigner): Promise<void> {
    const { message, nonce } = await client.authChallenge(address);
    const { signature, publicKey } = await sign(message);
    const proof: GemProof = { address, nonce, signature, publicKey };
    const { token } = await client.authVerifyGem(proof);
    persist(token);
  }

  return { restore, clear, ensurePaperSession, loginXaman, loginGem };
}
