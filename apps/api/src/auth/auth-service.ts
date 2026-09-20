import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import type { JwtPayload } from "jsonwebtoken";
import { addressFromPublicKey, assertValidAddress, verifyMessageSignature } from "@tide/xrpl";
import type { ChallengeStore } from "./challenge-store";
import type { XamanPayloadApi } from "../xaman/sign-request";
import type { ExternalIdentityStore } from "../store/external-identity-store";
import type { WalletLinkStore } from "../store/wallet-link-store";
import type { ExternalIdentityVerifier } from "./external-auth";

/** Échec d'authentification (challenge/signature/token invalides) → 401. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Auth Xaman demandée alors que les clés XUMM ne sont pas configurées → 501. */
export class XamanNotConfiguredError extends Error {
  constructor() {
    super("Auth Xaman non configurée (clés XUMM absentes)");
    this.name = "XamanNotConfiguredError";
  }
}

export interface AuthServiceDeps {
  /** Secret HMAC des JWT de session (jamais journalisé). */
  readonly secret: string;
  /** Durée de vie d'un token, en secondes. */
  readonly ttlSeconds: number;
  readonly challenges: ChallengeStore;
  /** API Xaman (si XUMM configuré) pour l'auth via payload SignIn. */
  readonly xaman?: XamanPayloadApi;
  /** Login email/social optionnel. La liaison reste dans la DB privée Tide. */
  readonly external?: {
    readonly verifier: ExternalIdentityVerifier;
    readonly identities: ExternalIdentityStore;
  };
  /** Fabrique injectable pour les identités Paper anonymes (tests déterministes). */
  readonly paperSessionId?: () => string;
  /** Liaison déclarative wallet ↔ identité Paper (anti-farming option B). */
  readonly walletLinks?: WalletLinkStore;
}

export interface GemVerifyInput {
  readonly address: string;
  readonly nonce: string;
  readonly signature: string;
  readonly publicKey: string;
}

const BEARER_PREFIX = "Bearer ";
const PAPER_REFRESH_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/**
 * Message signé par le wallet pour prouver le contrôle de l'adresse. Lie
 * l'adresse ET le nonce : une signature ne peut pas être rejouée pour une autre
 * adresse ni un autre challenge. Le serveur reconstruit ce message côté vérif —
 * le client ne choisit jamais son contenu.
 */
function challengeMessage(address: string, nonce: string): string {
  return `Tide — connexion\nadresse: ${address}\nnonce: ${nonce}`;
}

/**
 * Sign-In with XRPL : émet des challenges, vérifie une preuve de possession
 * (GemWallet `signMessage` ou payload Xaman `SignIn`) et délivre un JWT de session
 * (`sub = adresse`). Aucun secret de wallet ne transite ici — seulement des
 * signatures publiques vérifiables.
 */
