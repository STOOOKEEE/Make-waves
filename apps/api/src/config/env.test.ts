import { afterEach, describe, expect, it } from "vitest";
import {
  readAdminToken,
  readCorsOrigin,
  readOperatorUserIds,
  readPrivateAdminRuntimeConfig,
  readFirstTradeImageUri,
  readExternalAuthConfig,
  readPaperWalletRuntimeConfig,
  readSessionSecret,
  readSessionTtlSeconds,
} from "./env";

const KEYS = [
  "TIDE_ADMIN_TOKEN",
  "TIDE_PRIVATE_ADMIN_PORT",
  "TIDE_OPERATOR_USER_IDS",
  "TIDE_SESSION_SECRET",
  "TIDE_SESSION_TTL",
  "TIDE_CORS_ORIGIN",
  "TIDE_XRPL_NETWORK",
  "TIDE_FIRST_TRADE_IMAGE_URI",
  "TIDE_PAPER_WALLET_WSS_URL",
  "TIDE_PAPER_WALLET_SOURCE_TAG",
  "TIDE_PAPER_WALLET_ISSUER_SEED",
  "TIDE_PAPER_WALLET_FUNDER_SEED",
  "TIDE_PAPER_WALLET_KEY_MASTER",
  "TIDE_PAPER_WALLET_KEY_ID",
  "TIDE_PAPER_WALLET_MAINNET_ACK",
  "TIDE_PAPER_WALLET_RECOVERY_ADDRESS",
  "TIDE_PAPER_WALLET_MAX_WALLETS",
  "TIDE_PAPER_WALLET_MAX_DAILY",
  "TIDE_AUTH_SUPABASE_URL",
  "TIDE_AUTH_SUPABASE_PUBLISHABLE_KEY",
] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("readAdminToken", () => {
  it("renvoie undefined si absent", () => {
    expect(readAdminToken()).toBeUndefined();
  });
  it("renvoie le token configuré", () => {
    process.env["TIDE_ADMIN_TOKEN"] = "secret";
    expect(readAdminToken()).toBe("secret");
  });
  it("reste désactivé en production même si un token est configuré", () => {
    const previousNodeEnv = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";
    process.env["TIDE_ADMIN_TOKEN"] = "ancien-secret";
    try {
      expect(readAdminToken()).toBeUndefined();
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env["NODE_ENV"];
      } else {
        process.env["NODE_ENV"] = previousNodeEnv;
      }
    }
  });
});

describe("readExternalAuthConfig", () => {
  it("reste optionnelle et exige une configuration complète", () => {
    expect(readExternalAuthConfig()).toBeUndefined();
    process.env["TIDE_AUTH_SUPABASE_URL"] = "https://project.supabase.co";
    expect(() => readExternalAuthConfig()).toThrow(/incomplète/);
    process.env["TIDE_AUTH_SUPABASE_PUBLISHABLE_KEY"] = "publishable-key-long-enough";
    expect(readExternalAuthConfig()).toEqual({
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "publishable-key-long-enough",
    });
  });
});

describe("readPrivateAdminRuntimeConfig", () => {
  it("active un port admin distinct uniquement en production", () => {
    const previousNodeEnv = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";
    process.env["TIDE_ADMIN_TOKEN"] = "a".repeat(32);
    process.env["TIDE_PRIVATE_ADMIN_PORT"] = "3101";
    try {
      expect(readPrivateAdminRuntimeConfig()).toEqual({ token: "a".repeat(32), port: 3101 });
    } finally {
      if (previousNodeEnv === undefined) delete process.env["NODE_ENV"];
      else process.env["NODE_ENV"] = previousNodeEnv;
    }
  });

  it("refuse une configuration partielle ou le port public", () => {
    const previousNodeEnv = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";
    process.env["TIDE_ADMIN_TOKEN"] = "a".repeat(32);
    try {
      expect(() => readPrivateAdminRuntimeConfig()).toThrow(/incomplète/);
      process.env["TIDE_PRIVATE_ADMIN_PORT"] = "3000";
      expect(() => readPrivateAdminRuntimeConfig()).toThrow(/distinct/);
    } finally {
      if (previousNodeEnv === undefined) delete process.env["NODE_ENV"];
      else process.env["NODE_ENV"] = previousNodeEnv;
    }
  });
});

describe("readFirstTradeImageUri", () => {
  it("reste optionnelle", () => {
    expect(readFirstTradeImageUri()).toBeUndefined();
  });
  it("accepte uniquement une URI IPFS", () => {
    process.env["TIDE_FIRST_TRADE_IMAGE_URI"] = "ipfs://bafybeigdyrzt/first-trade.png";
    expect(readFirstTradeImageUri()).toBe("ipfs://bafybeigdyrzt/first-trade.png");
    process.env["TIDE_FIRST_TRADE_IMAGE_URI"] = "https://example.com/first.png";
    expect(() => readFirstTradeImageUri()).toThrow(/ipfs/);
  });
});

