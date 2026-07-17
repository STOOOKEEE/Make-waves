import {
  extractErrorMessage,
  TideApiError,
  type AdminOverviewDto,
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
  };
}