export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  /**
   * Enregistre la liaison déclarative wallet ↔ compte Paper du navigateur.
   * Best-effort : un échec ne bloque jamais le login (le plafond journalier de
   * mints reste le frein dur ; la liaison borne les flux honnêtes).
   */
  async recordWalletLink(address: string, paperUserId: string): Promise<void> {
    if (this.deps.walletLinks === undefined) return;
    if (!paperUserId.startsWith("paper:")) return;
    await this.deps.walletLinks.link(address, paperUserId, Date.now());
  }

  /** Vrai si l'auth Xaman est disponible (clés XUMM câblées). */
  get xamanEnabled(): boolean {
    return this.deps.xaman !== undefined;
  }

  get externalEnabled(): boolean {
    return this.deps.external !== undefined;
  }

  /**
   * Lie la première connexion externe à la session Paper courante. Aux connexions
   * suivantes, l'identité externe retrouve le même `paper:*`, donc les mêmes
   * trades et le même wallet custodial, y compris depuis un autre navigateur.
   */
  async loginExternal(
    accessToken: string,
    currentUserId: string | null,
  ): Promise<{ token: string; userId: string; provider: string; email: string | null }> {
    if (this.deps.external === undefined) throw new AuthError("login email/social non configuré");
    const identity = await this.deps.external.verifier.verify(accessToken);
    const proposed = currentUserId?.startsWith("paper:") === true ? currentUserId : null;
    const linked = await this.deps.external.identities.bindOrResolve(identity, proposed, Date.now());
    if (linked === null) {
      throw new AuthError("ouvre d'abord une session Paper Tide avant de créer ce compte");
    }
    return {
      token: this.issueToken(linked.userId),
      userId: linked.userId,
      provider: linked.provider,
      email: linked.email,
    };
  }

  /**
   * Crée une identité Paper opaque et son JWT. L'identifiant est généré côté
   * serveur : le navigateur ne peut ni choisir ni usurper le compte d'un autre.
   */
  issuePaperSession(): { token: string; userId: string } {
    const id = (this.deps.paperSessionId ?? randomUUID)();
    if (id.trim() === "") {
      throw new AuthError("identité Paper invalide");
    }
    const userId = `paper:${id}`;
    return { token: this.issueToken(userId), userId };
  }

  /**
   * Renouvelle une session Paper en conservant exactement le meme `sub`.
   *
   * Le JWT peut etre expire (c'est precisement le cas a recuperer apres un
   * retour sur l'app), mais sa signature doit rester valide, son sujet doit
   * etre une identite Paper et son emission dater de moins de 90 jours. Cela
   * evite de remplacer silencieusement le portefeuille virtuel par une nouvelle
   * identite lorsque le token court de 24 h expire.
   */
  refreshPaperSession(header: string | undefined): { token: string; userId: string } {
    if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
      throw new AuthError("session Paper manquante");
    }
    try {
      const payload: string | JwtPayload = jwt.verify(
        header.slice(BEARER_PREFIX.length),
        this.deps.secret,
        { ignoreExpiration: true },
      );
      if (
        typeof payload !== "object" ||
        typeof payload.sub !== "string" ||
        !payload.sub.startsWith("paper:") ||
        typeof payload.iat !== "number"
      ) {
        throw new AuthError("session Paper invalide");
      }
      const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
      if (ageSeconds < -60 || ageSeconds > PAPER_REFRESH_MAX_AGE_SECONDS) {
        throw new AuthError("session Paper trop ancienne");
      }
      return { token: this.issueToken(payload.sub), userId: payload.sub };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError("session Paper invalide");
    }
  }

  /** Émet un challenge pour l'adresse (GemWallet). Renvoie le nonce + le message à signer. */
  issueChallenge(address: string): { nonce: string; message: string } {
    this.assertAddress(address);
    const nonce = this.deps.challenges.issue(address);
    return { nonce, message: challengeMessage(address, nonce) };
  }

  /**
   * Vérifie une preuve GemWallet. Consomme le nonce (usage unique, même en cas
   * d'échec en aval), valide la signature du message, et exige que la clé publique
   * dérive bien l'adresse revendiquée. Lève `AuthError` sur tout échec.
   */
  verifyGem(input: GemVerifyInput): string {
    this.assertAddress(input.address);
    if (!this.deps.challenges.consume(input.address, input.nonce)) {
      throw new AuthError("challenge invalide ou expiré");
    }
    const message = challengeMessage(input.address, input.nonce);
    if (!verifyMessageSignature(message, input.signature, input.publicKey)) {
      throw new AuthError("signature invalide");
    }
    if (addressFromPublicKey(input.publicKey) !== input.address) {
      throw new AuthError("la clé publique ne correspond pas à l'adresse");
    }
    return input.address;
  }

  /**
   * Vérifie une preuve Xaman : le payload `SignIn` doit être signé et porter une
   * adresse. Lève `XamanNotConfiguredError` si XUMM n'est pas câblé, `AuthError`
   * si le payload n'est pas une preuve valide.
   */
  async verifyXaman(uuid: string): Promise<string> {
    if (this.deps.xaman === undefined) {
      throw new XamanNotConfiguredError();
    }
    const status = await this.deps.xaman.get(uuid);
    if (status === null || !status.signed || status.account === null) {
      throw new AuthError("payload Xaman non signé");
    }
    return status.account;
  }

  /** JWT de session HS256, `sub = identité wallet ou Paper`, expiration = TTL. */
  issueToken(address: string): string {
    return jwt.sign({}, this.deps.secret, {
      subject: address,
      expiresIn: this.deps.ttlSeconds,
    });
  }

  /**
   * Extrait et vérifie l'adresse d'un header `Authorization: Bearer <jwt>`.
   * Renvoie `null` (jamais d'exception) pour tout token absent, mal formé,
   * expiré ou de mauvaise signature.
   */
  verifyToken(header: string | undefined): string | null {
    if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
      return null;
    }
    const token = header.slice(BEARER_PREFIX.length);
    try {
      const payload: string | JwtPayload = jwt.verify(token, this.deps.secret);
      if (typeof payload === "object" && typeof payload.sub === "string") {
        return payload.sub;
      }
      return null;
    } catch {
      // Token invalide/expiré = pas d'identité (le garde renverra 401).
      return null;
    }
  }

  private assertAddress(address: string): void {
    try {
      assertValidAddress(address, "address");
    } catch {
      throw new AuthError("adresse invalide");
    }
  }
}
