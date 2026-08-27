/**
 * Liaison observée entre une identité Paper anonyme et un wallet XRPL connecté
 * depuis le même navigateur. Déclarative (le client honnête l'envoie au login
 * wallet) : elle borne le farming « je change de wallet » pour les flux
 * normaux ; le plafond journalier de mints reste le frein global dur.
 *
 * Une liaison est immuable : si un wallet a déjà été associé à une session
 * Paper, une reconnexion ne peut pas réécrire son historique avec une nouvelle
 * session anonyme.
 */
export interface WalletLink {
  readonly walletAddress: string;
  readonly paperUserId: string;
  readonly linkedAt: number;
}

export interface WalletLinkStore {
  getPaperUserId(walletAddress: string): Promise<string | null>;
  listWalletsForPaperUser(paperUserId: string): Promise<readonly string[]>;
  link(walletAddress: string, paperUserId: string, linkedAt: number): Promise<void>;
}

export class InMemoryWalletLinkStore implements WalletLinkStore {
  private readonly links = new Map<string, WalletLink>();

  async getPaperUserId(walletAddress: string): Promise<string | null> {
    return this.links.get(walletAddress)?.paperUserId ?? null;
  }

  async listWalletsForPaperUser(paperUserId: string): Promise<readonly string[]> {
    return [...this.links.values()]
      .filter((link) => link.paperUserId === paperUserId)
      .map((link) => link.walletAddress);
  }

  async link(walletAddress: string, paperUserId: string, linkedAt: number): Promise<void> {
    if (this.links.has(walletAddress)) return;
    this.links.set(walletAddress, { walletAddress, paperUserId, linkedAt });
  }
}
