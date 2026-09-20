import { describe, it, expect } from "vitest";
import { openDatabase } from "../src/store/sqlite";
import { SqliteAccountStore } from "../src/store/sqlite-account-store";
import { SqliteCompetitionStore } from "../src/store/sqlite-competition-store";
import { createApp } from "../src/app";
import type { CexFeedConfig, FetchJson } from "../src/feed/cex-price-feed";
import type { CompetitionDefinition } from "../src/store/competition-store";
import { removeLegacyDemoAccounts } from "../src/store/migrations/2026-07-18-remove-demo-data";

const FEED: CexFeedConfig = {
  baseUrl: "https://cex.test/v3",
  symbolToId: { XRP: "ripple" },
  vsCurrency: "usd",
};
const noFetch: FetchJson = () => Promise.resolve({});

describe("persistance partagée (connexion SQLite unique)", () => {
  it("deux instances de store sur la même connexion voient les mêmes données", () => {
    const db = openDatabase(":memory:");
    try {
      const account1 = new SqliteAccountStore(db);
      account1.open("alice", { RLUSD: 1000 });
      const account2 = new SqliteAccountStore(db);
      expect(account2.getBalances("alice")).toEqual({ RLUSD: 1000 });

      const comp1 = new SqliteCompetitionStore(db);
      const competition: CompetitionDefinition = {
        id: "c1",
        nameEn: "Cup",
        nameFr: "Coupe",
        descriptionEn: "Paid",
        descriptionFr: "Payée",
        mode: "paper",
        buyIn: 0.01,
        rakeRatio: 0,
        payoutWeights: [1],
        startsAt: 1_000,
        endsAt: 2_000,
      };
      comp1.create(competition);
      const comp2 = new SqliteCompetitionStore(db);
      expect(comp2.getCompetition("c1")).toEqual(competition);
    } finally {
      db.close();
    }
  });

  it("une nouvelle app sur la même base retrouve les comptes (survie au redémarrage)", async () => {
    const db = openDatabase(":memory:");
    try {
      const first = createApp({
        feed: FEED,
        symbols: ["XRP"],
        fetchJson: noFetch,
        accountStore: new SqliteAccountStore(db),
        competitionStore: new SqliteCompetitionStore(db),
      });
      await first.app.inject({
        method: "POST",
        url: "/accounts",
        payload: { userId: "a" },
      });

      // Simule un redémarrage : une nouvelle app sur la MÊME base.
      const second = createApp({
        feed: FEED,
        symbols: ["XRP"],
        fetchJson: noFetch,
        accountStore: new SqliteAccountStore(db),
        competitionStore: new SqliteCompetitionStore(db),
      });
      const res = await second.app.inject({
        method: "GET",
        url: "/accounts/a/balances",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ RLUSD: 10_000 });
    } finally {
      db.close();
    }
  });

  it("retire uniquement les identités seedées et conserve les vraies sessions", () => {
    const db = openDatabase(":memory:");
    try {
      const accounts = new SqliteAccountStore(db);
      accounts.open("quant_viper", { RLUSD: 10_000 });
      accounts.open("paper:real-session", { RLUSD: 10_000 });
      removeLegacyDemoAccounts(db);
      expect(accounts.getBalances("quant_viper")).toBeUndefined();
      expect(accounts.getBalances("paper:real-session")).toEqual({ RLUSD: 10_000 });
    } finally {
      db.close();
    }
  });
});
