import { describe, it, expect } from "vitest";
import { prizePool, rakeAmount, distributable } from "../src/competition/prize";
import { rankByEquity } from "../src/competition/ranking";
import { computePayouts, undistributedAmount } from "../src/competition/payout";
import {
  assertValidBuyIn,
  assertValidParticipantCount,
  assertValidPayoutWeights,
  assertValidRakeRatio,
} from "../src/competition/validate";
import { InvalidCompetitionError } from "../src/errors";
import type {
  Competition,
  Participant,
  RankedParticipant,
} from "../src/competition/types";

describe("prizePool", () => {
  it("multiplie le buy-in par le nombre de participants", () => {
    expect(prizePool(10, 30)).toBe(300);
  });

  it("vaut 0 sans participant", () => {
    expect(prizePool(10, 0)).toBe(0);
  });

  it("rejette un buy-in ≤ 0", () => {
    expect(() => prizePool(0, 10)).toThrow(InvalidCompetitionError);
  });

  it("rejette un nombre de participants non entier", () => {
    expect(() => prizePool(10, 1.5)).toThrow(InvalidCompetitionError);
  });
});

describe("rake & distributable", () => {
  it("prélève la part de rake", () => {
    expect(rakeAmount(300, 0.1)).toBeCloseTo(30);
  });

  it("distribue le pool moins le rake", () => {
    expect(distributable(300, 0.1)).toBeCloseTo(270);
  });

  it("rejette un rake hors [0, 1[", () => {
    expect(() => assertValidRakeRatio(1)).toThrow(InvalidCompetitionError);
    expect(() => assertValidRakeRatio(-0.1)).toThrow(InvalidCompetitionError);
  });
});

describe("assertValidPayoutWeights", () => {
  it("accepte des poids dont la somme vaut 1", () => {
    expect(() => assertValidPayoutWeights([0.5, 0.3, 0.2])).not.toThrow();
  });

  it("rejette une somme ≠ 1", () => {
    expect(() => assertValidPayoutWeights([0.5, 0.3])).toThrow(
      InvalidCompetitionError,
    );
  });

  it("rejette un poids négatif", () => {
    expect(() => assertValidPayoutWeights([1.2, -0.2])).toThrow(
      InvalidCompetitionError,
    );
  });

  it("rejette une liste vide", () => {
    expect(() => assertValidPayoutWeights([])).toThrow(InvalidCompetitionError);
  });
});

