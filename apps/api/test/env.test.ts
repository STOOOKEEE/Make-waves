import { describe, it, expect, afterEach } from "vitest";
import { readXrplNetwork, readOnchainPools } from "../src/config/env";

// Adresse XRPL classique valide (émetteur RLUSD mainnet) pour les issuers de pool.
const ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const HEX = "524C555344000000000000000000000000000000";

const TOUCHED = ["TIDE_XRPL_NETWORK", "TIDE_ONCHAIN_POOLS"];

afterEach(() => {
  for (const key of TOUCHED) {
    delete process.env[key];
  }
});

describe("readXrplNetwork", () => {
  it("défaut mainnet quand absent", () => {
    expect(readXrplNetwork()).toBe("mainnet");
  });

  it("accepte testnet + normalise la casse", () => {
    process.env["TIDE_XRPL_NETWORK"] = "TESTNET";
    expect(readXrplNetwork()).toBe("testnet");
  });

  it("lève sur une valeur inconnue", () => {
    process.env["TIDE_XRPL_NETWORK"] = "devnet";
    expect(() => readXrplNetwork()).toThrow(/invalide/i);
  });
});

describe("readOnchainPools", () => {
  it("undefined quand absent (feed mono-source)", () => {
    expect(readOnchainPools()).toBeUndefined();
  });

  it("parse une paire valide (token/XRP)", () => {
    process.env["TIDE_ONCHAIN_POOLS"] = JSON.stringify({
      RLUSD: { asset: { currency: HEX, issuer: ISSUER }, asset2: { currency: "XRP" } },
    });
    expect(readOnchainPools()).toEqual({
      RLUSD: { asset: { currency: HEX, issuer: ISSUER }, asset2: { currency: "XRP" } },
    });
  });

  it("lève sur JSON invalide", () => {
    process.env["TIDE_ONCHAIN_POOLS"] = "{pas du json";
    expect(() => readOnchainPools()).toThrow(/JSON/i);
  });

  it("lève si un tableau au lieu d'un objet", () => {
    process.env["TIDE_ONCHAIN_POOLS"] = "[]";
    expect(() => readOnchainPools()).toThrow(/objet/i);
  });

  it("lève si asset2 manquant", () => {
    process.env["TIDE_ONCHAIN_POOLS"] = JSON.stringify({
      RLUSD: { asset: { currency: HEX, issuer: ISSUER } },
    });
    expect(() => readOnchainPools()).toThrow(/asset2/i);
  });

  it("lève si issuer n'est pas une adresse valide", () => {
    process.env["TIDE_ONCHAIN_POOLS"] = JSON.stringify({
      RLUSD: { asset: { currency: HEX, issuer: "pas-une-adresse" }, asset2: { currency: "XRP" } },
    });
    expect(() => readOnchainPools()).toThrow();
  });
});
