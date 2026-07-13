import { describe, it, expect } from "vitest";
import type { Transaction } from "xrpl";
import {
  XrplNftIssuer,
  type IssuerLedgerClient,
} from "../src/nft/issuer";

// Seed de test bien connu (compte genesis) — jamais utilisé en prod.
const ISSUER_SEED = "snoPBrXtMeMyMHUVTgbuqAfg1SUTb";
const USER = "ra6hLorXqVpwb7jWfekgjPcPFRHrQqANZg";
const SOURCE_TAG = 2606210009;
const NFT_ID =
  "00082710" + "1234567890ABCDEF" + "1234567890ABCDEF" + "1234567890ABCDEF" + "1234ABCD";
const OFFER_ID =
  "ABCDEF01" + "1234567890ABCDEF" + "1234567890ABCDEF" + "1234567890ABCDEF" + "0011AABB";

/** Faux ledger : autofill minimal (offline sign) + meta successives mint/offer. */
function fakeLedger(): {
  client: IssuerLedgerClient;
  state: { connected: boolean; disconnected: boolean; submits: number };
} {
  const state = { connected: false, disconnected: false, submits: 0 };
  const metas = [{ nftoken_id: NFT_ID }, { offer_id: OFFER_ID }];
  const hashes = [`${"A".repeat(64)}`, `${"B".repeat(64)}`];
  const client: IssuerLedgerClient = {
    connect: async () => {
      state.connected = true;
    },
    disconnect: async () => {
      state.disconnected = true;
    },
    autofill: async (tx: Transaction): Promise<Transaction> => {
      const filled = { ...tx, Sequence: 1, Fee: "12", LastLedgerSequence: 100 };
      return filled as Transaction;
    },
    submitAndWait: async () => {
      const i = state.submits;
      state.submits += 1;
      return { result: { hash: hashes[i] as string, meta: metas[i] } };
    },
  };
  return { client, state };
}

describe("XrplNftIssuer", () => {
  it("mint + sell-offer et renvoie les ids lus dans les métadonnées", async () => {
    const { client, state } = fakeLedger();
    const issuer = new XrplNftIssuer({
      serverUrl: "wss://unused.example",
      issuerSeed: ISSUER_SEED,
      sourceTag: SOURCE_TAG,
      clientFactory: () => client,
    });

    const result = await issuer.issueBadge({
      uri: "https://tide.example/nft-metadata/first_trade",
      taxon: 1,
      destination: USER,
    });

    expect(result.nftTokenId).toBe(NFT_ID);
    expect(result.sellOfferId).toBe(OFFER_ID);
    expect(result.mintHash).toBe("A".repeat(64));
    expect(result.offerHash).toBe("B".repeat(64));
    expect(state.submits).toBe(2);
    expect(state.connected).toBe(true);
    expect(state.disconnected).toBe(true);
  });

  it("expose l'adresse issuer dérivée du seed", () => {
    const issuer = new XrplNftIssuer({
      serverUrl: "wss://unused.example",
      issuerSeed: ISSUER_SEED,
      sourceTag: SOURCE_TAG,
      clientFactory: () => fakeLedger().client,
    });
    expect(issuer.issuerAddress).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/);
  });

  it("ferme la connexion même si le submit échoue", async () => {
    const { state } = fakeLedger();
    const failing: IssuerLedgerClient = {
      connect: async () => {
        state.connected = true;
      },
      disconnect: async () => {
        state.disconnected = true;
      },
      autofill: async (tx: Transaction): Promise<Transaction> =>
        ({ ...tx, Sequence: 1, Fee: "12", LastLedgerSequence: 100 } as Transaction),
      submitAndWait: async () => {
        throw new Error("ledger down");
      },
    };
    const issuer = new XrplNftIssuer({
      serverUrl: "wss://unused.example",
      issuerSeed: ISSUER_SEED,
      sourceTag: SOURCE_TAG,
      clientFactory: () => failing,
    });
    await expect(
      issuer.issueBadge({ uri: "u://x", taxon: 1, destination: USER }),
    ).rejects.toThrow("ledger down");
    expect(state.disconnected).toBe(true);
  });
});
