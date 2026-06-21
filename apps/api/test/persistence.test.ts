import { describe, it, expect } from "vitest";
import { openDatabase } from "../src/store/sqlite";
import { SqliteAccountStore } from "../src/store/sqlite-account-store";
import { SqliteCompetitionStore } from "../src/store/sqlite-competition-store";
import { createApp } from "../src/app";
import type { CexFeedConfig, FetchJson } from "../src/feed/cex-price-feed";
import type { Competition } from "@tide/core";

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
      const competition: Competition = {
        id: "c1",
        buyIn: 10,
        rakeRatio: 0,
        payoutWeights: [1],
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
});
