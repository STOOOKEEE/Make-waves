import { describe, expect, it } from "vitest";
import { TideClient } from "./client";
import type { ApiRequest, ApiResponse } from "./transport";

describe("TideClient.adminOverview", () => {
  it("appelle GET /admin/overview avec le header x-admin-token", async () => {
    let seen: ApiRequest | undefined;
    const transport = async (req: ApiRequest): Promise<ApiResponse> => {
      seen = req;
      return {
        status: 200,
        body: {
          totals: {
            users: 0,
            bySegment: { operator: 0, frontend: 0, agent: 0 },
            agents: { total: 0, active: 0, paused: 0, stopped: 0 },
            wallets: 0,
          },
          users: [],
          agents: [],
          wallets: [],
        },
      };
    };
    const client = new TideClient(transport);

    const overview = await client.adminOverview("secret");

    expect(seen?.path).toBe("/admin/overview");
    expect(seen?.method).toBe("GET");
    expect(seen?.headers).toEqual({ "x-admin-token": "secret" });
    expect(overview.totals.users).toBe(0);
  });
});
