import type { GemProof, TideClient } from "@tide/client";

const TOKEN_KEY = "tide.sessionToken";

/** Signe un message avec le wallet et renvoie signature + clé publique (GemWallet). */
export type GemSigner = (message: string) => Promise<{ signature: string; publicKey: string }>;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // localStorage indisponible (mode privé/SSR)
  }
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
  function persist(token: string): void {
    safeSet(TOKEN_KEY, token);
    client.setToken(token);
  }

  /** Réinjecte un token persisté dans le client (au boot de l'app). */
  function restore(): void {
    const token = safeGet(TOKEN_KEY);
    if (token !== null) {
      client.setToken(token);
    }
  }

  /** Purge la session (déconnexion / token invalide). */
  function clear(): void {
    safeRemove(TOKEN_KEY);
    client.setToken(null);
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

  return { restore, clear, loginXaman, loginGem };
}