describe("rankByEquity", () => {
  it("classe par equity décroissante et numérote les rangs", () => {
    const participants: Participant[] = [
      { userId: "a", equity: 100 },
      { userId: "b", equity: 300 },
      { userId: "c", equity: 200 },
    ];
    const ranked = rankByEquity(participants);
    expect(ranked.map((r) => r.userId)).toEqual(["b", "c", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("ne modifie pas le tableau d'entrée", () => {
    const participants: Participant[] = [
      { userId: "a", equity: 100 },
      { userId: "b", equity: 300 },
    ];
    rankByEquity(participants);
    expect(participants.map((p) => p.userId)).toEqual(["a", "b"]);
  });
});

describe("computePayouts", () => {
  const competition: Competition = {
    id: "comp-1",
    buyIn: 10,
    rakeRatio: 0.1,
    payoutWeights: [0.5, 0.3, 0.2],
  };

  it("répartit le pool (moins rake) selon les poids", () => {
    const participants: Participant[] = [
      { userId: "a", equity: 100 },
      { userId: "b", equity: 300 },
      { userId: "c", equity: 200 },
    ];
    const payouts = computePayouts(competition, rankByEquity(participants));
    // pool = 10 * 3 = 30 ; distribuable = 27
    expect(payouts.map((p) => p.userId)).toEqual(["b", "c", "a"]);
    expect(payouts[0]?.amount).toBeCloseTo(13.5);
    expect(payouts[1]?.amount).toBeCloseTo(8.1);
    expect(payouts[2]?.amount).toBeCloseTo(5.4);
    const total = payouts.reduce((s, p) => s + p.amount, 0);
    expect(total).toBeCloseTo(27);
  });

  it("ne paie que les gagnants présents si moins de participants que de tiers", () => {
    const ranked: RankedParticipant[] = [
      { userId: "b", equity: 300, rank: 1 },
      { userId: "a", equity: 100, rank: 2 },
    ];
    const payouts = computePayouts(competition, ranked);
    // pool = 10 * 2 = 20 ; distribuable = 18 ; seuls tiers 1 et 2 versés
    expect(payouts).toHaveLength(2);
    expect(payouts[0]?.amount).toBeCloseTo(9);
    expect(payouts[1]?.amount).toBeCloseTo(5.4);
  });

  it("rejette des poids de répartition incohérents", () => {
    const bad: Competition = { ...competition, payoutWeights: [0.5, 0.3] };
    expect(() => computePayouts(bad, [])).toThrow(InvalidCompetitionError);
  });

  it("conserve exactement le distribuable quand les poids sont représentables", () => {
    const participants: Participant[] = [
      { userId: "a", equity: 100 },
      { userId: "b", equity: 300 },
      { userId: "c", equity: 200 },
    ];
    const payouts = computePayouts(competition, rankByEquity(participants));
    const total = payouts.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(27);
  });

  it("ne paie personne sans participant", () => {
    expect(computePayouts(competition, [])).toEqual([]);
  });

  it("rakeRatio = 0 distribue tout le pool", () => {
    const noRake: Competition = { ...competition, rakeRatio: 0 };
    const ranked = rankByEquity([
      { userId: "a", equity: 100 },
      { userId: "b", equity: 300 },
      { userId: "c", equity: 200 },
    ]);
    const total = computePayouts(noRake, ranked).reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(30); // pool = 10 * 3, rake nul
  });
});

describe("computePayouts — ex-aequo (split-pot)", () => {
  const competition: Competition = {
    id: "comp-ties",
    buyIn: 10,
    rakeRatio: 0,
    payoutWeights: [0.5, 0.3, 0.2],
  };

  it("partage les tiers entre deux ex-aequo en tête", () => {
    const ranked = rankByEquity([
      { userId: "a", equity: 300 },
      { userId: "b", equity: 300 },
      { userId: "c", equity: 100 },
    ]);
    // a et b ex-aequo rang 1 -> partagent (0.5 + 0.3)/2 = 0.4 du distribuable (30)
    const payouts = computePayouts(competition, ranked);
    const byUser = Object.fromEntries(payouts.map((p) => [p.userId, p.amount]));
    expect(byUser["a"]).toBeCloseTo(12);
    expect(byUser["b"]).toBeCloseTo(12);
    expect(byUser["c"]).toBeCloseTo(6);
    expect(payouts.reduce((s, p) => s + p.amount, 0)).toBeCloseTo(30);
  });

  it("attribue le même rang aux ex-aequo (rangs compétition standard)", () => {
    const ranked = rankByEquity([
      { userId: "a", equity: 300 },
      { userId: "b", equity: 200 },
      { userId: "c", equity: 200 },
      { userId: "d", equity: 100 },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("est déterministe à equity égale (départage par userId)", () => {
    const r1 = rankByEquity([
      { userId: "z", equity: 200 },
      { userId: "a", equity: 200 },
    ]);
    const r2 = rankByEquity([
      { userId: "a", equity: 200 },
      { userId: "z", equity: 200 },
    ]);
    expect(r1.map((r) => r.userId)).toEqual(["a", "z"]);
    expect(r2.map((r) => r.userId)).toEqual(["a", "z"]);
  });
});

describe("undistributedAmount", () => {
  const competition: Competition = {
    id: "comp-1",
    buyIn: 10,
    rakeRatio: 0,
    payoutWeights: [0.5, 0.3, 0.2],
  };

  it("vaut 0 quand tous les tiers ont un gagnant", () => {
    const ranked = rankByEquity([
      { userId: "a", equity: 100 },
      { userId: "b", equity: 300 },
      { userId: "c", equity: 200 },
    ]);
    expect(undistributedAmount(competition, ranked)).toBeCloseTo(0);
  });

  it("expose le reliquat quand le tournoi est sous-rempli", () => {
    const ranked = rankByEquity([{ userId: "a", equity: 100 }]);
    // 1 joueur, pool = 10, distribuable = 10 ; il touche 50% -> reliquat 50%
    const payouts = computePayouts(competition, ranked);
    expect(payouts).toHaveLength(1);
    expect(payouts[0]?.amount).toBeCloseTo(5);
    expect(undistributedAmount(competition, ranked)).toBeCloseTo(5);
  });
});

describe("validations de bord", () => {
  it("assertValidBuyIn rejette NaN et Infinity", () => {
    expect(() => assertValidBuyIn(Number.NaN)).toThrow(InvalidCompetitionError);
    expect(() => assertValidBuyIn(Number.POSITIVE_INFINITY)).toThrow(
      InvalidCompetitionError,
    );
  });

  it("assertValidParticipantCount rejette NaN", () => {
    expect(() => assertValidParticipantCount(Number.NaN)).toThrow(
      InvalidCompetitionError,
    );
  });

  it("rankByEquity rejette une equity non finie", () => {
    expect(() =>
      rankByEquity([{ userId: "a", equity: Number.NaN }]),
    ).toThrow(InvalidCompetitionError);
  });
});
