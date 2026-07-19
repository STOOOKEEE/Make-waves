/**
 * Garde d'autorisation (fonction pure, testable sans HTTP). Décide si une requête
 * passe : route publique, sinon token requis + règles de propriété (un utilisateur
 * n'agit que sur SES comptes/agents/mandats). L'identité de confiance est
 * `tokenAddress` (le `sub` du JWT vérifié), jamais un paramètre fourni par le client.
 */

export interface AuthzResolvers {
  /** Propriétaire (userId) d'un agent, ou null si inconnu. */
  agentOwner(agentId: string): Promise<string | null>;
  /** Propriétaire (userId) d'un mandat, ou null si inconnu. */
  mandateOwner(mandateId: string): Promise<string | null>;
}

export interface AuthzRequest {
  readonly method: string;
  /** Motif de route Fastify (`/accounts/:userId/orders`), pas l'URL brute. */
  readonly routeUrl: string;
  readonly params: Record<string, string | undefined>;
  readonly query: Record<string, unknown>;
  readonly body: unknown;
  /** Adresse authentifiée (sub du JWT), ou null si pas de token valide. */
  readonly tokenAddress: string | null;
}

export type AuthzDecision =
  | { readonly ok: true }
  | { readonly ok: false; readonly status: 401 | 403; readonly error: string };

const OK: AuthzDecision = { ok: true };
const UNAUTHORIZED: AuthzDecision = { ok: false, status: 401, error: "authentification requise" };
const FORBIDDEN: AuthzDecision = { ok: false, status: 403, error: "accès refusé" };

/** Routes accessibles sans authentification (données publiques + handshake de login). */
const PUBLIC_ROUTES: ReadonlyArray<{ method: string; url: string }> = [
  { method: "GET", url: "/prices" },
  { method: "GET", url: "/prices/:symbol" },
  { method: "GET", url: "/markets" },
  { method: "GET", url: "/history/:symbol" },
  { method: "GET", url: "/book/:symbol" },
  { method: "GET", url: "/config" },
  { method: "GET", url: "/leaderboard" },
  { method: "GET", url: "/nft-metadata/:code" },
  { method: "GET", url: "/nft-metadata/weekly/:week" },
  { method: "GET", url: "/badges/weekly_trade.svg" },
  { method: "GET", url: "/badges/first_trade.svg" },
  { method: "GET", url: "/badges/ten_trades.svg" },
  { method: "GET", url: "/badges/first_competition.svg" },
  // La console admin porte sa propre garde (`x-admin-token`), pas le JWT user.
  { method: "GET", url: "/admin/overview" },
  { method: "GET", url: "/admin/wallet-ops/status" },
  { method: "POST", url: "/admin/users/delete-inactive" },
  { method: "POST", url: "/admin/wallets/provision" },
  { method: "POST", url: "/admin/wallets/create-for-users" },
  { method: "POST", url: "/admin/wallets/fund-for-users" },
  { method: "POST", url: "/admin/wallets/nfts" },
  { method: "POST", url: "/admin/wallets/:userId/nfts" },
  { method: "POST", url: "/admin/wallets/:userId/reclaim" },
  { method: "POST", url: "/admin/wallets/reclaim-all" },
  { method: "POST", url: "/admin/competitions" },
  { method: "POST", url: "/admin/competitions/:id/close" },
  // Flux SSE agent : auto-gardé dans le handler (token en query + filtrage par
  // propriétaire) car EventSource ne peut pas poser de header Authorization.
  { method: "GET", url: "/api/agents/events" },
  { method: "GET", url: "/competitions" },
  { method: "GET", url: "/competitions/:id" },
  { method: "GET", url: "/competitions/:id/participants" },
  { method: "GET", url: "/competitions/:id/leaderboard" },
  { method: "POST", url: "/auth/challenge" },
  { method: "POST", url: "/auth/paper" },
  { method: "POST", url: "/auth/paper/refresh" },
  { method: "POST", url: "/auth/verify" },
  { method: "POST", url: "/sign/connect" },
  { method: "GET", url: "/sign/status/:uuid" },
];

function isPublic(method: string, routeUrl: string): boolean {
  if (method === "OPTIONS") {
    return true; // préflight CORS
  }
  return PUBLIC_ROUTES.some((r) => r.method === method && r.url === routeUrl);
}

/** Corps de requête en objet indexable (jamais une exception sur un body non-objet). */
function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function ensure(condition: boolean): AuthzDecision {
  return condition ? OK : FORBIDDEN;
}

