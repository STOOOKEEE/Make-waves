import { beforeEach, describe, expect, it } from "vitest";
import { InvalidCompetitionError } from "@tide/core";
import { CompetitionService } from "../src/services/competition-service";
import type { CompetitionDefinition } from "../src/store/competition-store";
import {
  AlreadyJoinedError,
  CompetitionClosedError,
  CompetitionExistsError,
  CompetitionPaymentInvalidError,
} from "../src/services/errors";

const COMP: CompetitionDefinition = {
  id: "comp-1",
  nameEn: "Real cup",
  nameFr: "Coupe réelle",
  descriptionEn: "Verified paid competition",
  descriptionFr: "Compétition payée vérifiée",
  mode: "paper",
  buyIn: 0.01,
  rakeRatio: 0,
  payoutWeights: [1],
  startsAt: 1_000,
  endsAt: 2_000,
};

function paid(userId: string, entryEquity = 100) {
  return {
    userId,
    walletAddress: `wallet-${userId}`,
    paymentTxHash: userId.padEnd(64, "A"),
    entryEquity,
  };
}

describe("CompetitionService — données réelles et winner-takes-all", () => {
  let now: number;
  let service: CompetitionService;

  beforeEach(() => {
    now = 1_200;
    service = new CompetitionService(undefined, () => now, () => true);
    service.create(COMP);
  });

  it("expose uniquement l'état calculé depuis les entrées persistées", () => {
    expect(service.get(COMP.id)).toMatchObject({ participants: 0, pot: 0, status: "live" });
    service.join(COMP.id, paid("alice"));
    expect(service.get(COMP.id)).toMatchObject({ participants: 1, pot: 0.01 });
  });

  it("classe par rendement depuis l'equity d'entrée", () => {
    service.join(COMP.id, paid("alice", 100));
    service.join(COMP.id, paid("bob", 200));
    const equities: Record<string, number> = { alice: 110, bob: 250 };
    const board = service.leaderboard(COMP.id, (id) => equities[id] ?? 0);
    expect(board.map((row) => row.userId)).toEqual(["bob", "alice"]);
    expect(board.map((row) => row.returnPct)).toEqual([25, 10]);
  });

  it("verse conceptuellement 100 % des tickets à un gagnant unique", () => {
    service.join(COMP.id, paid("alice"));
    service.join(COMP.id, paid("bob"));
    now = 2_001;
    const result = service.close(COMP.id, (id) => (id === "bob" ? 120 : 110));
    expect(result.winner?.userId).toBe("bob");
    expect(result.pot).toBeCloseTo(0.02);
    expect(service.get(COMP.id).winnerUserId).toBe("bob");
    expect(service.settlement(COMP.id)).toMatchObject({
      winner: { userId: "bob", walletAddress: "wallet-bob" },
      pot: 0.02,
    });
  });

  it("départage un rendement identique par ordre d'inscription", () => {
    service.join(COMP.id, paid("alice"));
    now += 1;
    service.join(COMP.id, paid("bob"));
    expect(service.leaderboard(COMP.id, () => 100)[0]?.userId).toBe("alice");
  });

  it("rejette rake, partage du pot et buy-in non représentable en drops", () => {
    expect(() => service.create({ ...COMP, id: "rake", rakeRatio: 0.1 })).toThrow(
      InvalidCompetitionError,
    );
    expect(() => service.create({ ...COMP, id: "split", payoutWeights: [0.5, 0.5] })).toThrow(
      InvalidCompetitionError,
    );
    expect(() => service.create({ ...COMP, id: "fraction", buyIn: 0.0000001 })).toThrow(
      InvalidCompetitionError,
    );
    expect(() => service.create({ ...COMP, id: "bad/id" })).toThrow(
      InvalidCompetitionError,
    );
  });

  it("rejette une compétition, une entrée ou un ticket en double", () => {
    expect(() => service.create(COMP)).toThrow(CompetitionExistsError);
    service.join(COMP.id, paid("alice"));
    expect(() => service.join(COMP.id, paid("alice"))).toThrow(AlreadyJoinedError);
    expect(() =>
      service.join(COMP.id, { ...paid("bob"), paymentTxHash: paid("alice").paymentTxHash }),
    ).toThrow(CompetitionPaymentInvalidError);
  });

  it("reste réessayable si le scoring échoue et interdit une double clôture", () => {
    service.join(COMP.id, paid("alice"));
    now = 2_001;
    expect(() => service.close(COMP.id, () => Number.NaN)).toThrow(InvalidCompetitionError);
    expect(service.isClosed(COMP.id)).toBe(false);
    service.close(COMP.id, () => 100);
    expect(() => service.close(COMP.id, () => 100)).toThrow(CompetitionClosedError);
  });
});
