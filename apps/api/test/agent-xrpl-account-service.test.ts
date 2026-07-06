import { describe, it, expect, beforeEach } from "vitest";
import { AgentXrplAccountService } from "../src/services/agent-xrpl-account-service";
import { InMemoryAgentXrplKeysStore } from "../src/store/agent-xrpl-keys-store";
import {
  InMemoryAgentStore,
  AgentNotFoundError,
} from "../src/store/agent-store";

const MASTER_KEY = "a".repeat(64); // 32 bytes hex — valide pour readMasterKey
const MASTER_KEY_ID = "v1";

function makeAgent(id: string) {
  return {
    id,
    userId: "u1",
    name: `agent-${id}`,
    type: "external" as const,
    status: "active" as const,
    hasLiveAccount: false,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe("AgentXrplAccountService", () => {
  let keys: InMemoryAgentXrplKeysStore;
  let agents: InMemoryAgentStore;
  let svc: AgentXrplAccountService;

  beforeEach(() => {
    keys = new InMemoryAgentXrplKeysStore();
    agents = new InMemoryAgentStore();
    svc = new AgentXrplAccountService({
      keys,
      agents,
      masterKeyHex: MASTER_KEY,
      masterKeyId: MASTER_KEY_ID,
    });
  });

  it("generate crée un wallet, persiste un seed chiffré, et marque hasLiveAccount=true", async () => {
    await agents.create(makeAgent("a1"));

    const { publicKey, address } = await svc.generate("a1");

    expect(publicKey).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/);
    expect(address).toBe(publicKey);

    const stored = await keys.get("a1");
    expect(stored).not.toBeNull();
    expect(stored?.publicKey).toBe(publicKey);
    expect(stored?.userId).toBe("u1");
    expect(stored?.masterKeyId).toBe(MASTER_KEY_ID);
    expect(stored?.createdAt).toBeGreaterThan(0);

    // Le payload chiffré est un JSON valide avec les 4 champs attendus.
    const payload = JSON.parse(stored!.encryptedPrivateKey) as Record<string, unknown>;
    expect(payload["masterKeyId"]).toBe(MASTER_KEY_ID);
    expect(typeof payload["iv"]).toBe("string");
    expect(typeof payload["ciphertext"]).toBe("string");
    expect(typeof payload["tag"]).toBe("string");

    // Le seed en clair n'apparaît pas en clair (l'iv/ciphertext sont en hex,
    // pas des chiffres). Le roundtrip chiffré → déchiffré est vérifié plus bas.
    expect(payload["ciphertext"]).toMatch(/^[0-9a-f]+$/);
    expect(payload["iv"]).toMatch(/^[0-9a-f]+$/);

    const updated = await agents.get("a1");
    expect(updated?.hasLiveAccount).toBe(true);
  });

  it("decryptSeed retrouve le seed original (roundtrip chiffré → déchiffré)", async () => {
    await agents.create(makeAgent("a1"));
    const { address } = await svc.generate("a1");

    const { seed, address: gotAddr } = await svc.decryptSeed("a1");

    expect(typeof seed).toBe("string");
    expect(seed.length).toBeGreaterThan(20);
    expect(gotAddr).toBe(address);
    // Le seed XRPL d'un Wallet.generate commence par 's' (famille ED25519 par défaut).
    expect(seed.startsWith("s")).toBe(true);
  });

  it("generate est idempotent : un 2e appel renvoie le compte existant", async () => {
    await agents.create(makeAgent("a1"));
    const first = await svc.generate("a1");
    const second = await svc.generate("a1");

    expect(second).toEqual(first);
    // Une seule ligne en base.
    const stored = await keys.get("a1");
    expect(stored?.publicKey).toBe(first.publicKey);
  });

  it("generate throw AgentNotFoundError si l'agent n'existe pas", async () => {
    await expect(svc.generate("ghost")).rejects.toBeInstanceOf(
      AgentNotFoundError,
    );
  });

  it("revoke supprime la clé et remet hasLiveAccount=false ; decryptSeed échoue ensuite", async () => {
    await agents.create(makeAgent("a1"));
    await svc.generate("a1");
    expect(await keys.get("a1")).not.toBeNull();
    expect((await agents.get("a1"))?.hasLiveAccount).toBe(true);

    await svc.revoke("a1");

    expect(await keys.get("a1")).toBeNull();
    expect((await agents.get("a1"))?.hasLiveAccount).toBe(false);

    await expect(svc.decryptSeed("a1")).rejects.toThrow(/No live account/);
  });

  it("decryptSeed échoue si le payload a été chiffré avec une autre master key", async () => {
    await agents.create(makeAgent("a1"));
    const stored = await svc.generate("a1");
    expect(stored.publicKey).toMatch(/^r/);

    // Service configuré avec une master key différente → le déchiffrement doit casser.
    const wrongSvc = new AgentXrplAccountService({
      keys,
      agents,
      masterKeyHex: "b".repeat(64),
      masterKeyId: MASTER_KEY_ID,
    });

    await expect(wrongSvc.decryptSeed("a1")).rejects.toThrow();
  });
});