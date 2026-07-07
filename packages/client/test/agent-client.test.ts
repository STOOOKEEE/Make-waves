import { describe, it, expect } from "vitest";
import { TideClient } from "../src/client";
import type { ApiRequest, ApiResponse, ApiTransport } from "../src/transport";

function stub(responder: (request: ApiRequest) => ApiResponse): {
  client: TideClient;
  requests: ApiRequest[];
} {
  const requests: ApiRequest[] = [];
  const transport: ApiTransport = (request) => {
    requests.push(request);
    return Promise.resolve(responder(request));
  };
  return { client: new TideClient(transport), requests };
}

describe("TideClient agents/mandates/actions", () => {
  it("agents -> GET /api/agents?userId=...", async () => {
    const list = [
      {
        id: "a1",
        userId: "u1",
        name: "Momentum",
        type: "external",
        status: "active",
        hasLiveAccount: false,
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    const { client, requests } = stub(() => ({ status: 200, body: list }));
    expect(await client.agents("u1")).toEqual(list);
    expect(requests[0]).toEqual({
      path: "/api/agents?userId=u1",
      method: "GET",
    });
  });

  it("createAgent -> POST /api/agents (201)", async () => {
    const created = {
      id: "a1",
      userId: "u1",
      name: "Momentum",
      type: "external",
      status: "active",
      hasLiveAccount: false,
      createdAt: 1,
      updatedAt: 1,
    };
    const { client, requests } = stub(() => ({ status: 201, body: created }));
    const result = await client.createAgent({
      userId: "u1",
      name: "Momentum",
      type: "external",
    });
    expect(result).toEqual(created);
    expect(requests[0]).toEqual({
      path: "/api/agents",
      method: "POST",
      body: { userId: "u1", name: "Momentum", type: "external" },
    });
  });

  it("updateAgent -> PATCH /api/agents/:id (200)", async () => {
    const updated = {
      id: "a1",
      userId: "u1",
      name: "Renamed",
      type: "external",
      status: "paused",
      hasLiveAccount: false,
      createdAt: 1,
      updatedAt: 2,
    };
    const { client, requests } = stub(() => ({ status: 200, body: updated }));
    expect(
      await client.updateAgent("a1", { name: "Renamed", status: "paused" }),
    ).toEqual(updated);
    expect(requests[0]).toEqual({
      path: "/api/agents/a1",
      method: "PATCH",
      body: { name: "Renamed", status: "paused" },
    });
  });

  it("deleteAgent -> DELETE /api/agents/:id (200) renvoie {deleted:true}", async () => {
    const { client, requests } = stub(() => ({ status: 200, body: { deleted: true } }));
    expect(await client.deleteAgent("a1")).toEqual({ deleted: true });
    expect(requests[0]).toEqual({
      path: "/api/agents/a1",
      method: "DELETE",
    });
  });

  it("mandates -> GET /api/mandates?agentId=... et createMandate -> POST (201)", async () => {
    const mandate = {
      id: "m1",
      agentId: "a1",
      userId: "u1",
      capitalMax: 100,
      perteMaxJour: 10,
      maxTradesPerDay: 5,
      maxLeverage: 3,
      pairesAutorisees: ["XRP"],
      style: null,
      validUntil: 1700000000000,
      signedAt: null,
      signature: null,
      status: "pending",
    };
    const seq: ApiRequest[] = [];
    const transport: ApiTransport = (request) => {
      seq.push(request);
      if (request.method === "GET") {
        return Promise.resolve({ status: 200, body: [mandate] });
      }
      return Promise.resolve({ status: 201, body: mandate });
    };
    const client = new TideClient(transport);

    expect(await client.mandates("a1")).toEqual([mandate]);
    expect(seq[0]).toEqual({
      path: "/api/mandates?agentId=a1",
      method: "GET",
    });

    const input = {
      agentId: "a1",
      userId: "u1",
      capitalMax: 100,
      perteMaxJour: 10,
      maxTradesPerDay: 5,
      maxLeverage: 3,
      pairesAutorisees: ["XRP"],
      style: null,
      validUntil: 1700000000000,
    };
    expect(await client.createMandate(input)).toEqual(mandate);
    expect(seq[1]).toEqual({
      path: "/api/mandates",
      method: "POST",
      body: input,
    });
  });

  it("agentActions -> GET /api/agent-actions?agentId=...&limit=N", async () => {
    const actions = [
      {
        id: "act1",
        agentId: "a1",
        userId: "u1",
        toolName: "place_order",
        toolParams: "{}",
        result: "{}",
        error: null,
        idempotencyKey: "k1",
        executedAt: 1700000000000,
      },
    ];
    const { client, requests } = stub(() => ({ status: 200, body: actions }));
    expect(await client.agentActions("a1", 50)).toEqual(actions);
    expect(requests[0]).toEqual({
      path: "/api/agent-actions?agentId=a1&limit=50",
      method: "GET",
    });
  });
});