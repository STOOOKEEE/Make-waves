import { describe, expect, it } from "vitest";
import { CompetitionService } from "../src/services/competition-service";
import { InMemoryCompetitionStore } from "../src/store/competition-store";
import { SqliteCompetitionStore } from "../src/store/sqlite-competition-store";
import type { CompetitionDefinition, CompetitionStore } from "../src/store/competition-store";
import { openDatabase } from "../src/store/sqlite";

const COMP: CompetitionDefinition = {
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

const stores: ReadonlyArray<{ name: string; make: () => CompetitionStore }> = [
  { name: "InMemory", make: () => new InMemoryCompetitionStore() },
  { name: "Sqlite", make: () => new SqliteCompetitionStore() },
];

for (const { name, make } of stores) {
  describe(`${name}CompetitionStore`, () => {
    it("persiste la définition, la preuve du ticket et le gagnant", () => {
      let now = 1_200;
      const store = make();
      const service = new CompetitionService(store, () => now, () => true);
      service.create(COMP);
      service.join(COMP.id, {
        userId: "alice",
        walletAddress: "rAlice",
        paymentTxHash: "A".repeat(64),
        entryEquity: 100,
      });
      expect(service.participants(COMP.id)).toEqual(["alice"]);
      expect(store.hasPaymentTx("A".repeat(64))).toBe(true);
      now = 2_001;
      expect(service.close(COMP.id, () => 110)).toMatchObject({ pot: 0.01 });
      expect(store.winner(COMP.id)).toBe("alice");
    });
  });
}

describe("migration du catalogue de démonstration", () => {
  it("supprime l'ancien schéma dont les entrées n'avaient aucune preuve XRPL", () => {
    const db = openDatabase(":memory:");
    try {
      db.exec(`
        CREATE TABLE competitions (
          id TEXT PRIMARY KEY,
          buy_in REAL NOT NULL,
          rake_ratio REAL NOT NULL,
          payout_weights TEXT NOT NULL,
          closed INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE entries (competition_id TEXT NOT NULL, user_id TEXT NOT NULL);
        INSERT INTO competitions VALUES ('demo', 10, 0.1, '[1]', 0);
        INSERT INTO entries VALUES ('demo', 'quant_viper');
      `);
      const store = new SqliteCompetitionStore(db);
      expect(store.list()).toEqual([]);
      expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'entries'").get()).toBeUndefined();
    } finally {
      db.close();
    }
  });
});
