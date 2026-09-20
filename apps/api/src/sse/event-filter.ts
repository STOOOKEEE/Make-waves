import type { AgentEvent } from "./agent-broadcast";
import type { AuthzResolvers } from "../auth/guard";

/**
 * Filtre par propriétaire pour le flux SSE agent : ne relaie un event que si son
 * `agentId` appartient au viewer authentifié. Sans auth (me = null / pas de
 * resolvers → tests, legacy), tout passe. Cache la propriété par agent (elle ne
 * change jamais) pour éviter une lecture DB par event.
 */
export function makeEventFilter(
  me: string | null,
  resolvers: AuthzResolvers | undefined,
): (event: AgentEvent) => Promise<boolean> {
  const ownerCache = new Map<string, string | null>();
  return async (event: AgentEvent): Promise<boolean> => {
    if (me === null || resolvers === undefined) {
      return true;
    }
    let owner = ownerCache.get(event.agentId);
    if (owner === undefined && !ownerCache.has(event.agentId)) {
      owner = await resolvers.agentOwner(event.agentId);
      ownerCache.set(event.agentId, owner);
    }
    return owner === me;
  };
}
