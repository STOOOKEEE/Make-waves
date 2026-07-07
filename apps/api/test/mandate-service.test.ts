import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { MandateService } from "../src/services/mandate-service";
import { InMemoryMandateStore } from "../src/store/mandate-store";
import { MandateInvalidError } from "../src/services/errors";

const fakeXaman = {
  async createSignRequest() {
    return { uuid: "u", signUrl: "s", qrPng: "q" };
  },
  async getPayloadStatus() {
    return { meta: { signed: true, address: "rAddr" } };
  },
};

describe("MandateService", () => {
  it("create génère id + status=pending + signature=null", async () => {
    const svc = new MandateService(new InMemoryMandateStore(), fakeXaman);

    const m = await svc.create({
      agentId: randomUUID(),
      userId: "u1",
      capitalMax: 100,
      perteMaxJour: 10,
      maxTradesPerDay: 5,
      maxLeverage: 3,
      pairesAutorisees: ["BTC"],
      style: "momentum",
      validUntil: Date.now() + 86_400_000,
    });

    expect(m.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(m.status).toBe("pending");
    expect(m.signature).toBeNull();
    expect(m.signedAt).toBeNull();
  });

  it("getActiveForAgent renvoie null quand aucun mandat actif", async () => {
    const svc = new MandateService(new InMemoryMandateStore(), fakeXaman);

    expect(await svc.getActiveForAgent("nope")).toBeNull();
  });

  it("getActiveForAgent renvoie le mandat actif quand valide", async () => {
    const store = new InMemoryMandateStore();
    const svc = new MandateService(store, fakeXaman);
    const agentId = randomUUID();

    await store.create({
      id: randomUUID(),
      agentId,
      userId: "u1",
      capitalMax: 100,
      perteMaxJour: 10,
      maxTradesPerDay: 5,
      maxLeverage: 3,
      pairesAutorisees: ["BTC"],
      style: null,
      validUntil: Date.now() + 60_000,
      signedAt: Date.now(),
      signature: "x",
      status: "active",
    });

    const active = await svc.getActiveForAgent(agentId);
    expect(active).not.toBeNull();
    expect(active?.agentId).toBe(agentId);
  });

  it("onSignCallback passe le mandat pending en active + stocke signature", async () => {
    const store = new InMemoryMandateStore();
    const svc = new MandateService(store, fakeXaman);

    const m = await svc.create({
      agentId: randomUUID(),
      userId: "u1",
      capitalMax: 100,
      perteMaxJour: 10,
      maxTradesPerDay: 5,
      maxLeverage: 3,
      pairesAutorisees: ["BTC"],
      style: null,
      validUntil: Date.now() + 60_000,
    });

    await svc.onSignCallback({ mandateId: m.id, signature: "signed-hex" });

    const updated = await store.get(m.id);
    expect(updated?.status).toBe("active");
    expect(updated?.signature).toBe("signed-hex");
    expect(updated?.signedAt).toBeGreaterThan(0);
  });

  it("onSignCallback refuse si le mandat n'est pas pending", async () => {
    const store = new InMemoryMandateStore();
    const svc = new MandateService(store, fakeXaman);
    const agentId = randomUUID();

    // Mandat déjà actif
    const id = randomUUID();
    await store.create({
      id,
      agentId,
      userId: "u1",
      capitalMax: 100,
      perteMaxJour: 10,
      maxTradesPerDay: 5,
      maxLeverage: 3,
      pairesAutorisees: ["BTC"],
      style: null,
      validUntil: Date.now() + 60_000,
      signedAt: Date.now(),
      signature: "x",
      status: "active",
    });

    await expect(
      svc.onSignCallback({ mandateId: id, signature: "new-hex" }),
    ).rejects.toThrow(MandateInvalidError);
  });
});