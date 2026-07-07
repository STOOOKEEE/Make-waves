# 04 — AI Agent / MCP (à moitié câblé) 🟡🔴

> **Verdict : deux chemins d'accès aux agents. Le MCP standalone (Claude Desktop/Cursor) est réellement connecté au backend. Le chat intégré dans l'UI Tide est entièrement stubbé et n'exécute rien. De plus, les routes agents/mandats ne sont pas montées dans le runtime réel.**

## Les 20 outils MCP

Confirmés dans `packages/mcp/src/tools/index.ts` :

`get_market, get_markets, get_history, get_orderbook, get_balance, get_portfolio, get_positions, get_leaderboard, place_order, cancel_order, open_position, close_position, list_competitions, get_competition, join_competition, get_competition_leaderboard, get_mandate, get_risk_limits, get_config, get_agent_status`

## Garde-fous serveur — RÉELS ✅

`packages/mcp/src/lib/guard.ts` (`enforceRiskLimits`), appliqués **avant chaque écriture** :
- capital max (`capitalEngaged + tradeValue > mandate.capitalMax`)
- perte max/jour (`perteJour >= mandate.perteMaxJour`)
- max trades/jour, leverage max, paires autorisées
- **Kill switch** — `killAgent` (route `/api/agents/:id/kill`) + refus de boot si `agent.status === "stopped"` (`bin/tide-mcp.ts`)
- chaque action auditée (`recordAction`) + idempotence via `client_order_id`

## Chemin 1 — MCP standalone : RÉELLEMENT connecté ✅

`packages/mcp/bin/tide-mcp.ts` :
- `loadContext()` fetch le vrai agent + mandate actif via HTTP (`TideApiHttp`).
- Tous les backends (`priceFeed/paper/trading/perp/competitions/actions`) sont des **adaptateurs HTTP** vers `apps/api` (`src/lib/api-client.ts`).
- Requiert `TIDE_API_BASE_URL`, `TIDE_AGENT_ID`, `TIDE_USER_ID`.
- **Ce n'est pas un stub** — c'est le chemin qui marche.

## Chemin 2 — chat intégré dans l'UI : STUBS 🔴

`apps/api/src/http/server.ts:120-188` :
```ts
function throwAgentChatNotWired(): never {
  throw new Error("agent chat not wired — runtime ctx missing");
}
```
`buildAgentChatCtx()` construit un `McpContext` dont **chaque méthode** (`priceOf`, `markets`, `history`, `orderbook`, `getBalance`, `getPortfolio`, `listPositions`, `placeOrder`, `openPosition`, compétitions…) lève cette erreur.

Conséquence : la route `/api/agent-chat/stream` est montée si `TIDE_LLM_API_KEY` est présent, le LLM voit les 20 outils, mais **toute lecture/écriture échoue**. Choix assumé (« jamais de succès silencieux »), mais le trading piloté par LLM dans l'UI **n'exécute rien aujourd'hui**.

## Problème transverse — routes agents non montées ⚠️

`apps/api/src/main.ts:275-291` appelle `createApp` avec seulement :
```
markets, fetchJson, accountStore, competitionStore, onchainPrices,
getBookDepth, getDexHistory, sign, exec, metrics, agentChatService
```

Il **ne passe PAS** `agentService`, `mandateService`, `agentActionsStore`, ni `agentXrplAccountService`. Donc **toutes** les routes suivantes **n'existent pas au runtime réel** (elles ne sont exercées que par les tests) :
- `/api/agents*` (CRUD, kill, SSE events)
- `/api/mandates*`
- `/api/agent-actions*`
- `/api/agents/:id/live-account`

➡️ **La vue front `AgentView.vue` appelle ces routes → elle est cassée en runtime réel.** C'est le décalage le plus dangereux à corriger si on veut une démo agent crédible.

## Mode Live agent — partout stubbé 🔴

- `liveCrypto.decryptAgentSeed()` lève « Live mode not wired in MVP — set up `TIDE_AGENT_KEY_MASTER` + apps/api live-account endpoints » (`bin/tide-mcp.ts`).
- `trading-live.ts` throw si pas de `liveCrypto`.
- `placeLiveOrder` POST vers `/api/exec/live-offer` marqué `TODO : endpoint pas encore câblé` (`api-client.ts`).
- Import de seed → **501** (`server.ts:636-639`).
- Config par défaut = `mode: "paper"`.

## Ce qu'il faudrait pour un agent fonctionnel dans l'UI

1. **Câbler `buildAgentChatCtx`** sur les vrais services (paper/trading/perp/competitions/price) au lieu des `throwAgentChatNotWired`.
2. **Monter les routes agents** en passant `agentService`/`mandateService`/`agentActionsStore` à `createApp` dans `main.ts`.
3. (Live agent) câbler `TIDE_AGENT_KEY_MASTER` + endpoints live-account + soumission — chantier plus lourd.

## Conclusion

Les fondations (20 outils, garde-fous durs, kill switch, audit, idempotence) sont solides et le **MCP externe marche**. Mais l'**agent dans l'UI Tide est une coquille** : routes non montées + ctx stubbé. C'est un câblage à faire, pas une réécriture.
