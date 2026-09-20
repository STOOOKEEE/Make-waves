import { describe, it, expect } from "vitest";
import { convertHexToString, NFTokenCreateOfferFlags } from "xrpl";
import {
  buildBadgeAcceptOffer,
  buildBadgeMint,
  buildBadgeSellOffer,
  readMintedNftId,
  readOfferId,
} from "../src/tx/nft";
import { InvalidAddressError, InvalidNftError, InvalidSourceTagError } from "../src/errors";

const ISSUER = "rPkAr4m5jrX21Fcfx5GYuLJ6Yb8oL3Ws5o";
const USER = "ra6hLorXqVpwb7jWfekgjPcPFRHrQqANZg";
const SOURCE_TAG = 2606210009;
const NFT_ID =
  "00082710" + "1234567890ABCDEF" + "1234567890ABCDEF" + "1234567890ABCDEF" + "1234ABCD";
const OFFER_ID =
  "ABCDEF01" + "1234567890ABCDEF" + "1234567890ABCDEF" + "1234567890ABCDEF" + "0011AABB";

describe("buildBadgeMint", () => {
  it("construit un NFTokenMint soulbound taggé", () => {
    const tx = buildBadgeMint({
      issuer: ISSUER,
      uri: "https://tide.example/nft-metadata/first_trade",
      taxon: 1,
      sourceTag: SOURCE_TAG,
    });
    expect(tx.TransactionType).toBe("NFTokenMint");
    expect(tx.Account).toBe(ISSUER);
    expect(tx.NFTokenTaxon).toBe(1);
    expect(convertHexToString(tx.URI as string)).toBe(
      "https://tide.example/nft-metadata/first_trade",
    );
    expect(tx.SourceTag).toBe(SOURCE_TAG);
    // Soulbound : aucun flag transférable, aucun TransferFee.
    expect(tx.Flags).toBeUndefined();
    expect(tx.TransferFee).toBeUndefined();
  });

  it("rejette un issuer invalide", () => {
    expect(() =>
      buildBadgeMint({ issuer: "nope", uri: "u", taxon: 1, sourceTag: SOURCE_TAG }),
    ).toThrow(InvalidAddressError);
  });

  it("rejette un SourceTag nul (attribution perdue)", () => {
    expect(() =>
      buildBadgeMint({ issuer: ISSUER, uri: "u", taxon: 1, sourceTag: 0 }),
    ).toThrow(InvalidSourceTagError);
  });

  it("rejette une URI vide", () => {
    expect(() =>
      buildBadgeMint({ issuer: ISSUER, uri: "  ", taxon: 1, sourceTag: SOURCE_TAG }),
    ).toThrow(InvalidNftError);
  });

  it("rejette un taxon hors uint32", () => {
    expect(() =>
      buildBadgeMint({ issuer: ISSUER, uri: "u", taxon: -1, sourceTag: SOURCE_TAG }),
    ).toThrow(InvalidNftError);
  });
});

describe("buildBadgeSellOffer", () => {
  it("construit une sell-offer à 0 réservée au wallet du user", () => {
    const tx = buildBadgeSellOffer({
      issuer: ISSUER,
      nftTokenId: NFT_ID,
      destination: USER,
      sourceTag: SOURCE_TAG,
    });
    expect(tx.TransactionType).toBe("NFTokenCreateOffer");
    expect(tx.Account).toBe(ISSUER);
    expect(tx.NFTokenID).toBe(NFT_ID);
    expect(tx.Amount).toBe("0");
    expect(tx.Flags).toBe(NFTokenCreateOfferFlags.tfSellNFToken);
    expect(tx.Destination).toBe(USER);
    expect(tx.SourceTag).toBe(SOURCE_TAG);
  });

  it("rejette un NFTokenID malformé", () => {
    expect(() =>
      buildBadgeSellOffer({
        issuer: ISSUER,
        nftTokenId: "xyz",
        destination: USER,
        sourceTag: SOURCE_TAG,
      }),
    ).toThrow(InvalidNftError);
  });
});

describe("buildBadgeAcceptOffer", () => {
  it("construit l'accept signé côté user", () => {
    const tx = buildBadgeAcceptOffer({
      account: USER,
      sellOfferId: OFFER_ID,
      sourceTag: SOURCE_TAG,
    });
    expect(tx.TransactionType).toBe("NFTokenAcceptOffer");
    expect(tx.Account).toBe(USER);
    expect(tx.NFTokenSellOffer).toBe(OFFER_ID);
    expect(tx.SourceTag).toBe(SOURCE_TAG);
  });

  it("rejette un offer id malformé", () => {
    expect(() =>
      buildBadgeAcceptOffer({ account: USER, sellOfferId: "bad", sourceTag: SOURCE_TAG }),
    ).toThrow(InvalidNftError);
  });
});

describe("readMintedNftId / readOfferId", () => {
  it("lit meta.nftoken_id et meta.offer_id", () => {
    expect(readMintedNftId({ nftoken_id: NFT_ID })).toBe(NFT_ID);
    expect(readOfferId({ offer_id: OFFER_ID })).toBe(OFFER_ID);
  });

  it("throw si le champ est absent ou invalide", () => {
    expect(() => readMintedNftId({})).toThrow(InvalidNftError);
    expect(() => readOfferId({ offer_id: "short" })).toThrow(InvalidNftError);
    expect(() => readMintedNftId(null)).toThrow(InvalidNftError);
  });
});
