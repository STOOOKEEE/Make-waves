import { describe, it, expect, beforeEach } from "vitest";
import { CompetitionService } from "../src/services/competition-service";
import {
  AlreadyJoinedError,
  CompetitionClosedError,
  CompetitionExistsError,
  CompetitionNotFoundError,
  InvalidUserError,
} from "../src/services/errors";
import { InvalidCompetitionError, type Competition } from "@tide/core";

const COMP: Competition = {
  id: "comp-1",
  buyIn: 10,
  rakeRatio: 0,
  payoutWeights: [0.5, 0.3, 0.2],
};

describe("CompetitionService — création", () => {
  let service: CompetitionService;
  beforeEach(() => {
    service = new CompetitionService();
  });

  it("crée une compétition", () => {
    service.create(COMP);
    expect(service.isClosed("comp-1")).toBe(false);
  });

  it("rejette un id vide", () => {
    expect(() => service.create({ ...COMP, id: " " })).toThrow(
      InvalidCompetitionError,
    );
  });

  it("rejette un doublon", () => {
    service.create(COMP);
    expect(() => service.create(COMP)).toThrow(CompetitionExistsError);
  });

  it("rejette des paramètres invalides (poids incohérents)", () => {
    expect(() =>
      service.create({ ...COMP, id: "bad", payoutWeights: [0.5, 0.3] }),
    ).toThrow(InvalidCompetitionError);
  });
});

describe("CompetitionService — inscription", () => {
  let service: CompetitionService;
  beforeEach(() => {
    service = new CompetitionService();
    service.create(COMP);
  });

  it("inscrit des joueurs distincts", () => {
    service.join("comp-1", "alice");
    service.join("comp-1", "bob");
    expect(service.participants("comp-1").sort()).toEqual(["alice", "bob"]);
  });

  it("rejette une double inscription", () => {
    service.join("comp-1", "alice");
    expect(() => service.join("comp-1", "alice")).toThrow(AlreadyJoinedError);
  });

  it("rejette un userId vide", () => {
    expect(() => service.join("comp-1", "  ")).toThrow(InvalidUserError);
  });

  it("rejette une compétition inconnue", () => {
    expect(() => service.join("nope", "alice")).toThrow(
      CompetitionNotFoundError,
    );
  });
});

describe("CompetitionService — clôture", () => {
  let service: CompetitionService;
  beforeEach(() => {
    service = new CompetitionService();
    service.create(COMP);
  });

  it("classe par equity et calcule les gains", () => {
    service.join("comp-1", "alice");
    service.join("comp-1", "bob");
    service.join("comp-1", "carol");
    const equities: Record<string, number> = { alice: 100, bob: 300, carol: 200 };
    const { payouts, undistributed } = service.close(
      "comp-1",
      (u) => equities[u] ?? 0,
    );
    // pool = 10 * 3 = 30, rake 0 -> 30 distribué
    expect(payouts.map((p) => p.userId)).toEqual(["bob", "carol", "alice"]);
    expect(payouts.reduce((s, p) => s + p.amount, 0)).toBeCloseTo(30);
    expect(undistributed).toBeCloseTo(0);
    expect(service.isClosed("comp-1")).toBe(true);
  });

  it("expose le reliquat quand sous-rempli", () => {
    service.join("comp-1", "alice");
    const { payouts, undistributed } = service.close("comp-1", () => 100);
    // 1 joueur, pool 10, il touche 50% -> reliquat 5
    expect(payouts).toHaveLength(1);
    expect(undistributed).toBeCloseTo(5);
  });

  it("interdit une double clôture (anti double paiement)", () => {
    service.join("comp-1", "alice");
    service.close("comp-1", () => 100);
    expect(() => service.close("comp-1", () => 100)).toThrow(
      CompetitionClosedError,
    );
  });

  it("interdit de rejoindre une compétition clôturée", () => {
    service.close("comp-1", () => 0);
    expect(() => service.join("comp-1", "late")).toThrow(CompetitionClosedError);
  });

  it("clôture une compétition vide sans gain ni reliquat", () => {
    const { payouts, undistributed } = service.close("comp-1", () => 0);
    expect(payouts).toEqual([]);
    expect(undistributed).toBe(0);
    expect(service.isClosed("comp-1")).toBe(true);
  });
});

describe("CompetitionService — garanties d'état (paiement)", () => {
  let service: CompetitionService;
  beforeEach(() => {
    service = new CompetitionService();
    service.create(COMP);
    service.join("comp-1", "alice");
  });

  it("un provider NaN lève et laisse la compétition OUVERTE (réessayable)", () => {
    expect(() => service.close("comp-1", () => Number.NaN)).toThrow(
      InvalidCompetitionError,
    );
    expect(service.isClosed("comp-1")).toBe(false);
    // Réessai avec un provider sain : réussit.
    const { payouts } = service.close("comp-1", () => 100);
    expect(payouts).toHaveLength(1);
    expect(service.isClosed("comp-1")).toBe(true);
  });

  it("si equityOf lève, l'état reste réessayable (anti double paiement)", () => {
    const boom = (): number => {
      throw new Error("feed indisponible");
    };
    expect(() => service.close("comp-1", boom)).toThrow("feed indisponible");
    expect(service.isClosed("comp-1")).toBe(false);
    expect(service.close("comp-1", () => 100).payouts).toHaveLength(1);
  });

  it("participants() ne fuit pas la référence interne", () => {
    const list = service.participants("comp-1");
    list.push("intrus");
    expect(service.participants("comp-1")).toEqual(["alice"]);
  });
});
