import { beforeEach, describe, expect, it } from "vitest";
import { TideClient, type AdminOverviewDto, type ApiResponse, type ApiTransport } from "@tide/client";
import { useAdmin } from "../src/composables/useAdmin";

const EMPTY: AdminOverviewDto = {
  totals: {
    users: 0,
    bySegment: { operator: 0, frontend: 0, agent: 0 },
    agents: { total: 0, active: 0, paused: 0, stopped: 0 },
    wallets: 0,
  },
  users: [],
  agents: [],
  wallets: [],
  simulation: {
    enabled: false,
    configuredUsers: 0,
    provisionedUsers: 0,
    tradesPerTick: 0,
    tickIntervalMs: 60_000,
    lastTickAt: null,
    completedTicks: 0,
    executedTrades: 0,
    skippedTrades: 0,
    lastError: null,
  },
  testnetE2E: {
    enabled: false,
    state: "idle",
    configuredUsers: 0,
    completedUsers: 0,
    lastRunAt: null,
    lastError: null,
  },
};

/** Client dont `/admin/overview` répond selon le token reçu en en-tête. */
function clientWithToken(expectedToken: string, ok: ApiResponse, unauthorized: ApiResponse): TideClient {
  const transport: ApiTransport = (request) =>
    Promise.resolve(request.headers?.["x-admin-token"] === expectedToken ? ok : unauthorized);
  return new TideClient(transport);
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("useAdmin", () => {
  it("charge l'overview et persiste le token en sessionStorage", async () => {
    const client = clientWithToken(
      "secret",
      { status: 200, body: EMPTY },
      { status: 401, body: { error: "invalide" } },
    );
    const admin = useAdmin(client);

    admin.token.value = "secret";
    await admin.load();

    expect(admin.overview.value).toEqual(EMPTY);
    expect(sessionStorage.getItem("tide.adminToken")).toBe("secret");
  });

  it("vide le token sur 401", async () => {
    const client = clientWithToken(
      "secret",
      { status: 200, body: EMPTY },
      { status: 401, body: { error: "invalide" } },
    );
    const admin = useAdmin(client);

    admin.token.value = "wrong";
    await admin.load();

    expect(admin.token.value).toBe("");
    expect(admin.error.value).not.toBe("");
    expect(sessionStorage.getItem("tide.adminToken")).toBeNull();
  });
});
