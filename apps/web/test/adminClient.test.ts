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

  it("confirme un sweep global dans le body et garde le token en header", async () => {
    let seen: ApiRequest | undefined;
    const transport = async (request: ApiRequest): Promise<ApiResponse> => {
      seen = request;
      return { status: 202, body: { state: "running" } };
    };

    await createLocalAdminClient(transport).reclaimAllWallets(
      "secret",
      "DELETE ALL MAINNET WALLETS",
    );

    expect(seen).toEqual({
      path: "/admin/wallets/reclaim-all",
      method: "POST",
      headers: { "x-admin-token": "secret" },
      body: { confirmation: "DELETE ALL MAINNET WALLETS" },
    });
  });

  it("demande la création d'un lot de wallets Mainnet", async () => {
    let seen: ApiRequest | undefined;
    const transport = async (request: ApiRequest): Promise<ApiResponse> => {
      seen = request;
      return {
        status: 201,
        body: { network: "mainnet", requested: 3, funded: 3, wallets: [] },
      };
    };

    await createLocalAdminClient(transport).provisionWallets("secret", 3);

    expect(seen).toEqual({
      path: "/admin/wallets/provision",
      method: "POST",
      headers: { "x-admin-token": "secret" },
      body: { count: 3 },
    });
  });

  it("transmet la sélection multiple pour le funding et les NFT", async () => {
    const seen: ApiRequest[] = [];
    const transport = async (request: ApiRequest): Promise<ApiResponse> => {
      seen.push(request);
      return request.path.endsWith("/nfts")
        ? { status: 200, body: { requested: 2, succeeded: 2, failed: 0, results: [] } }
        : { status: 200, body: { network: "mainnet", requested: 2, funded: 2, wallets: [] } };
    };
    const client = createLocalAdminClient(transport);
    const userIds = ["paper:u1", "paper:u2"];

    await client.fundUserWallets("secret", userIds, "FUND 2 MAINNET WALLETS");
    await client.grantWalletNftBatch("secret", userIds, "first_trade");

    expect(seen).toEqual([
      {
        path: "/admin/wallets/fund-for-users",
        method: "POST",
        headers: { "x-admin-token": "secret" },
        body: { userIds, confirmation: "FUND 2 MAINNET WALLETS" },
      },
      {
        path: "/admin/wallets/nfts",
        method: "POST",
        headers: { "x-admin-token": "secret" },
        body: { userIds, badgeCode: "first_trade" },
      },
    ]);
  });

  it("transmet la confirmation de suppression des comptes inactifs", async () => {
    let seen: ApiRequest | undefined;
    const transport = async (request: ApiRequest): Promise<ApiResponse> => {
      seen = request;
      return {
        status: 200,
        body: { requested: 2, deleted: 2, walletRowsDeleted: 0, userIds: ["paper:u1", "paper:u2"] },
      };
    };
    const userIds = ["paper:u1", "paper:u2"];

    await createLocalAdminClient(transport).deleteInactiveUsers(
      "secret",
      userIds,
      "DELETE 2 INACTIVE PAPER ACCOUNTS",
    );

    expect(seen).toEqual({
      path: "/admin/users/delete-inactive",
      method: "POST",
      headers: { "x-admin-token": "secret" },
      body: { userIds, confirmation: "DELETE 2 INACTIVE PAPER ACCOUNTS" },
    });
  });
});
