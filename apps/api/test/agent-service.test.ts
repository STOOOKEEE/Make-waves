import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { AgentService } from "../src/services/agent-service";
import { InMemoryAgentStore } from "../src/store/agent-store";
import { InMemoryMandateStore } from "../src/store/mandate-store";

describe("AgentService", () => {
  it("create génère id + timestamps + status=active", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const svc = new AgentService(agents, mandates);

    const agent = await svc.create({ userId: "u1", name: "Momentum", type: "external" });

    expect(agent.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(agent.userId).toBe("u1");
    expect(agent.name).toBe("Momentum");
    expect(agent.type).toBe("external");
    expect(agent.status).toBe("active");
    expect(agent.hasLiveAccount).toBe(false);
    expect(agent.createdAt).toBeGreaterThan(0);
    expect(agent.updatedAt).toBeGreaterThan(0);
  });

  it("kill passe status=stopped ET révoque les mandats actifs", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const svc = new AgentService(agents, mandates);

    const agent = await svc.create({ userId: "u1", name: "x", type: "external" });
    await mandates.create({
      id: randomUUID(),
      agentId: agent.id,
      userId: "u1",
      capitalMax: 100,
      perteMaxJour: 10,
      maxTradesPerDay: 5,
      maxLeverage: 3,
      pairesAutorisees: ["BTC"],
      style: null,
      validUntil: Date.now() + 86400_000,
      signedAt: Date.now(),
      signature: "x",
      status: "active",
    });

    await svc.kill(agent.id);

    expect((await agents.get(agent.id))?.status).toBe("stopped");
    expect(await mandates.getActive(agent.id)).toBeNull();
  });

  it("listByUser ne renvoie que les agents de cet utilisateur", async () => {
    const agents = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    const svc = new AgentService(agents, mandates);

    await svc.create({ userId: "u1", name: "a", type: "external" });
    await svc.create({ userId: "u2", name: "b", type: "external" });

    const u1Agents = await svc.listByUser("u1");
    expect(u1Agents).toHaveLength(1);
    expect(u1Agents[0]?.userId).toBe("u1");
  });
});