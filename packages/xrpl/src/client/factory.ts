import { Client } from "xrpl";
import { adaptXrplClient } from "./connection";
import { XrplClient } from "./xrpl-client";

/**
 * Construit un `XrplClient` Tide connecté à un nœud mainnet réel. C'est, avec
 * `adaptXrplClient`, l'unique point qui instancie la lib `xrpl` : tout le reste
 * de l'app vit au-dessus de l'interface `XrplConnection` (testable). Cette
 * factory n'est donc PAS testée unitairement (elle exige un vrai réseau) ; elle
 * ne fait qu'assembler des briques déjà testées.
 *
 * La connexion est paresseuse : `new Client(url)` n'ouvre pas le WebSocket, c'est
 * la première lecture (`XrplClient.connect()`, idempotent) qui le fait.
 *
 * @param serverUrl URL WebSocket d'un nœud rippled (ex. `wss://xrplcluster.com`).
 */
export function connectXrplClient(serverUrl: string): XrplClient {
  return new XrplClient(adaptXrplClient(new Client(serverUrl)));
}
