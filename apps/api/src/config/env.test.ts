import { afterEach, describe, expect, it } from "vitest";
import {
  readAdminToken,
  readArenaSimulationConfig,
  readTestnetE2EConfig,
  readCorsOrigin,
  readOperatorUserIds,
  readFirstTradeImageUri,
  readPaperWalletRuntimeConfig,
  readSessionSecret,
  readSessionTtlSeconds,
} from "./env";

const KEYS = [
  "TIDE_ADMIN_TOKEN",
  "TIDE_OPERATOR_USER_IDS",
  "TIDE_SESSION_SECRET",
  "TIDE_SESSION_TTL",
  "TIDE_CORS_ORIGIN",
  "TIDE_SIMULATION_USERS",
  "TIDE_SIMULATION_TRADES_PER_TICK",
  "TIDE_SIMULATION_TICK_MS",
  "TIDE_E2E_TESTNET_USERS",
  "TIDE_E2E_TESTNET_ISSUER_SEED",
  "TIDE_E2E_TESTNET_SOURCE_TAG",
  "TIDE_E2E_TESTNET_WSS_URL",
  "TIDE_XRPL_NETWORK",
  "TIDE_FIRST_TRADE_IMAGE_URI",
  "TIDE_PAPER_WALLET_NETWORK",
  "TIDE_PAPER_WALLET_WSS_URL",
  "TIDE_PAPER_WALLET_SOURCE_TAG",
  "TIDE_PAPER_WALLET_ISSUER_SEED",
  "TIDE_PAPER_WALLET_FUNDER_SEED",
  "TIDE_PAPER_WALLET_KEY_MASTER",
  "TIDE_PAPER_WALLET_KEY_ID",
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

  function configure(network = "testnet"): void {
    process.env["TIDE_PAPER_WALLET_NETWORK"] = network;
    process.env["TIDE_PAPER_WALLET_WSS_URL"] = "wss://s.altnet.rippletest.net:51233";
    process.env["TIDE_PAPER_WALLET_SOURCE_TAG"] = "123";
    process.env["TIDE_PAPER_WALLET_ISSUER_SEED"] = validSeed;
    process.env["TIDE_PAPER_WALLET_FUNDER_SEED"] = validSeed;
    process.env["TIDE_PAPER_WALLET_KEY_MASTER"] = "ab".repeat(32);
    process.env["TIDE_FIRST_TRADE_IMAGE_URI"] = "ipfs://bafyfirsttrade";
  }

  it("reste désactivé si aucune variable dédiée n'est présente", () => {
    expect(readPaperWalletRuntimeConfig()).toBeUndefined();
  });

  it("isole un runtime Testnet complet du réseau Live", () => {
    configure();
    process.env["TIDE_XRPL_NETWORK"] = "mainnet";
    expect(readPaperWalletRuntimeConfig()).toMatchObject({
      network: "testnet",
      sourceTag: 123,
      serverUrl: "wss://s.altnet.rippletest.net:51233",
      firstTradeImageUri: "ipfs://bafyfirsttrade",
    });
  });

  it("refuse Mainnet et toute configuration partielle", () => {
    configure("mainnet");
    expect(() => readPaperWalletRuntimeConfig()).toThrow(/testnet/);
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

describe("readArenaSimulationConfig", () => {
  it("reste désactivée sans configuration", () => {
    expect(readArenaSimulationConfig()).toMatchObject({ users: 0, tradesPerTick: 0 });
  });
  it("lit le scénario de charge explicite", () => {
    process.env["TIDE_SIMULATION_USERS"] = "300";
    process.env["TIDE_SIMULATION_TRADES_PER_TICK"] = "15";
    process.env["TIDE_SIMULATION_TICK_MS"] = "60000";
    expect(readArenaSimulationConfig()).toEqual({
      users: 300,
      tradesPerTick: 15,
      tickIntervalMs: 60_000,
    });
  });
  it("refuse une cadence trop rapide", () => {
    process.env["TIDE_SIMULATION_USERS"] = "300";
    process.env["TIDE_SIMULATION_TICK_MS"] = "1000";
    expect(() => readArenaSimulationConfig()).toThrow();
  });
});

describe("readTestnetE2EConfig", () => {
  it("reste off sans nombre de profils", () => {
    expect(readTestnetE2EConfig()).toBeUndefined();
  });
  it("refuse tout réseau autre que Testnet", () => {
    process.env["TIDE_E2E_TESTNET_USERS"] = "1";
    expect(() => readTestnetE2EConfig()).toThrow("testnet");
  });
  it("lit une configuration Testnet complète", () => {
    process.env["TIDE_XRPL_NETWORK"] = "testnet";
    process.env["TIDE_E2E_TESTNET_USERS"] = "2";
    process.env["TIDE_E2E_TESTNET_ISSUER_SEED"] = "sEd7e5DsqP1E3Vpv6t3knnP7E4EcaD2";
    process.env["TIDE_E2E_TESTNET_SOURCE_TAG"] = "123";
    expect(readTestnetE2EConfig()).toMatchObject({ users: 2, sourceTag: 123 });
  });
});