/**
 * Vérifie qu'un agent (par id) appartient bien à `owner`. Un id absent/mal typé
 * est refusé ; un agent **inconnu** (owner null) passe — le handler renverra 404,
 * et un agent inexistant n'expose aucune donnée d'un autre utilisateur.
 */
async function ownsAgent(
  agentId: unknown,
  owner: string,
  resolvers: AuthzResolvers,
): Promise<AuthzDecision> {
  if (typeof agentId !== "string") {
    return FORBIDDEN;
  }
  const ownerId = await resolvers.agentOwner(agentId);
  if (ownerId === null) {
    return OK;
  }
  return ensure(ownerId === owner);
}

async function ownsMandate(
  mandateId: unknown,
  owner: string,
  resolvers: AuthzResolvers,
): Promise<AuthzDecision> {
  if (typeof mandateId !== "string") {
    return FORBIDDEN;
  }
  const ownerId = await resolvers.mandateOwner(mandateId);
  if (ownerId === null) {
    return OK;
  }
  return ensure(ownerId === owner);
}

/** Décision d'autorisation pour une requête. */
export async function authorize(
  req: AuthzRequest,
  resolvers: AuthzResolvers,
): Promise<AuthzDecision> {
  if (isPublic(req.method, req.routeUrl)) {
    return OK;
  }
  const me = req.tokenAddress;
  if (me === null) {
    return UNAUTHORIZED;
  }

  // Règle générale : toute route portant :userId n'est accessible qu'à son propriétaire.
  if (req.params.userId !== undefined && req.params.userId !== me) {
    return FORBIDDEN;
  }

  const body = asRecord(req.body);
  const { method, routeUrl, query } = req;

  // Comptes (création / ensure) : le userId du corps doit être soi.
  if (routeUrl === "/accounts" || routeUrl === "/accounts/ensure") {
    return ensure(body.userId === me);
  }
  // Rejoindre une compétition : userId du corps = soi.
  if (routeUrl === "/competitions/:id/join") {
    return ensure(body.userId === me);
  }
  if (
    routeUrl === "/competitions/:id/entry/tx" ||
    routeUrl === "/competitions/:id/entry/xaman"
  ) {
    return ensure(body.account === me);
  }
  // Signature / exécution Live : le compte source du corps = soi.
  if (routeUrl === "/sign/live-offer" || routeUrl === "/exec/plan") {
    return ensure(body.account === me);
  }
  // Claim de badge : mint UNIQUEMENT vers l'adresse authentifiée (F4) — userId ET
  // walletAddress doivent être soi (sinon un attaquant fait minter l'issuer vers
  // une adresse arbitraire).
  if (routeUrl === "/badges/:code/claim") {
    return ensure(body.userId === me && body.walletAddress === me);
  }
  // Confirmation d'un claim : le compte doit être soi.
  if (routeUrl === "/badges/:code/claim/confirm") {
    return ensure(body.userId === me);
  }
  if (routeUrl === "/weekly-rewards/:week/claim") {
    return ensure(body.userId === me);
  }

  // --- Agents & mandats ---
  if (routeUrl === "/api/agent-chat/stream") {
    if (body.userId !== me) {
      return FORBIDDEN;
    }
    return ownsAgent(body.agentId, me, resolvers);
  }
  if (routeUrl === "/api/agents" && method === "POST") {
    return ensure(body.userId === me);
  }
  if (routeUrl === "/api/agents" && method === "GET") {
    return ensure(query.userId === me);
  }
  if (req.params.id !== undefined && routeUrl.startsWith("/api/agents/:id")) {
    return ownsAgent(req.params.id, me, resolvers);
  }
  if (routeUrl === "/api/mandates" && method === "POST") {
    if (body.userId !== me) {
      return FORBIDDEN;
    }
    return ownsAgent(body.agentId, me, resolvers);
  }
  if (routeUrl === "/api/mandates" && method === "GET") {
    return ownsAgent(query.agentId, me, resolvers);
  }
  if (routeUrl === "/api/sign/mandate-callback") {
    return ownsMandate(body.mandateId, me, resolvers);
  }
  if (routeUrl === "/api/agent-actions" && method === "GET") {
    return ownsAgent(query.agentId, me, resolvers);
  }
  if (routeUrl === "/api/agent-actions" && method === "POST") {
    if (body.userId !== me) {
      return FORBIDDEN;
    }
    return ownsAgent(body.agentId, me, resolvers);
  }
  if (routeUrl === "/api/agent-actions/idempotency" || routeUrl === "/api/agent-actions/count-today") {
    return ensure(query.userId === me);
  }

  // Repli : route authentifiée sans contrainte de propriété spécifique.
  return OK;
}