describe("readPaperWalletRuntimeConfig", () => {
  const validSeed = `s${"a".repeat(28)}`;

  function configure(): void {
    process.env["TIDE_PAPER_WALLET_WSS_URL"] = "wss://xrplcluster.com";
    process.env["TIDE_PAPER_WALLET_SOURCE_TAG"] = "123";
    process.env["TIDE_PAPER_WALLET_ISSUER_SEED"] = validSeed;
    process.env["TIDE_PAPER_WALLET_FUNDER_SEED"] = validSeed;
    process.env["TIDE_PAPER_WALLET_KEY_MASTER"] = "ab".repeat(32);
  }

  it("reste désactivé si aucune variable dédiée n'est présente", () => {
    expect(readPaperWalletRuntimeConfig()).toBeUndefined();
  });

  it("refuse un endpoint de test", () => {
    configure();
    process.env["TIDE_PAPER_WALLET_WSS_URL"] = "wss://s.altnet.rippletest.net:51233";
    expect(() => readPaperWalletRuntimeConfig()).toThrow(/endpoint de test/);
  });

  it("active Mainnet uniquement avec acknowledgement, récupération et plafonds", () => {
    configure();
    expect(() => readPaperWalletRuntimeConfig()).toThrow(/MAINNET_ACK/);
    process.env["TIDE_PAPER_WALLET_MAINNET_ACK"] = "I_UNDERSTAND_THIS_SPENDS_REAL_XRP";
    process.env["TIDE_PAPER_WALLET_RECOVERY_ADDRESS"] = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
    process.env["TIDE_PAPER_WALLET_MAX_WALLETS"] = "300";
    process.env["TIDE_PAPER_WALLET_MAX_DAILY"] = "25";
    expect(readPaperWalletRuntimeConfig()).toMatchObject({
      network: "mainnet",
      maxFundedWallets: 300,
      maxFundedWalletsPerDay: 25,
      recoveryAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    });
  });

  it("refuse toute configuration partielle", () => {
    for (const k of KEYS) delete process.env[k];
    process.env["TIDE_PAPER_WALLET_FUNDER_SEED"] = validSeed;
    expect(() => readPaperWalletRuntimeConfig()).toThrow(/incomplète/);
  });
});

describe("readOperatorUserIds", () => {
  it("renvoie [] si absent", () => {
    expect(readOperatorUserIds()).toEqual([]);
  });
  it("parse un CSV en ignorant espaces et entrées vides", () => {
    process.env["TIDE_OPERATOR_USER_IDS"] = " me , ,  test-2 ";
    expect(readOperatorUserIds()).toEqual(["me", "test-2"]);
  });
});

describe("readSessionSecret", () => {
  it("lève si absent (auth obligatoire au boot)", () => {
    expect(() => readSessionSecret()).toThrow();
  });
  it("lève si trop court", () => {
    process.env["TIDE_SESSION_SECRET"] = "trop-court";
    expect(() => readSessionSecret()).toThrow();
  });
  it("renvoie le secret suffisamment long", () => {
    process.env["TIDE_SESSION_SECRET"] = "a".repeat(32);
    expect(readSessionSecret()).toBe("a".repeat(32));
  });
});

describe("readSessionTtlSeconds", () => {
  it("défaut 24 h si absent", () => {
    expect(readSessionTtlSeconds()).toBe(24 * 60 * 60);
  });
  it("lève si non entier positif", () => {
    process.env["TIDE_SESSION_TTL"] = "0";
    expect(() => readSessionTtlSeconds()).toThrow();
  });
  it("lit une valeur en secondes", () => {
    process.env["TIDE_SESSION_TTL"] = "3600";
    expect(readSessionTtlSeconds()).toBe(3600);
  });
});

describe("readCorsOrigin", () => {
  it("undefined si absent", () => {
    expect(readCorsOrigin()).toBeUndefined();
  });
  it("parse un CSV d'origines", () => {
    process.env["TIDE_CORS_ORIGIN"] = "https://tidetrade.xyz, https://www.tidetrade.xyz";
    expect(readCorsOrigin()).toEqual(["https://tidetrade.xyz", "https://www.tidetrade.xyz"]);
  });
  it("utilise une allowlist fermée par défaut en production", () => {
    const previous = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";
    try {
      expect(readCorsOrigin()).toEqual([
        "https://tidetrade.xyz",
        "https://www.tidetrade.xyz",
      ]);
    } finally {
      if (previous === undefined) delete process.env["NODE_ENV"];
      else process.env["NODE_ENV"] = previous;
    }
  });
});
