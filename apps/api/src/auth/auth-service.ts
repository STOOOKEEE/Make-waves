import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { addressFromPublicKey, assertValidAddress, verifyMessageSignature } from "@tide/xrpl";
import type { ChallengeStore } from "./challenge-store";
import type { XamanPayloadApi } from "../xaman/sign-request";

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
}

export interface GemVerifyInput {
  readonly address: string;
  readonly nonce: string;
  readonly signature: string;
  readonly publicKey: string;
}

const BEARER_PREFIX = "Bearer ";

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

  /** Vrai si l'auth Xaman est disponible (clés XUMM câblées). */
  get xamanEnabled(): boolean {
    return this.deps.xaman !== undefined;
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

  /** JWT de session HS256, `sub = adresse`, expiration = TTL configuré. */
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
