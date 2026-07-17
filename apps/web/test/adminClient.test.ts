import { describe, expect, it } from "vitest";
import type { ApiRequest, ApiResponse } from "@tide/client";
import { createLocalAdminClient } from "../src/lib/admin-client";

describe("client admin local", () => {
  it("envoie le token uniquement dans le header de la route admin", async () => {
    let seen: ApiRequest | undefined;
    const transport = async (request: ApiRequest): Promise<ApiResponse> => {
      seen = request;
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

    await createLocalAdminClient(transport).adminOverview("secret");

    expect(seen).toEqual({
      path: "/admin/overview",
      method: "GET",
      headers: { "x-admin-token": "secret" },
    });
  });
});
