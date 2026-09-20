import { describe, expect, it } from "vitest";
import { deriveKeypair, sign } from "ripple-keypairs";
import { addressFromPublicKey, verifyMessageSignature } from "./message";

// Compte racine XRPL (known-answer) : seed → clé publique → adresse déterministes.
const ROOT_SEED = "snoPBrXtMeMyMHUVTgbuqAfg1SUTb";
const ROOT_ADDRESS = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

function signUtf8(message: string, privateKey: string): string {
  return sign(Buffer.from(message, "utf8").toString("hex").toUpperCase(), privateKey);
}

describe("addressFromPublicKey", () => {
  it("dérive l'adresse classique r... d'une clé publique", () => {
    const { publicKey } = deriveKeypair(ROOT_SEED);
    expect(addressFromPublicKey(publicKey)).toBe(ROOT_ADDRESS);
  });
});

describe("verifyMessageSignature", () => {
  it("accepte une signature valide du message par sa clé", () => {
    const { publicKey, privateKey } = deriveKeypair(ROOT_SEED);
    const message = "tide-auth:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh:abc123";
    const signature = signUtf8(message, privateKey);
    expect(verifyMessageSignature(message, signature, publicKey)).toBe(true);
  });

  it("rejette une signature portant sur un autre message", () => {
    const { publicKey, privateKey } = deriveKeypair(ROOT_SEED);
    const signature = signUtf8("un-autre-message", privateKey);
    expect(verifyMessageSignature("tide-auth:abc123", signature, publicKey)).toBe(false);
  });

  it("rejette une signature malformée sans lever", () => {
    const { publicKey } = deriveKeypair(ROOT_SEED);
    expect(verifyMessageSignature("msg", "pas-du-hex", publicKey)).toBe(false);
  });
});
