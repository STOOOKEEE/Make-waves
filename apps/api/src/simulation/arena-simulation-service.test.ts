import { describe, expect, it } from "vitest";
import { PaperService } from "../services/paper-service";
import { arenaSimulationUserId, isArenaSimulationUserId } from "./arena-ids";
import { ArenaSimulationService } from "./arena-simulation-service";

const CONFIG = { users: 3, tradesPerTick: 2, tickIntervalMs: 60_000 };

describe("ArenaSimulationService", () => {
  it("provisionne des comptes Paper persistants à ID stable, sans wallet", () => {
    const paper = new PaperService(1_000);
    const arena = new ArenaSimulationService(paper, CONFIG);

    arena.provision();

    expect(paper.balancesOf(arenaSimulationUserId(0))).toEqual({ RLUSD: 1_000 });
    expect(paper.balancesOf(arenaSimulationUserId(2))).toEqual({ RLUSD: 1_000 });
    expect(isArenaSimulationUserId(arenaSimulationUserId(1))).toBe(true);
    expect(arena.status().provisionedUsers).toBe(3);
  });

  it("fait tourner seulement une tranche bornée de profils à chaque tick", () => {
    const paper = new PaperService(1_000);
    const arena = new ArenaSimulationService(paper, CONFIG);

    arena.tick({ XRP: 0.5 });

    expect(arena.status()).toMatchObject({
      enabled: true,
      completedTicks: 1,
      executedTrades: 2,
      skippedTrades: 0,
    });
    expect(paper.ordersOf(arenaSimulationUserId(0))).toHaveLength(1);
    expect(paper.ordersOf(arenaSimulationUserId(1))).toHaveLength(1);
    expect(paper.ordersOf(arenaSimulationUserId(2))).toHaveLength(0);
  });

  it("supporte le scénario cible de 300 profils sans les confondre avec des wallets", () => {
    const paper = new PaperService(1_000);
    const arena = new ArenaSimulationService(paper, {
      users: 300,
      tradesPerTick: 12,
      tickIntervalMs: 60_000,
    });

    arena.tick({ XRP: 0.5 });

    expect(arena.status()).toMatchObject({
      configuredUsers: 300,
      provisionedUsers: 300,
      executedTrades: 12,
    });
    expect(paper.leaderboard({ XRP: 0.5 })).toHaveLength(300);
    expect(paper.ordersOf(arenaSimulationUserId(299))).toHaveLength(0);
  });

  it("reste inerte quand l'arène est désactivée", () => {
    const paper = new PaperService(1_000);
    const arena = new ArenaSimulationService(paper, {
      users: 0,
      tradesPerTick: 0,
      tickIntervalMs: 60_000,
    });

    arena.tick({ XRP: 0.5 });

    expect(arena.status().enabled).toBe(false);
    expect(paper.leaderboard({ XRP: 0.5 })).toEqual([]);
  });
});
