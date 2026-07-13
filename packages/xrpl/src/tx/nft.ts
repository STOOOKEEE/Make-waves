import {
  convertStringToHex,
  NFTokenCreateOfferFlags,
  type NFTokenAcceptOffer,
  type NFTokenCreateOffer,
  type NFTokenMint,
} from "xrpl";
import { assertValidAddress } from "./address";
import { assertAttributionTag } from "./source-tag";
import { MAX_NFT_TAXON } from "../constants";
import { InvalidNftError } from "../errors";

// Builders XLS-20 pour les badges Tide. NFT « soulbound » : minté SANS
// `tfTransferable` (donc pas de `TransferFee`, rejeté sinon) → il ne peut
// circuler qu'entre l'issuer et un autre compte. L'issuer le distribue via une
// sell-offer à 0 destinée au wallet du user, que celui-ci accepte (il signe).
// Toutes les tx portent le `SourceTag` d'attribution Tide.

/** Format d'un identifiant XRPL 256 bits (NFTokenID ou offer id) : 64 hex. */
const NFT_ID_PATTERN = /^[0-9A-Fa-f]{64}$/;

export interface BadgeMintParams {
  /** Compte issuer (= minter) qui portera le NFT jusqu'au transfert. */
  readonly issuer: string;
  /** URL des métadonnées du badge (encodée en hex dans le champ `URI`). */
  readonly uri: string;
  /** `NFTokenTaxon` (uint32) — regroupe les NFT d'un même type de badge. */
  readonly taxon: number;
  /** SourceTag d'attribution Tide (non nul). */
  readonly sourceTag: number;
}

/** Construit le `NFTokenMint` soulbound d'un badge (non signé). */
export function buildBadgeMint(params: BadgeMintParams): NFTokenMint {
  assertValidAddress(params.issuer, "issuer");
  assertBadgeUri(params.uri);
  assertTaxon(params.taxon);
  assertAttributionTag(params.sourceTag);

  return {
    TransactionType: "NFTokenMint",
    Account: params.issuer,
    NFTokenTaxon: params.taxon,
    URI: convertStringToHex(params.uri),
    SourceTag: params.sourceTag,
    // Flags omis (=0) → non transférable. Pas de TransferFee (interdit ici).
  };
}

export interface BadgeSellOfferParams {
  /** Issuer qui détient le NFT fraîchement minté et l'offre à la vente. */
  readonly issuer: string;
  /** `NFTokenID` du badge minté. */
  readonly nftTokenId: string;
  /** Wallet du user, seul autorisé à accepter l'offre. */
  readonly destination: string;
  /** SourceTag d'attribution Tide (non nul). */
  readonly sourceTag: number;
}

/**
 * Construit le `NFTokenCreateOffer` (sell) à 0, réservé au wallet du user.
 * L'issuer signe cette tx ; seul `destination` pourra l'accepter.
 */
export function buildBadgeSellOffer(
  params: BadgeSellOfferParams,
): NFTokenCreateOffer {
  assertValidAddress(params.issuer, "issuer");
  assertValidAddress(params.destination, "destination");
  assertNftId(params.nftTokenId, "nftTokenId");
  assertAttributionTag(params.sourceTag);

  return {
    TransactionType: "NFTokenCreateOffer",
    Account: params.issuer,
    NFTokenID: params.nftTokenId,
    Amount: "0",
    Flags: NFTokenCreateOfferFlags.tfSellNFToken,
    Destination: params.destination,
    SourceTag: params.sourceTag,
  };
}

export interface BadgeAcceptOfferParams {
  /** Wallet du user qui accepte l'offre (il signe cette tx). */
  readonly account: string;
  /** Identifiant de la sell-offer émise par l'issuer. */
  readonly sellOfferId: string;
  /** SourceTag d'attribution Tide (non nul). */
  readonly sourceTag: number;
}

/**
 * Construit le `NFTokenAcceptOffer` (non signé) que le WALLET DU USER signe
 * pour recevoir le badge — c'est la preuve de claim par un humain.
 */
export function buildBadgeAcceptOffer(
  params: BadgeAcceptOfferParams,
): NFTokenAcceptOffer {
  assertValidAddress(params.account, "account");
  assertNftId(params.sellOfferId, "sellOfferId");
  assertAttributionTag(params.sourceTag);

  return {
    TransactionType: "NFTokenAcceptOffer",
    Account: params.account,
    NFTokenSellOffer: params.sellOfferId,
    SourceTag: params.sourceTag,
  };
}

/**
 * Lit le `NFTokenID` du badge dans les métadonnées d'un `NFTokenMint` accepté
 * (`meta.nftoken_id`, champ ajouté par rippled). Throw si absent.
 */
export function readMintedNftId(meta: unknown): string {
  return readMetaHashField(meta, "nftoken_id");
}

/**
 * Lit l'`offer_id` dans les métadonnées d'un `NFTokenCreateOffer` accepté
 * (`meta.offer_id`, champ ajouté par rippled). Throw si absent.
 */
export function readOfferId(meta: unknown): string {
  return readMetaHashField(meta, "offer_id");
}

function readMetaHashField(
  meta: unknown,
  field: "nftoken_id" | "offer_id",
): string {
  if (typeof meta === "object" && meta !== null && field in meta) {
    const value = (meta as Record<string, unknown>)[field];
    if (typeof value === "string" && NFT_ID_PATTERN.test(value)) {
      return value;
    }
  }
  throw new InvalidNftError(
    `Champ ${field} absent ou invalide dans les métadonnées de la transaction`,
  );
}

function assertBadgeUri(uri: string): void {
  if (uri.trim() === "") {
    throw new InvalidNftError("URI de badge vide");
  }
}

function assertTaxon(taxon: number): void {
  if (!Number.isInteger(taxon) || taxon < 0 || taxon > MAX_NFT_TAXON) {
    throw new InvalidNftError(`NFTokenTaxon invalide: ${String(taxon)}`);
  }
}

function assertNftId(id: string, label: string): void {
  if (!NFT_ID_PATTERN.test(id)) {
    throw new InvalidNftError(`${label} invalide (attendu 64 hex): ${id}`);
  }
}
