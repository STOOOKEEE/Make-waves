# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une console opérateur en lecture seule (`/admin`) qui liste tous les comptes créés (users paper, agents IA, wallets XRPL) avec un résumé segmenté de la population (à moi / via le front / agents IA).

**Architecture:** Un service d'agrégation `AdminService.overview()` assemble les stores existants (comptes paper via `PaperService.leaderboard`, agents via un nouveau `AgentStore.list()`, mandats, actions) et classe chaque compte par origine. Une route `GET /admin/overview` protégée par un token (`TIDE_ADMIN_TOKEN`) — non montée si l'env est absent (OFF par défaut, même patron que l'issuer NFT). Front : une vue `AdminView.vue` hors nav publique, token en `sessionStorage`.

**Tech Stack:** Node + TypeScript + Fastify (backend), `@tide/core` (leaderboard), Vue 3 + Vite (front), vitest (tests). Monorepo pnpm.

## Global Constraints

- TypeScript strict : jamais `as any` ni `: any` pour contourner le typage (utiliser `unknown` puis affiner). Lint `no-explicit-any` en erreur.
- Un module = une responsabilité ; pas de valeurs magiques (constantes nommées) ; pas de duplication.
- Ne jamais avaler une erreur (`catch {}` vide interdit) ; valider les entrées critiques.
- Secrets hors repo ; ne jamais logger le token admin ; les wallets n'exposent que l'adresse publique (jamais `encryptedPrivateKey`).
- Lecture seule : aucune route/bouton de mutation dans cette feature.
- Zéro nouvelle dépendance (ni back ni front).
- Ne pas commit sans demande explicite d'Armand — les étapes « Commit » sont proposées mais à valider par lui.
- Tests exécutés via `pnpm test` (vitest) ; typecheck via `pnpm typecheck` ; lint via `pnpm lint`.

---

### Task 1: `AgentStore.list()` — lister tous les agents

**Files:**
- Modify: `apps/api/src/store/agent-store.ts` (interface `AgentStore` + `InMemoryAgentStore`)
- Modify: `apps/api/src/store/sqlite-agent-store.ts` (`SqliteAgentStore`)
- Test: `apps/api/src/store/agent-store.test.ts` (créer)

**Interfaces:**
- Produces: `AgentStore.list(): Promise<Agent[]>` — renvoie tous les agents, tri `createdAt` décroissant (comme `listByUser`).

- [ ] **Step 1: Write the failing test**

Créer `apps/api/src/store/agent-store.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { InMemoryAgentStore, type Agent } from "./agent-store";

function agent(id: string, userId: string, createdAt: number): Agent {
  return {
    id,
    userId,
    name: `agent-${id}`,
    type: "external",
    status: "active",
    hasLiveAccount: false,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("AgentStore.list", () => {
  it("renvoie tous les agents, plus récent d'abord", async () => {
    const store = new InMemoryAgentStore();
    await store.create(agent("a", "u1", 100));
    await store.create(agent("b", "u2", 300));
    await store.create(agent("c", "u1", 200));

    const all = await store.list();

    expect(all.map((a) => a.id)).toEqual(["b", "c", "a"]);
  });

  it("renvoie une liste vide sans agent", async () => {
    const store = new InMemoryAgentStore();
    expect(await store.list()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tide/api test -- agent-store`
Expected: FAIL — `store.list is not a function`.

- [ ] **Step 3: Add `list()` to the interface**

Dans `apps/api/src/store/agent-store.ts`, ajouter à l'interface `AgentStore` (après `listByUser`) :

```ts
  /** Tous les agents (pour la console admin), plus récent d'abord. */
  list(): Promise<Agent[]>;
```

- [ ] **Step 4: Implement in `InMemoryAgentStore`**

Dans la classe `InMemoryAgentStore` (après `listByUser`) :

```ts
  async list(): Promise<Agent[]> {
    return [...this.agents.values()].sort((a, b) => b.createdAt - a.createdAt);
  }
```

- [ ] **Step 5: Implement in `SqliteAgentStore`**

Dans `apps/api/src/store/sqlite-agent-store.ts` (après `listByUser`) :

```ts
  async list(): Promise<Agent[]> {
    const rows = this.db
      .prepare(`SELECT * FROM agents ORDER BY created_at DESC`)
      .all();
    return rows.map(toAgent);
  }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @tide/api test -- agent-store`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/store/agent-store.ts apps/api/src/store/sqlite-agent-store.ts apps/api/src/store/agent-store.test.ts
git commit -m "feat(api): AgentStore.list() pour lister tous les agents"
```

---

### Task 2: `AdminService` — agrégation + segmentation

**Files:**
- Create: `apps/api/src/services/admin-service.ts`
- Test: `apps/api/src/services/admin-service.test.ts`

**Interfaces:**
- Consumes: `AgentStore.list()` (Task 1) ; `PaperService.leaderboard(prices)`, `.ordersOf(userId)`, `.positionsOf(userId)`, `.openAccount(userId)`, `.placeOrder(...)` (existants) ; `MandateStore.getActive(agentId)`, `AgentActionsStore.listByAgent(agentId, limit)` (existants).
- Produces:
  - Types `AccountSegment = "operator" | "agent" | "frontend"`, `AdminUserRow`, `AdminAgentRow`, `AdminWalletRow`, `AdminTotals`, `AdminOverview` (signatures exactes ci-dessous).
  - `class AdminService` avec `constructor(deps: AdminServiceDeps)` et `overview(prices: PriceMap): Promise<AdminOverview>`.
  - `AdminServiceDeps = { paper: PaperService; agents: AgentStore; mandates: MandateStore; actions: AgentActionsStore; prizePoolAddress: string | null; operatorUserIds: ReadonlySet<string> }`.

- [ ] **Step 1: Write the failing test**

Créer `apps/api/src/services/admin-service.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { AdminService } from "./admin-service";
import { PaperService } from "./paper-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryAgentStore, type Agent } from "../store/agent-store";
import { InMemoryMandateStore, type Mandate } from "../store/mandate-store";
import { InMemoryAgentActionsStore } from "../store/agent-actions-store";
import type { PriceMap } from "@tide/core";

const PRICES: PriceMap = { XRP: 0.5 };

function agent(id: string, userId: string): Agent {
  return {
    id,
    userId,
    name: `agent-${id}`,
    type: "external",
    status: "active",
    hasLiveAccount: false,
    createdAt: 1,
    updatedAt: 1,
  };
}

function mandate(agentId: string, userId: string): Mandate {
  return {
    id: `m-${agentId}`,
    agentId,
    userId,
    capitalMax: 1000,
    perteMaxJour: 100,
    maxTradesPerDay: 10,
    maxLeverage: 3,
    pairesAutorisees: ["XRP"],
    style: null,
    validUntil: Number.MAX_SAFE_INTEGER,
    signedAt: 1,
    signature: "sig",
    status: "active",
  };
}

function makeService(operatorUserIds: string[]) {
  const accounts = new InMemoryAccountStore();
  const paper = new PaperService(undefined, accounts);
  const agents = new InMemoryAgentStore();
  const mandates = new InMemoryMandateStore();
  const actions = new InMemoryAgentActionsStore();
  const service = new AdminService({
    paper,
    agents,
    mandates,
    actions,
    prizePoolAddress: "rPrizePoolXXXXXXXXXXXXXXXXXXXXXXXXX",
    operatorUserIds: new Set(operatorUserIds),
  });
  return { paper, agents, mandates, actions, service };
}

describe("AdminService.overview", () => {
  it("classe les comptes par origine avec précédence operator > agent > frontend", async () => {
    const { paper, agents, service } = makeService(["me"]);
    paper.openAccount("me"); // operator (allowlist)
    paper.openAccount("visitor"); // frontend
    paper.openAccount("agentOwner"); // agent (owner d'un agent)
    paper.openAccount("me-with-agent"); // operator (gagne malgré l'agent)
    await agents.create(agent("a1", "agentOwner"));
    await agents.create(agent("a2", "me-with-agent"));

    const overview = await service.overview(PRICES);
    const segOf = (userId: string) =>
      overview.users.find((u) => u.userId === userId)?.segment;

    expect(segOf("me")).toBe("operator");
    expect(segOf("me-with-agent")).toBe("operator");
    expect(segOf("agentOwner")).toBe("agent");
    expect(segOf("visitor")).toBe("frontend");
  });

  it("totalise la population : somme des segments = total users", async () => {
    const { paper, agents, service } = makeService(["me"]);
    paper.openAccount("me");
    paper.openAccount("visitor1");
    paper.openAccount("visitor2");
    paper.openAccount("agentOwner");
    await agents.create(agent("a1", "agentOwner"));

    const { totals } = await service.overview(PRICES);

    expect(totals.users).toBe(4);
    expect(totals.bySegment.operator).toBe(1);
    expect(totals.bySegment.agent).toBe(1);
    expect(totals.bySegment.frontend).toBe(2);
    expect(
      totals.bySegment.operator + totals.bySegment.agent + totals.bySegment.frontend,
    ).toBe(totals.users);
    expect(totals.agents.total).toBe(1);
    expect(totals.agents.active).toBe(1);
  });

  it("expose le mandat actif et la dernière action d'un agent", async () => {
    const { paper, agents, mandates, actions, service } = makeService([]);
    paper.openAccount("owner");
    await agents.create(agent("a1", "owner"));
    await mandates.create(mandate("a1", "owner"));
    await actions.record({
      id: "act1",
      agentId: "a1",
      userId: "owner",
      toolName: "place_order",
      toolParams: "{}",
      result: "ok",
      error: null,
      idempotencyKey: null,
      executedAt: 42,
    });

    const { agents: rows } = await service.overview(PRICES);
    const row = rows.find((a) => a.id === "a1");

    expect(row?.mandate?.capitalMax).toBe(1000);
    expect(row?.mandate?.maxLeverage).toBe(3);
    expect(row?.lastAction?.toolName).toBe("place_order");
    expect(row?.lastAction?.executedAt).toBe(42);
  });

  it("liste le prize pool dans les wallets", async () => {
    const { service } = makeService([]);
    const { wallets } = await service.overview(PRICES);
    expect(wallets).toContainEqual({
      address: "rPrizePoolXXXXXXXXXXXXXXXXXXXXXXXXX",
      kind: "prize_pool",
      agentId: null,
      live: true,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tide/api test -- admin-service`
Expected: FAIL — `Cannot find module './admin-service'`.

- [ ] **Step 3: Write the service**

Créer `apps/api/src/services/admin-service.ts` :

```ts
import type { PriceMap } from "@tide/core";
import type { PaperService } from "./paper-service";
import type { Agent, AgentStatus, AgentType, AgentStore } from "../store/agent-store";
import type { MandateStore } from "../store/mandate-store";
import type { AgentActionsStore } from "../store/agent-actions-store";

/** Origine d'un compte paper. Précédence : operator > agent > frontend. */
export type AccountSegment = "operator" | "agent" | "frontend";

export interface AdminUserRow {
  readonly userId: string;
  readonly segment: AccountSegment;
  readonly equity: number;
  readonly pnl: number;
  readonly orders: number;
  readonly positions: number;
  readonly rank: number;
}

export interface AdminAgentRow {
  readonly id: string;
  readonly name: string;
  readonly type: AgentType;
  readonly status: AgentStatus;
  readonly ownerUserId: string;
  readonly hasLiveAccount: boolean;
  readonly mandate: {
    readonly capitalMax: number;
    readonly maxLeverage: number;
    readonly validUntil: number;
  } | null;
  readonly lastAction: {
    readonly toolName: string;
    readonly executedAt: number;
  } | null;
  readonly createdAt: number;
}

export type WalletKind = "agent" | "prize_pool";

export interface AdminWalletRow {
  readonly address: string | null;
  readonly kind: WalletKind;
  readonly agentId: string | null;
  readonly live: boolean;
}

export interface AdminSegmentTotals {
  readonly operator: number;
  readonly frontend: number;
  readonly agent: number;
}

export interface AdminAgentTotals {
  readonly total: number;
  readonly active: number;
  readonly paused: number;
  readonly stopped: number;
}

export interface AdminTotals {
  readonly users: number;
  readonly bySegment: AdminSegmentTotals;
  readonly agents: AdminAgentTotals;
  readonly wallets: number;
}

export interface AdminOverview {
  readonly totals: AdminTotals;
  readonly users: readonly AdminUserRow[];
  readonly agents: readonly AdminAgentRow[];
  readonly wallets: readonly AdminWalletRow[];
}

export interface AdminServiceDeps {
  readonly paper: PaperService;
  readonly agents: AgentStore;
  readonly mandates: MandateStore;
  readonly actions: AgentActionsStore;
  readonly prizePoolAddress: string | null;
  readonly operatorUserIds: ReadonlySet<string>;
}

/** Nombre d'actions récentes à charger par agent (seule la dernière est exposée). */
const LAST_ACTION_LIMIT = 1;

/**
 * Assemble la vue d'ensemble opérateur en lecture seule : population de comptes
 * segmentée par origine, agents (mandat + dernière action), wallets. Ne mute
 * rien ; réutilise le leaderboard du domaine (une seule règle d'equity/PnL).
 */
export class AdminService {
  constructor(private readonly deps: AdminServiceDeps) {}

  async overview(prices: PriceMap): Promise<AdminOverview> {
    const agents = await this.deps.agents.list();
    const agentOwners = new Set(agents.map((a) => a.userId));

    const users = this.buildUsers(prices, agentOwners);
    const agentRows = await this.buildAgents(agents);
    const wallets = this.buildWallets(agents);

    return {
      totals: this.buildTotals(users, agents, wallets),
      users,
      agents: agentRows,
      wallets,
    };
  }

  private classify(userId: string, agentOwners: ReadonlySet<string>): AccountSegment {
    if (this.deps.operatorUserIds.has(userId)) {
      return "operator";
    }
    if (agentOwners.has(userId)) {
      return "agent";
    }
    return "frontend";
  }

  private buildUsers(
    prices: PriceMap,
    agentOwners: ReadonlySet<string>,
  ): AdminUserRow[] {
    return this.deps.paper.leaderboard(prices).map((entry) => ({
      userId: entry.userId,
      segment: this.classify(entry.userId, agentOwners),
      equity: entry.equity,
      pnl: entry.pnl,
      orders: this.deps.paper.ordersOf(entry.userId).length,
      positions: this.deps.paper.positionsOf(entry.userId).length,
      rank: entry.rank,
    }));
  }

  private async buildAgents(agents: readonly Agent[]): Promise<AdminAgentRow[]> {
    return Promise.all(
      agents.map(async (agent) => {
        const mandate = await this.deps.mandates.getActive(agent.id);
        const recent = await this.deps.actions.listByAgent(agent.id, LAST_ACTION_LIMIT);
        const last = recent[0] ?? null;
        return {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          ownerUserId: agent.userId,
          hasLiveAccount: agent.hasLiveAccount,
          mandate:
            mandate === null
              ? null
              : {
                  capitalMax: mandate.capitalMax,
                  maxLeverage: mandate.maxLeverage,
                  validUntil: mandate.validUntil,
                },
          lastAction:
            last === null
              ? null
              : { toolName: last.toolName, executedAt: last.executedAt },
          createdAt: agent.createdAt,
        };
      }),
    );
  }

  private buildWallets(agents: readonly Agent[]): AdminWalletRow[] {
    const wallets: AdminWalletRow[] = agents
      .filter((a) => a.hasLiveAccount)
      .map((a) => ({ address: null, kind: "agent" as const, agentId: a.id, live: true }));
    if (this.deps.prizePoolAddress !== null) {
      wallets.push({
        address: this.deps.prizePoolAddress,
        kind: "prize_pool",
        agentId: null,
        live: true,
      });
    }
    return wallets;
  }

  private buildTotals(
    users: readonly AdminUserRow[],
    agents: readonly Agent[],
    wallets: readonly AdminWalletRow[],
  ): AdminTotals {
    const bySegment: AdminSegmentTotals = {
      operator: users.filter((u) => u.segment === "operator").length,
      agent: users.filter((u) => u.segment === "agent").length,
      frontend: users.filter((u) => u.segment === "frontend").length,
    };
    return {
      users: users.length,
      bySegment,
      agents: {
        total: agents.length,
        active: agents.filter((a) => a.status === "active").length,
        paused: agents.filter((a) => a.status === "paused").length,
        stopped: agents.filter((a) => a.status === "stopped").length,
      },
      wallets: wallets.length,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @tide/api test -- admin-service`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/admin-service.ts apps/api/src/services/admin-service.test.ts
git commit -m "feat(api): AdminService — agrégation + segmentation des comptes"
```

---

### Task 3: Config env — `TIDE_ADMIN_TOKEN` + `TIDE_OPERATOR_USER_IDS`

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Test: `apps/api/src/config/env.test.ts` (créer si absent ; sinon y ajouter les cas)
- Modify: `apps/api/.env.example` (documenter les 2 variables)

**Interfaces:**
- Produces: `readAdminToken(): string | undefined` ; `readOperatorUserIds(): string[]`.

- [ ] **Step 1: Write the failing test**

Créer `apps/api/src/config/env.test.ts` (ou ajouter ces `describe` s'il existe déjà) :

```ts
import { afterEach, describe, expect, it } from "vitest";
import { readAdminToken, readOperatorUserIds } from "./env";

const KEYS = ["TIDE_ADMIN_TOKEN", "TIDE_OPERATOR_USER_IDS"] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("readAdminToken", () => {
  it("renvoie undefined si absent", () => {
    expect(readAdminToken()).toBeUndefined();
  });
  it("renvoie le token configuré", () => {
    process.env["TIDE_ADMIN_TOKEN"] = "secret";
    expect(readAdminToken()).toBe("secret");
  });
});

describe("readOperatorUserIds", () => {
  it("renvoie [] si absent", () => {
    expect(readOperatorUserIds()).toEqual([]);
  });
  it("parse un CSV en ignorant espaces et entrées vides", () => {
    process.env["TIDE_OPERATOR_USER_IDS"] = " me , ,  test-2 ";
    expect(readOperatorUserIds()).toEqual(["me", "test-2"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tide/api test -- env`
Expected: FAIL — `readAdminToken`/`readOperatorUserIds` non exportés.

- [ ] **Step 3: Implement the readers**

Dans `apps/api/src/config/env.ts`, ajouter (à la suite des autres `readX`, en réutilisant l'helper `optional` déjà présent dans ce fichier) :

```ts
/** Token de la console admin. Absent → console désactivée (route non montée). */
export function readAdminToken(): string | undefined {
  return optional("TIDE_ADMIN_TOKEN");
}

/** userId « à moi » pour le segment operator (CSV). Vide → segment operator à 0. */
export function readOperatorUserIds(): string[] {
  const raw = optional("TIDE_OPERATOR_USER_IDS");
  if (raw === undefined) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tide/api test -- env`
Expected: PASS (4 tests).

- [ ] **Step 5: Document in `.env.example`**

Ajouter à `apps/api/.env.example` :

```bash
# Console admin (lecture seule, /admin) — absent = désactivée (route 404).
TIDE_ADMIN_TOKEN=
# userId « à moi » (CSV) → segment operator dans la console admin.
TIDE_OPERATOR_USER_IDS=
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/src/config/env.test.ts apps/api/.env.example
git commit -m "feat(api): env TIDE_ADMIN_TOKEN + TIDE_OPERATOR_USER_IDS"
```

---

### Task 4: Route `GET /admin/overview` + garde token + câblage

**Files:**
- Modify: `apps/api/src/http/server.ts` (interface `ServerDeps` + montage route)
- Modify: `apps/api/src/app.ts` (`AppConfig` + construction `AdminService` + passage `admin` à `buildServer`)
- Modify: `apps/api/src/main.ts` (lecture env + passage des stores/config à `createApp`)
- Test: `apps/api/src/http/admin-route.test.ts` (créer)

**Interfaces:**
- Consumes: `AdminService` (Task 2), `readAdminToken`/`readOperatorUserIds` (Task 3).
- Produces: route `GET /admin/overview` (header `x-admin-token`) → `AdminOverview` (200) / `{ error }` (401) / 404 si non montée. `ServerDeps.admin?: { token: string; service: AdminService }`. `AppConfig` gagne `adminToken?: string`, `operatorUserIds?: readonly string[]`, `agentStore?: AgentStore`, `mandateStore?: MandateStore`.

- [ ] **Step 1: Write the failing test**

Créer `apps/api/src/http/admin-route.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { buildServer } from "./server";
import { AdminService } from "../services/admin-service";
import { PaperService } from "../services/paper-service";
import { CompetitionService } from "../services/competition-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryAgentStore } from "../store/agent-store";
import { InMemoryMandateStore } from "../store/mandate-store";
import { InMemoryAgentActionsStore } from "../store/agent-actions-store";
import { InMemoryCompetitionStore } from "../store/competition-store";

const ADMIN_TOKEN = "secret";

function buildAdminServer() {
  const accounts = new InMemoryAccountStore();
  const paper = new PaperService(undefined, accounts);
  paper.openAccount("visitor");
  const service = new AdminService({
    paper,
    agents: new InMemoryAgentStore(),
    mandates: new InMemoryMandateStore(),
    actions: new InMemoryAgentActionsStore(),
    prizePoolAddress: null,
    operatorUserIds: new Set<string>(),
  });
  return buildServer({
    paper,
    competition: new CompetitionService(new InMemoryCompetitionStore()),
    getPrices: () => ({ XRP: 0.5 }),
    admin: { token: ADMIN_TOKEN, service },
  });
}

describe("GET /admin/overview", () => {
  it("401 sans token", async () => {
    const app = buildAdminServer();
    const res = await app.inject({ method: "GET", url: "/admin/overview" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("401 avec mauvais token", async () => {
    const app = buildAdminServer();
    const res = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { "x-admin-token": "wrong" },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("200 + payload avec le bon token", async () => {
    const app = buildAdminServer();
    const res = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totals.users).toBe(1);
    expect(body.users[0].segment).toBe("frontend");
    await app.close();
  });

  it("404 si la console n'est pas montée (deps.admin absent)", async () => {
    const app = buildServer({
      paper: new PaperService(undefined, new InMemoryAccountStore()),
      competition: new CompetitionService(new InMemoryCompetitionStore()),
      getPrices: () => ({ XRP: 0.5 }),
    });
    const res = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
```

> Note : vérifier le nom réel du store compétition en mémoire (`InMemoryCompetitionStore`) via `apps/api/src/store/competition-store.ts` ; ajuster l'import si le nom diffère. `CompetitionService` est requis par `buildServer` (dépendance existante).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tide/api test -- admin-route`
Expected: FAIL — `admin` inconnu dans `ServerDeps` (typecheck) / route 404 partout.

- [ ] **Step 3: Add `admin` to `ServerDeps` + mount the route**

Dans `apps/api/src/http/server.ts` :

Ajouter l'import en tête (avec les autres imports de services) :

```ts
import type { AdminService } from "../services/admin-service";
```

Ajouter à l'interface `ServerDeps` (après `badgeService`) :

```ts
  /** Console admin (route /admin/overview) — absente si TIDE_ADMIN_TOKEN non configuré. */
  readonly admin?: { readonly token: string; readonly service: AdminService };
```

Monter la route dans `buildServer`, à la fin (avant le `return app;`), en suivant le patron conditionnel des autres services :

```ts
  // Console admin (lecture seule) : montée uniquement si un token est configuré
  // (TIDE_ADMIN_TOKEN). Absente → 404, rien n'est exposé en prod par défaut.
  if (deps.admin !== undefined) {
    const admin = deps.admin;
    app.get("/admin/overview", async (request, reply) => {
      const token = request.headers["x-admin-token"];
      if (typeof token !== "string" || token !== admin.token) {
        reply.code(401);
        return { error: "unauthorized" };
      }
      return admin.service.overview(deps.getPrices());
    });
  }
```

- [ ] **Step 4: Run route test — auth cases pass, wiring next**

Run: `pnpm --filter @tide/api test -- admin-route`
Expected: PASS (4 tests). Le service n'est pas encore câblé dans `app.ts`/`main.ts` — c'est l'objet des steps suivants.

- [ ] **Step 5: Thread config through `app.ts`**

Dans `apps/api/src/app.ts` :

Imports (avec les autres imports de stores/services) :

```ts
import { AdminService } from "./services/admin-service";
import type { AgentStore } from "./store/agent-store";
import type { MandateStore } from "./store/mandate-store";
```

Ajouter à l'interface `AppConfig` (près de `agentActionsStore`) :

```ts
  readonly adminToken?: string;
  readonly operatorUserIds?: readonly string[];
  readonly agentStore?: AgentStore;
  readonly mandateStore?: MandateStore;
```

Dans `createApp`, après la construction de `paper` et avant `buildServer`, construire l'admin quand tous les éléments sont présents :

```ts
  // Console admin : active seulement si un token ET les stores agents/mandats/actions
  // sont fournis (le reste — comptes paper — est toujours là via `paper`).
  const admin =
    config.adminToken !== undefined &&
    config.agentStore !== undefined &&
    config.mandateStore !== undefined &&
    config.agentActionsStore !== undefined
      ? {
          token: config.adminToken,
          service: new AdminService({
            paper,
            agents: config.agentStore,
            mandates: config.mandateStore,
            actions: config.agentActionsStore,
            prizePoolAddress: config.prizePoolAddress ?? null,
            operatorUserIds: new Set(config.operatorUserIds ?? []),
          }),
        }
      : undefined;
```

> Note : `config.prizePoolAddress` — vérifier dans `AppConfig` s'il existe déjà (le serveur reçoit `prizePoolAddress` via `sign`). S'il n'est pas dans `AppConfig`, ajouter `readonly prizePoolAddress?: string;` à `AppConfig` et le passer depuis `main.ts` (`env.readPrizePoolAddress()`). Sinon réutiliser le champ existant.

Passer `admin` à `buildServer` (ajouter la clé dans l'objet passé) :

```ts
    admin,
```

- [ ] **Step 6: Wire `main.ts`**

Dans `apps/api/src/main.ts`, dans l'objet passé à `createApp({ ... })`, ajouter (les stores `agentStore`, `mandateStore`, `agentActionsStore` existent déjà comme variables locales) :

```ts
    adminToken: env.readAdminToken(),
    operatorUserIds: env.readOperatorUserIds(),
    agentStore,
    mandateStore,
    prizePoolAddress: env.readPrizePoolAddress(),
```

> `env.readAdminToken` / `env.readOperatorUserIds` viennent de Task 3 ; `env.readPrizePoolAddress` existe déjà. `agentActionsStore` est déjà passé à `createApp`.

- [ ] **Step 7: Run full api test suite + typecheck**

Run: `pnpm --filter @tide/api test && pnpm --filter @tide/api typecheck`
Expected: tous verts (dont les 4 tests de `admin-route`).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/http/server.ts apps/api/src/app.ts apps/api/src/main.ts apps/api/src/http/admin-route.test.ts
git commit -m "feat(api): route GET /admin/overview + garde token + câblage runtime"
```

---

### Task 5: Client `@tide/client` — header + `adminOverview`

**Files:**
- Modify: `packages/client/src/transport.ts` (ajout `headers?` à `ApiRequest`)
- Modify: `apps/web/src/lib/transport.ts` (forward des headers dans le fetch)
- Modify: `packages/client/src/client.ts` (types DTO + méthode `adminOverview`)
- Test: `packages/client/src/client.test.ts` (ajouter le cas ; sinon créer)

**Interfaces:**
- Consumes: réponse de `GET /admin/overview` (Task 4).
- Produces: `TideClient.adminOverview(token: string): Promise<AdminOverviewDto>` ; DTO `AdminOverviewDto` (miroir de `AdminOverview` côté service). `ApiRequest.headers?: Record<string, string>`.

- [ ] **Step 1: Write the failing test**

Ajouter à `packages/client/src/client.test.ts` (ou créer le fichier avec l'import du client et un faux transport) :

```ts
import { describe, expect, it } from "vitest";
import { TideClient } from "./client";
import type { ApiRequest, ApiResponse } from "./transport";

describe("TideClient.adminOverview", () => {
  it("appelle GET /admin/overview avec le header x-admin-token", async () => {
    let seen: ApiRequest | undefined;
    const transport = async (req: ApiRequest): Promise<ApiResponse> => {
      seen = req;
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
    const client = new TideClient(transport);

    const overview = await client.adminOverview("secret");

    expect(seen?.path).toBe("/admin/overview");
    expect(seen?.method).toBe("GET");
    expect(seen?.headers).toEqual({ "x-admin-token": "secret" });
    expect(overview.totals.users).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tide/client test -- client`
Expected: FAIL — `adminOverview` inexistant / `headers` inconnu sur `ApiRequest`.

- [ ] **Step 3: Add `headers` to `ApiRequest`**

Dans `packages/client/src/transport.ts`, ajouter à l'interface `ApiRequest` :

```ts
  /** En-têtes HTTP additionnels (ex. token admin). */
  readonly headers?: Record<string, string>;
```

- [ ] **Step 4: Forward headers in the web fetch transport**

Dans `apps/web/src/lib/transport.ts`, fusionner `request.headers` dans l'objet `headers` du fetch :

```ts
    const response = await fetchLike(baseUrl + request.path, {
      method: request.method,
      headers: {
        ...(hasBody ? { "content-type": "application/json" } : {}),
        ...(request.headers ?? {}),
      },
      ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
    });
```

- [ ] **Step 5: Add DTO types + method in the client**

Dans `packages/client/src/client.ts`, ajouter les types DTO (près des autres DTO, ex. après `BadgeDto`) :

```ts
export type AccountSegment = "operator" | "agent" | "frontend";

export interface AdminUserDto {
  readonly userId: string;
  readonly segment: AccountSegment;
  readonly equity: number;
  readonly pnl: number;
  readonly orders: number;
  readonly positions: number;
  readonly rank: number;
}

export interface AdminAgentDto {
  readonly id: string;
  readonly name: string;
  readonly type: "external" | "integrated";
  readonly status: "active" | "paused" | "stopped";
  readonly ownerUserId: string;
  readonly hasLiveAccount: boolean;
  readonly mandate: {
    readonly capitalMax: number;
    readonly maxLeverage: number;
    readonly validUntil: number;
  } | null;
  readonly lastAction: {
    readonly toolName: string;
    readonly executedAt: number;
  } | null;
  readonly createdAt: number;
}

export interface AdminWalletDto {
  readonly address: string | null;
  readonly kind: "agent" | "prize_pool";
  readonly agentId: string | null;
  readonly live: boolean;
}

export interface AdminOverviewDto {
  readonly totals: {
    readonly users: number;
    readonly bySegment: { readonly operator: number; readonly frontend: number; readonly agent: number };
    readonly agents: { readonly total: number; readonly active: number; readonly paused: number; readonly stopped: number };
    readonly wallets: number;
  };
  readonly users: readonly AdminUserDto[];
  readonly agents: readonly AdminAgentDto[];
  readonly wallets: readonly AdminWalletDto[];
}
```

Ajouter la méthode dans la classe `TideClient` (après une méthode GET existante, ex. `metrics`) :

```ts
  // --- Admin (console opérateur, lecture seule) ---

  async adminOverview(token: string): Promise<AdminOverviewDto> {
    return this.call(
      { path: "/admin/overview", method: "GET", headers: { "x-admin-token": token } },
      200,
    );
  }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @tide/client test && pnpm --filter @tide/client typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/client/src/transport.ts packages/client/src/client.ts packages/client/src/client.test.ts apps/web/src/lib/transport.ts
git commit -m "feat(client): adminOverview + support des headers HTTP"
```

---

### Task 6: Front — `useAdmin` + `AdminView.vue` + route `/admin`

**Files:**
- Create: `apps/web/src/composables/useAdmin.ts`
- Create: `apps/web/src/views/AdminView.vue`
- Modify: `apps/web/src/composables/useRoute.ts` (ajouter `/admin` à `ROUTES`)
- Modify: `apps/web/src/App.vue` (import + rendu conditionnel)
- Test: `apps/web/src/composables/useAdmin.test.ts` (créer)

**Interfaces:**
- Consumes: `TideClient.adminOverview(token)` (Task 5), `useRoute` (existant).
- Produces: `useAdmin(client)` → `{ token, overview, error, loading, load, logout }`. Vue `/admin` hors nav publique.

- [ ] **Step 1: Write the failing test (composable logic)**

Créer `apps/web/src/composables/useAdmin.test.ts` :

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAdmin } from "./useAdmin";
import type { TideClient, AdminOverviewDto } from "@tide/client";
import { TideApiError } from "@tide/client";

const EMPTY: AdminOverviewDto = {
  totals: {
    users: 0,
    bySegment: { operator: 0, frontend: 0, agent: 0 },
    agents: { total: 0, active: 0, paused: 0, stopped: 0 },
    wallets: 0,
  },
  users: [],
  agents: [],
  wallets: [],
};

beforeEach(() => {
  sessionStorage.clear();
});

describe("useAdmin", () => {
  it("charge l'overview et persiste le token en sessionStorage", async () => {
    const client = { adminOverview: vi.fn().mockResolvedValue(EMPTY) } as unknown as TideClient;
    const admin = useAdmin(client);

    admin.token.value = "secret";
    await admin.load();

    expect(client.adminOverview).toHaveBeenCalledWith("secret");
    expect(admin.overview.value).toEqual(EMPTY);
    expect(sessionStorage.getItem("tide.adminToken")).toBe("secret");
  });

  it("efface le token sur 401", async () => {
    const client = {
      adminOverview: vi.fn().mockRejectedValue(new TideApiError(401, "unauthorized")),
    } as unknown as TideClient;
    const admin = useAdmin(client);
    admin.token.value = "wrong";

    await admin.load();

    expect(admin.token.value).toBe("");
    expect(admin.error.value).not.toBe("");
    expect(sessionStorage.getItem("tide.adminToken")).toBeNull();
  });
});
```

> Note : vérifier que `TideApiError` est bien exporté depuis `@tide/client` (voir `packages/client/src/index.ts` / `errors.ts`). Ajouter l'export si nécessaire.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tide/web test -- useAdmin`
Expected: FAIL — module `./useAdmin` introuvable.

- [ ] **Step 3: Write the composable**

Créer `apps/web/src/composables/useAdmin.ts` :

```ts
import { ref } from "vue";
import type { TideClient, AdminOverviewDto } from "@tide/client";
import { TideApiError } from "@tide/client";

const TOKEN_KEY = "tide.adminToken";

/** État de la console admin : token (persisté), overview, chargement. */
export function useAdmin(client: TideClient) {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) ?? "");
  const overview = ref<AdminOverviewDto | null>(null);
  const error = ref("");
  const loading = ref(false);

  async function load(): Promise<void> {
    if (token.value === "") {
      error.value = "Token requis.";
      return;
    }
    loading.value = true;
    error.value = "";
    try {
      overview.value = await client.adminOverview(token.value);
      sessionStorage.setItem(TOKEN_KEY, token.value);
    } catch (err) {
      overview.value = null;
      if (err instanceof TideApiError && err.status === 401) {
        logout();
        error.value = "Token invalide.";
      } else {
        error.value = err instanceof Error ? err.message : "Erreur de chargement.";
      }
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    token.value = "";
    overview.value = null;
    sessionStorage.removeItem(TOKEN_KEY);
  }

  return { token, overview, error, loading, load, logout };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tide/web test -- useAdmin`
Expected: PASS (2 tests).

- [ ] **Step 5: Register the `/admin` route**

Dans `apps/web/src/composables/useRoute.ts`, ajouter `"/admin"` au tableau `ROUTES` (à la fin, avant `] as const`) :

```ts
  "/agent",
  "/learn",
  "/admin",
] as const;
```

- [ ] **Step 6: Write `AdminView.vue`**

Créer `apps/web/src/views/AdminView.vue` (lecture seule, sur les tokens design existants — reprendre les classes utilitaires d'une vue voisine comme `LeaderboardView.vue` pour rester cohérent) :

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import type { TideClient } from "@tide/client";
import { useAdmin } from "../composables/useAdmin";

const props = defineProps<{ client: TideClient }>();
const { token, overview, error, loading, load, logout } = useAdmin(props.client);

const SEGMENT_LABEL: Record<string, string> = {
  operator: "À moi",
  frontend: "Via le front",
  agent: "Agent IA",
};

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

onMounted(() => {
  if (token.value !== "") void load();
});
</script>

<template>
  <section class="admin">
    <header class="admin__head">
      <h1>Console admin</h1>
      <p class="admin__sub">Supervision des comptes — lecture seule.</p>
    </header>

    <form v-if="overview === null" class="admin__gate" @submit.prevent="load">
      <label for="admin-token">Token opérateur</label>
      <input id="admin-token" v-model="token" type="password" autocomplete="off" />
      <button type="submit" :disabled="loading">Entrer</button>
      <p v-if="error" class="admin__error">{{ error }}</p>
    </form>

    <template v-else>
      <div class="admin__bar">
        <button type="button" @click="load" :disabled="loading">Rafraîchir</button>
        <button type="button" @click="logout">Verrouiller</button>
        <span v-if="error" class="admin__error">{{ error }}</span>
      </div>

      <div class="admin__totals">
        <div class="card">
          <span class="card__label">Utilisateurs</span>
          <strong class="card__value">{{ overview.totals.users }}</strong>
          <ul class="segments">
            <li>À moi : {{ overview.totals.bySegment.operator }} ({{ pct(overview.totals.bySegment.operator, overview.totals.users) }})</li>
            <li>Via le front : {{ overview.totals.bySegment.frontend }} ({{ pct(overview.totals.bySegment.frontend, overview.totals.users) }})</li>
            <li>Agents IA : {{ overview.totals.bySegment.agent }} ({{ pct(overview.totals.bySegment.agent, overview.totals.users) }})</li>
          </ul>
        </div>
        <div class="card">
          <span class="card__label">Agents</span>
          <strong class="card__value">{{ overview.totals.agents.total }}</strong>
          <ul class="segments">
            <li>Actifs : {{ overview.totals.agents.active }}</li>
            <li>En pause : {{ overview.totals.agents.paused }}</li>
            <li>Arrêtés : {{ overview.totals.agents.stopped }}</li>
          </ul>
        </div>
        <div class="card">
          <span class="card__label">Wallets</span>
          <strong class="card__value">{{ overview.totals.wallets }}</strong>
        </div>
      </div>

      <h2>Utilisateurs</h2>
      <table class="admin__table">
        <thead>
          <tr><th>userId</th><th>Origine</th><th>Equity</th><th>PnL</th><th>Ordres</th><th>Positions</th><th>Rang</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in overview.users" :key="u.userId">
            <td>{{ u.userId }}</td>
            <td>{{ SEGMENT_LABEL[u.segment] }}</td>
            <td>{{ u.equity.toFixed(2) }}</td>
            <td>{{ u.pnl.toFixed(2) }}</td>
            <td>{{ u.orders }}</td>
            <td>{{ u.positions }}</td>
            <td>{{ u.rank }}</td>
          </tr>
        </tbody>
      </table>

      <h2>Agents</h2>
      <table class="admin__table">
        <thead>
          <tr><th>Nom</th><th>Type</th><th>Statut</th><th>Owner</th><th>Mandat</th><th>Dernière action</th><th>Live</th></tr>
        </thead>
        <tbody>
          <tr v-for="a in overview.agents" :key="a.id">
            <td>{{ a.name }}</td>
            <td>{{ a.type }}</td>
            <td>{{ a.status }}</td>
            <td>{{ a.ownerUserId }}</td>
            <td>{{ a.mandate ? `cap ${a.mandate.capitalMax} · x${a.mandate.maxLeverage}` : "—" }}</td>
            <td>{{ a.lastAction ? a.lastAction.toolName : "—" }}</td>
            <td>{{ a.hasLiveAccount ? "oui" : "non" }}</td>
          </tr>
        </tbody>
      </table>

      <h2>Wallets</h2>
      <table class="admin__table">
        <thead>
          <tr><th>Adresse</th><th>Type</th><th>Agent</th><th>Live</th></tr>
        </thead>
        <tbody>
          <tr v-for="(w, i) in overview.wallets" :key="i">
            <td>{{ w.address ?? "—" }}</td>
            <td>{{ w.kind }}</td>
            <td>{{ w.agentId ?? "—" }}</td>
            <td>{{ w.live ? "oui" : "non" }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>

<style scoped>
.admin { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }
.admin__head h1 { margin: 0; }
.admin__sub { opacity: 0.7; margin: 0.25rem 0 1.5rem; }
.admin__gate { display: grid; gap: 0.5rem; max-width: 360px; }
.admin__bar { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1.5rem; }
.admin__error { color: #c0392b; }
.admin__totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.card { border: 1px solid rgba(128,128,128,0.3); border-radius: 8px; padding: 1rem; }
.card__label { display: block; text-transform: uppercase; font-size: 0.75rem; opacity: 0.7; }
.card__value { font-size: 2rem; }
.segments { list-style: none; padding: 0; margin: 0.5rem 0 0; font-size: 0.85rem; }
.admin__table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.85rem; }
.admin__table th, .admin__table td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid rgba(128,128,128,0.2); }
</style>
```

> ponytail : styles inline minimaux, pas de refonte des tokens design ici. Si Armand veut l'alignement visuel exact, reprendre les classes d'une vue voisine — hors scope de la fonctionnalité (données d'abord).

- [ ] **Step 7: Render the route in `App.vue`**

Dans `apps/web/src/App.vue`, importer la vue (avec les autres imports) :

```ts
import AdminView from "./views/AdminView.vue";
```

Et ajouter le rendu conditionnel (à la fin de la liste des `v-else-if`, avant la fermeture) :

```vue
    <AdminView v-else-if="current === '/admin'" :client="client" />
```

> Aucun lien vers `/admin` dans `AppBar`/footer : la route reste hors navigation publique (accès direct par URL `#/admin`).

- [ ] **Step 8: Verify build + typecheck**

Run: `pnpm --filter @tide/web test -- useAdmin && pnpm --filter @tide/web typecheck && pnpm --filter @tide/web build`
Expected: tests PASS, typecheck sans erreur, build OK.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/composables/useAdmin.ts apps/web/src/composables/useAdmin.test.ts apps/web/src/views/AdminView.vue apps/web/src/composables/useRoute.ts apps/web/src/App.vue
git commit -m "feat(web): console admin /admin (lecture seule, token opérateur)"
```

---

### Task 7: Vérification bout en bout + docs

**Files:**
- Modify: `CLAUDE.md` (ligne « Où on en est » : ajouter la console admin)
- Modify: `docs/DEVLOG.md` (entrée datée)

- [ ] **Step 1: Full suite + typecheck + lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: tout vert (nouveaux tests inclus), lint sans nouvelle erreur.

- [ ] **Step 2: Runtime smoke test (manuel)**

Lancer l'API avec un token et un compte de test :

```bash
TIDE_ADMIN_TOKEN=devtoken TIDE_OPERATOR_USER_IDS=demo pnpm --filter @tide/api start
```

Vérifier :

```bash
curl -s localhost:3000/admin/overview | head -c 60          # attendu : 401
curl -s -H "x-admin-token: devtoken" localhost:3000/admin/overview | head -c 200  # attendu : JSON totals/users/...
```

Puis lancer le front (`pnpm --filter @tide/web dev`), ouvrir `#/admin`, saisir `devtoken`, vérifier l'affichage des totaux + tables.

- [ ] **Step 3: Update docs**

Ajouter une entrée `docs/DEVLOG.md` (Quoi / Pourquoi / Cheminement / Bugs & fix) et une ligne dans `CLAUDE.md` « Où on en est » décrivant la console admin (lecture seule, segmentation operator/frontend/agent, OFF par défaut sans `TIDE_ADMIN_TOKEN`).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/DEVLOG.md
git commit -m "docs: console admin — DEVLOG + CLAUDE.md"
```

---

## Self-Review

**1. Spec coverage :**
- Console unifiée users + agents + wallets → Task 2 (`AdminService`) + Task 6 (view). ✓
- Résumé segmenté (à moi / via le front / agents IA) + total → Task 2 (`buildTotals`/`classify`), Task 6 (cartes totaux). ✓
- Précédence operator > agent > frontend → Task 2 (`classify`) + test dédié. ✓
- Garde token, OFF par défaut (404 sans env) → Task 3 (env) + Task 4 (route + montage conditionnel) + tests 401/404/200. ✓
- Lecture seule, zéro mutation → aucune route/bouton d'écriture. ✓
- Allowlist `TIDE_OPERATOR_USER_IDS`, `TIDE_ADMIN_TOKEN` → Task 3 + `.env.example`. ✓
- Wallets = agents live + prize pool (config), pas de fetch on-chain v1 → Task 2 (`buildWallets`). ✓
- Zéro nouvelle dépendance → respecté (stdlib + libs existantes). ✓

**2. Placeholder scan :** aucun « TBD/TODO » ; chaque step porte le code réel. Deux `> Note` demandent une vérification de nom local (store compétition en mémoire, champ `prizePoolAddress` dans `AppConfig`, export `TideApiError`) — ce sont des points de vigilance d'intégration, pas des placeholders de logique.

**3. Type consistency :** `AdminOverview` (service, Task 2) et `AdminOverviewDto` (client, Task 5) ont des formes identiques ; `AccountSegment` partagé de nom ; `overview(prices)` async cohérent entre service, route (`deps.admin.service.overview(deps.getPrices())`) et client. `AgentStore.list()` défini en Task 1, consommé en Task 2. `useAdmin` renvoie `{ token, overview, error, loading, load, logout }`, tous utilisés dans `AdminView.vue`.
