import { TideClient } from "@tide/client";
import { createFetchTransport } from "./transport";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

/** Crée le client API pointant sur le backend (base configurable via env). */
export function createClient(): TideClient {
  return new TideClient(createFetchTransport(API_BASE));
}
