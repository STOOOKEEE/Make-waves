import { describe, it, expect } from "vitest";
import { assertValidAddress } from "../src/tx/address";
import { InvalidAddressError } from "../src/errors";

const VALID = "rPkAr4m5jrX21Fcfx5GYuLJ6Yb8oL3Ws5o";

describe("assertValidAddress", () => {
  it("accepte une adresse classique valide", () => {
    expect(() => assertValidAddress(VALID, "account")).not.toThrow();
  });

  it("rejette une chaîne qui n'est pas une adresse", () => {
    expect(() => assertValidAddress("pas-une-adresse", "account")).toThrow(
      InvalidAddressError,
    );
  });

  it("rejette une adresse au checksum invalide", () => {
    expect(() =>
      assertValidAddress("rPkAr4m5jrX21Fcfx5GYuLJ6Yb8oL3Ws5X", "account"),
    ).toThrow(InvalidAddressError);
  });

  it("rejette une chaîne vide", () => {
    expect(() => assertValidAddress("", "account")).toThrow(InvalidAddressError);
  });
});
