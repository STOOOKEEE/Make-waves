import {
  extractErrorMessage,
  TideApiError,
  type AdminOverviewDto,
  type AdminNftGrantDto,
  type AdminWalletProvisionDto,
  type AdminReclaimJobDto,
  type AdminCompetitionCloseDto,
  type ApiRequest,
  type ApiTransport,
} from "@tide/client";
import type { AdminClient } from "../composables/useAdmin";
import { API_BASE } from "./client";
import { createFetchTransport } from "./transport";

async function expectBody<T>(
  transport: ApiTransport,
  request: ApiRequest,
  expectedStatus: number,
): Promise<T> {
  const response = await transport(request);
  if (response.status !== expectedStatus) {
    throw new TideApiError(response.status, extractErrorMessage(response.body));
  }
  return response.body as T;
}

/**
 * Client de la console locale. Ce module n'est importé que par `AdminView`,
 * elle-même éliminée du build de production.
 */
export function createLocalAdminClient(
  transport: ApiTransport = createFetchTransport(API_BASE),
): AdminClient {
  return {
    adminOverview: (token) =>
      expectBody<AdminOverviewDto>(
        transport,
        { path: "/admin/overview", method: "GET", headers: { "x-admin-token": token } },
        200,
      ),
    runTestnetE2E: (token) =>
      expectBody<AdminOverviewDto["testnetE2E"]>(
        transport,
        {
          path: "/admin/testnet-e2e/run",
          method: "POST",
          headers: { "x-admin-token": token },
        },
        200,
      ),
    walletOpsStatus: (token) =>
      expectBody<AdminReclaimJobDto>(
        transport,
        { path: "/admin/wallet-ops/status", method: "GET", headers: { "x-admin-token": token } },
        200,
      ),
    provisionWallets: (token, count) =>
      expectBody<AdminWalletProvisionDto>(
        transport,
        {
          path: "/admin/wallets/provision",
          method: "POST",
          headers: { "x-admin-token": token },
          body: { count },
        },
        201,
      ),
    grantWalletNft: (token, userId, badgeCode) =>
      expectBody<AdminNftGrantDto>(
        transport,
        {
          path: `/admin/wallets/${encodeURIComponent(userId)}/nfts`,
          method: "POST",
          headers: { "x-admin-token": token },
          body: { badgeCode },
        },
        200,
      ),
    reclaimWallet: (token, userId) =>
      expectBody<AdminReclaimJobDto>(
        transport,
        {
          path: `/admin/wallets/${encodeURIComponent(userId)}/reclaim`,
          method: "POST",
          headers: { "x-admin-token": token },
          body: { confirmation: userId },
        },
        202,
      ),
    reclaimAllWallets: (token, confirmation) =>
      expectBody<AdminReclaimJobDto>(
        transport,
        {
          path: "/admin/wallets/reclaim-all",
          method: "POST",
          headers: { "x-admin-token": token },
          body: { confirmation },
        },
        202,
      ),
    createCompetition: (token, input) =>
      expectBody<{ id: string }>(
        transport,
        {
          path: "/admin/competitions",
          method: "POST",
          headers: { "x-admin-token": token },
          body: input,
        },
        201,
      ),
    closeCompetition: (token, id) =>
      expectBody<AdminCompetitionCloseDto>(
        transport,
        {
          path: `/admin/competitions/${encodeURIComponent(id)}/close`,
          method: "POST",
          headers: { "x-admin-token": token },
        },
        200,
      ),
  };
}
