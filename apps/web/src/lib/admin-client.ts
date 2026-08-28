import {
  extractErrorMessage,
  TideApiError,
  type AdminOverviewDto,
  type AdminNftGrantDto,
  type AdminReclaimJobDto,
  type AdminCompetitionCloseDto,
  type AdminInactiveUserDeleteDto,
  type AdminPortfolioManagerExecutionDto,
  type AdminPortfolioManagerPlanDto,
  type AdminPortfolioManagerStatusDto,
  type AdminManagedWalletDto,
  type AdminManagedWalletClaimDto,
  type ApiRequest,
  type ApiTransport,
} from "@tide/client";
import type { AdminClient } from "../composables/useAdmin";
import { API_BASE } from "./client";
import { createFetchTransport } from "./transport";

/**
 * Le build admin est servi par l'API opérateur elle-même : les appels restent
 * same-origin. En dev, une base explicite permet toujours le tunnel port 3101.
 */
export const ADMIN_API_BASE = import.meta.env.MODE === "admin"
  ? ""
  : import.meta.env.VITE_ADMIN_API_BASE ?? API_BASE;

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
  transport: ApiTransport = createFetchTransport(ADMIN_API_BASE),
): AdminClient {
  return {
    adminOverview: (token) =>
      expectBody<AdminOverviewDto>(
        transport,
        { path: "/admin/overview", method: "GET", headers: { "x-admin-token": token } },
        200,
      ),
    walletOpsStatus: (token) =>
      expectBody<AdminReclaimJobDto>(
        transport,
        { path: "/admin/wallet-ops/status", method: "GET", headers: { "x-admin-token": token } },
        200,
      ),
    managedWallets: (token) =>
      expectBody<readonly AdminManagedWalletDto[]>(
        transport,
        {
          path: "/admin/managed-wallets",
          method: "GET",
          headers: { "x-admin-token": token },
        },
        200,
      ),
    importManagedWallet: (token, label, seed) =>
      expectBody<AdminManagedWalletDto>(
        transport,
        {
          path: "/admin/managed-wallets",
          method: "POST",
          headers: { "x-admin-token": token },
          body: { label, seed },
        },
        201,
      ),
    tradeManagedWallet: (token, address) =>
      expectBody<AdminManagedWalletDto>(
        transport,
        {
          path: `/admin/managed-wallets/${encodeURIComponent(address)}/trades`,
          method: "POST",
          headers: { "x-admin-token": token },
        },
        200,
      ),
    claimManagedWalletBadge: (token, address, badgeCode) =>
      expectBody<AdminManagedWalletClaimDto>(
        transport,
        {
          path: `/admin/managed-wallets/${encodeURIComponent(address)}/badges/${encodeURIComponent(badgeCode)}/claim`,
          method: "POST",
          headers: { "x-admin-token": token },
        },
        200,
      ),
    removeManagedWallet: (token, address) =>
      expectBody<{ readonly deleted: true }>(
        transport,
        {
          path: `/admin/managed-wallets/${encodeURIComponent(address)}`,
          method: "DELETE",
          headers: { "x-admin-token": token },
          body: { confirmation: address },
        },
        200,
      ),
    deleteInactiveUsers: (token, userIds, confirmation) =>
      expectBody<AdminInactiveUserDeleteDto>(
        transport,
        {
          path: "/admin/users/delete-inactive",
          method: "POST",
          headers: { "x-admin-token": token },
          body: { userIds, confirmation },
        },
        200,
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
    portfolioManagerStatus: (token) =>
      expectBody<AdminPortfolioManagerStatusDto>(
        transport,
        {
          path: "/admin/portfolio-manager/status",
          method: "GET",
          headers: { "x-admin-token": token },
        },
        200,
      ),
    preparePortfolioManager: (token, userIds) =>
      expectBody<AdminPortfolioManagerPlanDto>(
        transport,
        {
          path: "/admin/portfolio-manager/plan",
          method: "POST",
          headers: { "x-admin-token": token },
          body: { userIds },
        },
        200,
      ),
    executePortfolioManager: (token, planId, confirmation) =>
      expectBody<AdminPortfolioManagerExecutionDto>(
        transport,
        {
          path: "/admin/portfolio-manager/execute",
          method: "POST",
          headers: { "x-admin-token": token },
          body: { planId, confirmation },
        },
        200,
      ),
  };
}
