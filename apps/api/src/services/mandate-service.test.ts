import { describe, expect, it } from "vitest";
import { MandateService } from "./mandate-service";
import type { CreateMandateInput, MandateXamanApi } from "./mandate-service";
import { MandateInvalidError } from "./errors";
import { InMemoryMandateStore } from "../store/mandate-store";

const USER = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const OTHER = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";

/** API Xaman de test : `undefined` = non câblée (getPayloadStatus lève). */
function xaman(status?: { signed: boolean; address?: string }): MandateXamanApi {
  return {
    createSignRequest: async () => {
      throw new Error("non utilisé");
    },
    getPayloadStatus: async () => {
      if (status === undefined) {
        throw new Error("xaman non câblé");
      }
      return { meta: status };
    },
  };
}

function makeService(isLive: boolean, api: MandateXamanApi) {
  const store = new InMemoryMandateStore();
  const service = new MandateService(store, api, async () => isLive);
  return { store, service };
}

function pendingInput(userId = USER): CreateMandateInput {
  return {
    agentId: "a1",
    userId,
    capitalMax: 1000,
    perteMaxJour: 100,
    maxTradesPerDay: 10,
    maxLeverage: 3,
    pairesAutorisees: ["XRP"],
    style: null,
    validUntil: Number.MAX_SAFE_INTEGER,
  };
}

describe("MandateService.onSignCallback", () => {
  it("Paper : active avec une signature simulée (pas de fonds réels)", async () => {
    const { service } = makeService(false, xaman());
    const m = await service.create(pendingInput());
    const active = await service.onSignCallback({ mandateId: m.id, signature: "ui-simulated-signature" });
    expect(active.status).toBe("active");
  });

  it("Live : refuse l'activation sans preuve Xaman (fail-closed)", async () => {
    const { service } = makeService(true, xaman());
    const m = await service.create(pendingInput());
    await expect(
      service.onSignCallback({ mandateId: m.id, signature: "x" }),
    ).rejects.toThrow(MandateInvalidError);
  });

  it("Live : active avec un payload Xaman signé par le propriétaire", async () => {
    const { service } = makeService(true, xaman({ signed: true, address: USER }));
    const m = await service.create(pendingInput());
    const active = await service.onSignCallback({ mandateId: m.id, signature: "x", uuid: "u1" });
    expect(active.status).toBe("active");
  });

  it("Live : refuse si l'adresse signataire n'est pas le propriétaire", async () => {
    const { service } = makeService(true, xaman({ signed: true, address: OTHER }));
    const m = await service.create(pendingInput());
    await expect(
      service.onSignCallback({ mandateId: m.id, signature: "x", uuid: "u1" }),
    ).rejects.toThrow(MandateInvalidError);
  });

  it("Live : refuse un payload non signé", async () => {
    const { service } = makeService(true, xaman({ signed: false }));
    const m = await service.create(pendingInput());
    await expect(
      service.onSignCallback({ mandateId: m.id, signature: "x", uuid: "u1" }),
    ).rejects.toThrow(MandateInvalidError);
  });

  it("refuse un mandat déjà activé (non pending)", async () => {
    const { service } = makeService(false, xaman());
    const m = await service.create(pendingInput());
    await service.onSignCallback({ mandateId: m.id, signature: "x" });
    await expect(
      service.onSignCallback({ mandateId: m.id, signature: "x" }),
    ).rejects.toThrow(MandateInvalidError);
  });
});
