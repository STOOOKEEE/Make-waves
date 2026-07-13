import { TideClient } from "@tide/client";
import { createFetchTransport } from "./transport";

/** Base de l'API backend (configurable via `VITE_API_BASE`). Exportée pour les
 * appels hors client typé : flux SSE (chat agent, bus d'événements). */
export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

/** Crée le client API pointant sur le backend (base configurable via env). */
export function createClient(): TideClient {
  return new TideClient(createFetchTransport(API_BASE));
}
