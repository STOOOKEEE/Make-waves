import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

/** Lit une master key depuis une env var (64 hex chars = 32 bytes). */
export function readMasterKey(envValue: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(envValue)) {
    throw new Error("Master key must be 64 hex chars (32 bytes)");
  }
  return Buffer.from(envValue, "hex");
}

export interface EncryptedPayload {
  readonly iv: string;       // hex
  readonly ciphertext: string; // hex
  readonly tag: string;       // hex (GCM auth tag)
  readonly masterKeyId: string;
}

export function encryptPrivateKey(plainHex: string, masterKey: Buffer, masterKeyId: string): EncryptedPayload {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, masterKey, iv);
  const enc = Buffer.concat([cipher.update(plainHex, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    ciphertext: enc.toString("hex"),
    tag: tag.toString("hex"),
    masterKeyId,
  };
}

export function decryptPrivateKey(payload: EncryptedPayload, masterKey: Buffer): string {
  const iv = Buffer.from(payload.iv, "hex");
  const decipher = createDecipheriv(ALGO, masterKey, iv);
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}