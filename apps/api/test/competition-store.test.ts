import { describe, it, expect } from "vitest";
import { CompetitionService } from "../src/services/competition-service";
import { InMemoryCompetitionStore } from "../src/store/competition-store";
import { SqliteCompetitionStore } from "../src/store/sqlite-competition-store";
import type { CompetitionStore } from "../src/store/competition-store";
import {
  AlreadyJoinedError,
  CompetitionClosedError,
  CompetitionNotFoundError,
} from "../src/services/errors";
import { InvalidCompetitionError, type Competition } from "@tide/core";

const COMP: Competition = {
  id: "c1",
  buyIn: 10,
  rakeRatio: 0,
  payoutWeights: [0.5, 0.3, 0.2],
};

const stores: ReadonlyArray<{ name: string; make: () => CompetitionStore }> = [
  { name: "InMemory", make: () => new InMemoryCompetitionStore() },
  { name: "Sqlite", make: () => new SqliteCompetitionStore() },
];

for (const { name, make } of stores) {
  describe(`CompetitionService + ${name}CompetitionStore (comportement identique)`, () => {
    it("crée, inscrit, liste et clôture avec gains", () => {
      const service = new CompetitionService(make());
      service.create(COMP);
      service.join("c1", "a");
      service.join("c1", "b");
      service.join("c1", "c");
      expect(service.participants("c1").sort()).toEqual(["a", "b", "c"]);

      const equities: Record<string, number> = { a: 100, b: 300, c: 200 };
      const { payouts } = service.close("c1", (u) => equities[u] ?? 0);
      expect(payouts.map((p) => p.userId)).toEqual(["b", "c", "a"]);
      expect(payouts.reduce((s, p) => s + p.amount, 0)).toBeCloseTo(30);
      expect(service.isClosed("c1")).toBe(true);
    });

    it("rejette la double inscription", () => {
      const service = new CompetitionService(make());
      service.create(COMP);
      service.join("c1", "a");
      expect(() => service.join("c1", "a")).toThrow(AlreadyJoinedError);
    });

    it("rejette le doublon de compétition", () => {
      const service = new CompetitionService(make());
      service.create(COMP);
      expect(() => service.create(COMP)).toThrow();
    });

    it("interdit la double clôture (anti double paiement)", () => {
      const service = new CompetitionService(make());
      service.create(COMP);
      service.join("c1", "a");
      service.close("c1", () => 100);
      expect(() => service.close("c1", () => 100)).toThrow(
        CompetitionClosedError,
      );
    });

    it("un provider NaN laisse la compétition réessayable", () => {
      const service = new CompetitionService(make());
      service.create(COMP);
      service.join("c1", "a");
      expect(() => service.close("c1", () => Number.NaN)).toThrow(
        InvalidCompetitionError,
      );
      expect(service.isClosed("c1")).toBe(false);
      expect(service.close("c1", () => 100).payouts).toHaveLength(1);
    });

    it("lève sur une compétition inconnue", () => {
      const service = new CompetitionService(make());
      expect(() => service.participants("nope")).toThrow(
        CompetitionNotFoundError,
      );
    });
  });
}
