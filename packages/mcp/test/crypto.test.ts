import { describe, it, expect } from "vitest";
import { encryptPrivateKey, decryptPrivateKey, readMasterKey } from "../src/lib/crypto";

const KEY = "a".repeat(64);

describe("crypto helpers", () => {
  it("roundtrips a private key", () => {
    const plain = "ED" + "b".repeat(70) + "AB"; // fake XRPL seed-ish
    const masterKey = readMasterKey(KEY);
    const enc = encryptPrivateKey(plain, masterKey, "v1");
    const dec = decryptPrivateKey(enc, masterKey);
    expect(dec).toBe(plain);
  });
  it("fails to decrypt with wrong master key", () => {
    const enc = encryptPrivateKey("ED00", readMasterKey(KEY), "v1");
    const wrongKey = readMasterKey("b".repeat(64));
    expect(() => decryptPrivateKey(enc, wrongKey)).toThrow();
  });
  it("rejects invalid master key format", () => {
    expect(() => readMasterKey("not-hex")).toThrow();
    expect(() => readMasterKey("abc")).toThrow(); // wrong length
  });
});