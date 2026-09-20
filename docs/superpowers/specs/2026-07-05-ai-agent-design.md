# Tide AI Agent — Design

> Statut : design validé · Date : 2026-07-05 · Plateforme : XRPL Mainnet + MCP · Contexte : hackathon Make Waves XRPL, fin 2026-09-21
> Brainstorming : 8 décisions de cadrage + 5 sections de design validées par Armand.
> Spec de référence : [`../SPEC.md`](../SPEC.md) · Roadmap : [`../ROADMAP.md`](../ROADMAP.md)

Cette spec ajoute au produit Tide existant (cf. SPEC §1) une couche **AI Agent** : des agents autonomes (externes via MCP ou intégrés dans l'UI) qui tradent via les primitives Tide, scopés par un mandat signé et encadrés par des garde-fous durs serveur.

---

## 1. Vue d'ensemble

**Tide devient MCP-native** : l'app expose ses outils de trading via le protocole MCP (Model Context Protocol), et propose en parallèle un **agent intégré** dans l'UI pour les users qui n'ont pas d'agent externe. Les deux populations utilisent **les mêmes outils** (définis une fois dans `@tide/mcp`), avec **les mêmes garde-fous durs**.

- **Pourquoi** : (a) Hackathon = faire monter les compteurs `SourceTag`. Les agents sont une nouvelle source de volume taggé. (b) MCP est le standard émergent (2026) pour brancher des agents LLM à des outils. Être MCP-native = signal modernité fort + intégration gratuite avec Claude Desktop, Cursor, etc. (c) L'archi modulaire permet de tester les outils en isolation avant d'exposer l'agent.
- **Population cible** : étudiants / retail qui veulent tester des stratégies en mode agent, et power users qui veulent brancher leur propre agent sur Tide.
- **Métrique de succès** : (1) ≥ 1 agent externe branché sur Tide via MCP, (2) ≥ 1 agent intégré actif qui ouvre des positions, (3) garde-fous durs jamais bypassés (test de sécurité dédié), (4) volume taggé généré par les agents contribue au compteur SourceTag.

### Décisions verrouillées (cadrage du 2026-07-05)

| # | Décision | Raison |
|---|---|---|
| 1 | **Tide = infra pure** (serveur MCP + UI). L'agent LLM est externe OU intégré (BYOK). Tide n'héberge pas de clé LLM par user sauf pour la clé démo. | Standard MCP = l'agent vit chez l'user. Évite la gestion de clés sensibles côté Tide. |
| 2 | **Mode Paper + Live** pour les deux types d'agent. | Couvrir les deux métriques hackathon (users + volume). |
| 3 | **Boîte à outils de trading** exposée en MCP, pas de stratégies codées en dur. Le LLM compose dynamiquement (DCA, momentum, mean reversion = patterns qu'il assemble à partir de `place_order`, `get_history`, etc.). | Plus différenciant : le LLM est un vrai agent qui raisonne, pas un bouton "activer stratégie X". |
| 4 | **Mandat structuré + chat libre** pour l'agent intégré. | Compromis classique : pédagogique (mandat) + flexible (chat). |
| 5 | **Scope riche (~20+ outils MCP)** en v1. | Démo impressive, surface maintenable. |
| 6 | **Garde-fous durs obligatoires serveur** (capital max, perte max / jour, max trades / jour, max levier, kill switch). Pas de mode "avancé" pour les contourner. | Sécurité critique (on touche à de l'argent). |
| 7 | **Live = compte XRPL agent dédié** (l'user dépose des fonds sur un compte agent, stocke la clé chiffrée côté Tide). Pas de multi-sig en v1. | Plus simple à implémenter et à raisonner. Multi-sig = v2. |
| 8 | **Transport MCP = stdio** (process local Node). Pas de HTTP multi-tenant en v1. | Le plus simple, supporté nativement par Claude Desktop. SaaS-ready possible en additif post-hackathon. |

---

## 2. Architecture

### 2.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│             Agent externe (Claude Desktop, Cursor…)          │
│   LLM tiers qui raisonne et appelle les outils Tide via MCP │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP stdio (JSON-RPC)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           @tide/mcp (nouveau package)                       │
│   Serveur MCP : expose ~20 outils                           │
│   - Validation systématique : mandat + garde-fous + scope  │
│   - Délègue aux moteurs existants (@tide/core, @tide/xrpl)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┴────────────────┐
       ▼                                ▼
┌──────────────────┐         ┌───────────────────────┐
│   Tide API       │         │   XRPL Mainnet        │
│   Fastify +      │ ──────► │   (Live, compte       │
│   SQLite +       │         │    agent dédié)       │
│   services       │         │                       │
└──────┬───────────┘         │   Paper = off-chain   │
       │                     │   Live  = on-chain    │
       ▼                     └───────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│             Tide Web (Vue 3 + Vite)                         │
│   - Dashboard existant                                      │
│   - AgentView (NOUVEAU) : mandat + chat + log actions      │
│   - useAgent (SSE streaming des réponses LLM)               │
└─────────────────────────────────────────────────────────────┘
                       ▲
                       │ HTTP + SSE
                       │ (BYOK : clé user, ou clé démo Tide)
                       │
              ┌────────┴─────────┐
              │    Claude API    │
              └──────────────────┘
```

### 2.2 Modèle de déploiement

- **Serveur MCP** : package `@tide/mcp` publié en local (`pnpm --filter @tide/mcp start` ou via `npx tide-mcp`), lancé comme process Node par Claude Desktop (config : `claude_desktop_config.json` → `command: "npx", args: ["tide-mcp"]`).
- **Tide API** : Fastify + SQLite, monte les routes `/api/agents/*`, `/api/mandates/*`, `/api/agent-actions`, `/api/agent-chat/*`.
- **Tide Web** : SPA Vue 3, déployée comme aujourd'hui, ajoute `views/AgentView.vue` et la navigation.
- **Compte XRPL agent** (option Live) : généré à la création de l'agent Live, la clé est chiffrée (AES-256-GCM) avec une master key lue depuis `TIDE_AGENT_KEY_MASTER` (variable d'env, 32 bytes hex). `master_key_id` est un identifiant versionnable (`v1`, `v2`, …) qui permettra une rotation future sans casser les clés existantes — pour le MVP, on n'utilise qu'une seule clé et un seul `master_key_id = "v1"`.

---

## 3. Composants

### 3.1 Nouveau package `@tide/mcp`

```
packages/mcp/
├── package.json
├── tsconfig.json
├── bin/
│   └── tide-mcp.ts           # entrypoint CLI (`npx tide-mcp`)
└── src/
    ├── server.ts             # bootstrap serveur MCP stdio
    ├── lib/
    │   ├── guard.ts          # middleware de validation (mandat + garde-fous)
    │   ├── audit.ts          # écriture dans agent_actions
    │   ├── errors.ts         # McpError + mapping codes
    │   ├── context.ts        # contexte MCP (userId, agentId, mandate)
    │   └── transport.ts      # format MCP ↔ services Tide
    └── tools/
        ├── market.ts         # get_market, get_markets, get_history, get_orderbook
        ├── portfolio.ts      # get_portfolio, get_balance, get_leaderboard
        ├── trading-spot.ts   # place_order, cancel_order
        ├── trading-perp.ts   # open_position, close_position, list_positions
        ├── competitions.ts   # list_competitions, join_competition, get_competition_leaderboard
        ├── mandate.ts        # get_mandate, get_risk_limits
        └── meta.ts           # get_config, get_agent_status
```

**Dépendance** : `@modelcontextprotocol/sdk` (lib TypeScript officielle MCP, MIT). Réutilise `@tide/core` (Paper), `@tide/xrpl` (Live), `@tide/client` (contrat API).

### 3.2 Extension `apps/api`

- **Routes HTTP** :
  - `POST /api/agents` (CRUD)
  - `GET /api/agents/:id` — état d'un agent
  - `POST /api/agents/:id/kill` — déclenche le kill switch
  - `POST /api/mandates` — crée un mandat en `pending`
  - `POST /api/mandates/:id/sign` — initie le sign Xaman
  - `POST /api/sign/mandate-callback` — webhook Xaman résolu
  - `GET /api/agent-actions?agentId=…` — historique des actions
  - `POST /api/agent-chat/message` — envoi d'un message chat (réponse en SSE)
- **Services** :
  - `services/AgentService.ts` — orchestre les agents (CRUD + état)
  - `services/MandateService.ts` — gère la signature Xaman des mandats
  - `services/AgentChatService.ts` — gère le streaming Claude API + interception des tool calls
- **Module SSE** : `sse/agent-broadcast.ts` — diffuse les événements agents (`agent_killed`, `agent_action_logged`) à tous les clients connectés.

### 3.3 Extension `apps/web`

- **Vue principale** : `views/AgentView.vue` (layout : gauche = panneau mandat + kill switch · droite = chat LLM + log des actions)
- **Composables** :
  - `composables/useAgent.ts` — état global (mandat actif, agent status, SSE)
  - `composables/useAgentChat.ts` — streaming SSE des réponses LLM token par token
  - `composables/useMandate.ts` — gestion du formulaire de mandat + signature Xaman
- **Composants** :
  - `components/agent/MandateForm.vue` — formulaire de mandat
  - `components/agent/ChatPanel.vue` — interface de chat avec le LLM
  - `components/agent/ActionLog.vue` — historique des actions agent
  - `components/agent/KillSwitch.vue` — bouton d'arrêt d'urgence
  - `components/agent/McpConfigInstructions.vue` — instructions pour brancher Claude Desktop
- **i18n** : nouvelles clés `agent.*` en FR + EN
- **Navigation** : entrée « AI Agent » dans la navigation principale (à côté du leaderboard / compétitions)

### 3.4 Extension `@tide/client`

```typescript
// Nouvelles méthodes :
client.agents(): Promise<Agent[]>
client.agent(id: string): Promise<Agent>
client.createAgent(input: CreateAgentInput): Promise<Agent>
client.updateAgent(id: string, input: UpdateAgentInput): Promise<Agent>
client.deleteAgent(id: string): Promise<void>
client.killAgent(id: string): Promise<void>

client.mandates(agentId: string): Promise<Mandate[]>
client.createMandate(input: CreateMandateInput): Promise<Mandate>
client.signMandate(mandateId: string): Promise<SignRequest>

client.agentActions(agentId: string): Promise<AgentAction[]>
```

### 3.5 Schéma SQLite (nouvelles tables)

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                -- 'external' (MCP only) | 'integrated' (chat UI)
  status TEXT NOT NULL,              -- 'active' | 'paused' | 'stopped'
  has_live_account INTEGER NOT NULL DEFAULT 0,   -- 0/1 : a-t-il un compte XRPL agent ?
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE mandates (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  capital_max REAL NOT NULL,
  perte_max_jour REAL NOT NULL,
  max_trades_per_day INTEGER NOT NULL,
  max_leverage REAL NOT NULL,
  paires_autorisees TEXT NOT NULL,   -- JSON array : ["BTC", "ETH", ...]
  style TEXT,                        -- 'momentum' | 'mean_reversion' | 'dca' | 'grid' | 'mixed'
  valid_until INTEGER NOT NULL,      -- unix ms
  signed_at INTEGER,
  signature TEXT,                    -- Xaman signature hex
  status TEXT NOT NULL,              -- 'pending' | 'active' | 'expired' | 'revoked'
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_params TEXT NOT NULL,         -- JSON sérialisé
  result TEXT,                       -- JSON, NULL si erreur
  error TEXT,                        -- message d'erreur, NULL si succès
  idempotency_key TEXT,              -- client_order_id si fourni
  executed_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE UNIQUE INDEX idx_agent_actions_idempotency
  ON agent_actions(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_agent_actions_lookup
  ON agent_actions(user_id, agent_id, executed_at);

CREATE TABLE agent_xrpl_keys (
  agent_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,    -- AES-256-GCM avec master key serveur
  master_key_id TEXT NOT NULL,            -- pour rotation de la master key
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### 3.6 Forme d'un outil MCP (exemple)

```typescript
// packages/mcp/src/tools/market.ts
import { z } from 'zod';

export const getMarketTool = {
  name: 'get_market',
  description: 'Get current market data for a symbol (price, 24h change, volume).',
  inputSchema: z.object({
    symbol: z.string().describe('Symbol like "BTC", "ETH", "XRP"'),
  }),
  handler: async ({ symbol }, ctx) => {
    const price = await ctx.priceFeed.priceOf(symbol);
    if (!price) {
      throw new McpError('MARKET_ERROR', `Price for ${symbol} unavailable`);
    }
    return {
      symbol,
      price: price.usd,
      change24h: price.change24h,
      volume24h: price.volume24h,
      timestamp: Date.now(),
    };
  },
};
```

### 3.7 Catalogue des outils MCP (v1)

| Outil | Catégorie | Description |
|---|---|---|
| `get_market(symbol)` | market | Prix actuel + 24h % + volume |
| `get_markets()` | market | Top N coins avec métadonnées |
| `get_history(symbol, interval)` | market | Bougies OHLC (Binance klines) |
| `get_orderbook(symbol)` | market | Carnet d'ordres (Binance / XRPL DEX) |
| `get_balance()` | portfolio | Soldes spot du user |
| `get_portfolio()` | portfolio | Holdings valorisés + equity + PnL |
| `get_positions()` | portfolio | Positions perp ouvertes |
| `get_leaderboard()` | portfolio | Top traders |
| `place_order(symbol, side, qty, type?, price?)` | trading-spot | Ordre spot (market ou limit) |
| `cancel_order(order_id)` | trading-spot | Annule un ordre limit ouvert |
| `open_position(symbol, side, qty, leverage, margin?, tp?, sl?)` | trading-perp | Ouvre une position perp |
| `close_position(position_id)` | trading-perp | Ferme une position |
| `list_competitions()` | competitions | Liste des tournois |
| `get_competition(id)` | competitions | Détail d'un tournoi |
| `join_competition(id)` | competitions | Inscription (build buy-in tx) |
| `get_competition_leaderboard(id)` | competitions | Classement d'un tournoi |
| `get_mandate()` | mandate | Récupère le mandat actif de l'agent |
| `get_risk_limits()` | mandate | Borne actuelles (capital engagé, perte jour, trades jour) |
| `get_config()` | meta | Config Tide (mode, SourceTag, pairs dispo) |
| `get_agent_status()` | meta | Statut de l'agent + dernière action |

Total : **20 outils** (cible "Riche").

---

## 4. Data flow

### 4.1 Création d'un agent + signature du mandat

```
User → AgentView.vue → MandateForm.vue (capital, perte, max trades, paires, style, durée)
     → POST /api/mandates {agent_id, ...bornes}
        → INSERT mandate (status='pending')
        → POST /sign/mandate (Xaman payload SignIn, memo=hash(mandat))
        → Xaman popup user → signe
        → UPDATE mandate (signature=X, status='active')
     ← UI notifiée : "Mandat actif, agent prêt"
```

### 4.2 Trade via MCP (agent externe OU intégré)

```
Claude Desktop (ou chat intégré) raisonne
     → appel MCP : place_order({symbol: "BTC", side: "buy", qty: 0.001, client_order_id: "uuid-x"})
        → guard.enforceRiskLimits(user, action, mandate)
           ├─ load mandate actif pour agent_id
           ├─ vérif symbol ∈ paires_autorisees
           ├─ Σ positions + nouvelle ≤ capital_max
           ├─ trades_jour + 1 ≤ max_trades_per_day
           ├─ perte_jour ≤ perte_max_jour
           ├─ leverage (si perp) ≤ max_leverage
           ├─ mandate.status='active' ET valid_until > now
           └─ agent.status ≠ 'stopped'
        ├─✓ → handler.executer() (paper.placeOrder OU live.swap)
        │       → audit.recordAction() (INSERT agent_actions)
        │   ← return result { order_id, status, ... }
        └─✗ → throw McpError(code, message, details)
                → audit.recordAction(result=null, error=code+message)
            ← throw (LLM adapte ou s'arrête)
```

### 4.3 Mode Live — sous-design XRPL

**Option retenue** : **compte XRPL agent dédié**.

- À la création d'un agent Live, l'user génère (ou fournit) un compte XRPL "agent".
- La clé privée est chiffrée (AES-256-GCM) avec une master key côté serveur et stockée dans `agent_xrpl_keys`.
- L'user dépose des fonds (XRP) sur ce compte (top-up depuis son compte principal).
- Toutes les tx Live de cet agent sont signées par Tide avec la clé déchiffrée (à la volée, jamais loggée).
- L'user peut retirer la clé à tout moment : `DELETE FROM agent_xrpl_keys WHERE agent_id = :id` + `UPDATE agents SET has_live_account = 0`. Les fonds XRPL restent sur le compte agent (l'user peut les récupérer avec sa propre clé s'il l'a conservée, ou les perdre si elle a été générée par Tide).
- Bornes : capital_max = solde du compte agent, pas plus.

**Exclu en v1** : multi-sig `SignerListSet` (complexité + friction user). À ajouter en v2 si besoin.

### 4.4 Kill switch

```
User clique KillSwitch.vue
     → POST /api/agents/:id/kill {reason?}
        → UPDATE agents SET status='stopped' WHERE id=:id
        → UPDATE mandates SET status='revoked' WHERE agent_id=:id AND status='active'
        → SSE broadcast 'agent_killed' {agent_id, reason}
     ← tous les clients notifiés, l'agent s'arrête
```

Les appels MCP suivants (de cet agent) retournent immédiatement `McpError('AGENT_STOPPED')`. Le LLM externe est notifié et cesse d'agir.

### 4.5 Chat agent intégré (streaming SSE)

```
User tape msg dans ChatPanel.vue
     → POST /api/agent-chat/message {agent_id, message}
        → backend construit la requête Claude API :
           - system prompt = (règles Tide + mandat de l'agent + marché actuel + schéma des outils MCP)
           - messages = historique_chat + nouveau msg
        → stream SSE (reply.raw.write)
        → si LLM appelle un outil MCP (tool_use block) :
           → guard.enforceRiskLimits() → exécute handler
           → injecte tool_result dans la conversation
           → continue le streaming
        → stream termine quand LLM émet end_turn
     ← front affiche token-par-token dans ChatPanel.vue
```

### 4.6 Idempotence

- Chaque `place_order` / `open_position` peut recevoir un `client_order_id` (uuid généré par le LLM).
- Si fourni, INSERT dans `agent_actions` avec `idempotency_key = client_order_id`.
- Deuxième appel avec même `(user_id, client_order_id)` → no-op, retourne le résultat stocké.
- Permet au LLM de retry sans risque de double-trade (cas réseau / timeout).

---

## 5. Error handling

### 5.1 Catégories d'erreurs (codes MCP standardisés)

| Code | Quand | Mapping MCP | Exemple de message |
|---|---|---|---|
| `INVALID_PARAMS` | Params outil invalides | `-32602` | `INVALID_PARAMS: symbol 'BTCX' not recognized` |
| `MARKET_ERROR` | Symbole introuvable, prix manquant, API externe KO | `-32004` | `MARKET_ERROR: price for SHIB temporarily unavailable` |
| `TRADING_ERROR` | Solde insuffisant, position inexistante, slippage dépassé | `-32004` | `TRADING_ERROR: insufficient balance (need $500, have $320)` |
| `RISK_LIMIT` | Capital / perte / trades / levier dépassé | `-32005` | `RISK_LIMIT: perte journalière atteinte ($52.30/$50). Attends minuit UTC.` |
| `MANDATE_INVALID` | Mandat expiré / révoqué / pas signé | `-32005` | `MANDATE_INVALID: sign a new mandate via /api/mandates before trading.` |
| `AGENT_STOPPED` | Kill switch enclenché | `-32005` | `AGENT_STOPPED: agent stopped by user. Resume via UI.` |
| `LLM_ERROR` | Quota dépassé, clé invalide, rate limit | `-32006` | `LLM_ERROR: Claude API rate limit hit. Retry in 30s.` |
| `INFRA_ERROR` | DB down, réseau coupé, autre 5xx | `-32603` | `INFRA_ERROR: service temporarily unavailable. Retry later.` |

**Règle d'or** : tout message d'erreur doit aider le LLM à **adapter sa stratégie**, pas juste cracher un code.

### 5.2 Filtre anti-leak

- Une erreur `INFRA_ERROR` ne doit JAMAIS exposer de stack trace au LLM externe.
- Le filtre (`lib/errors.ts → sanitizeError`) masque :
  - les chemins absolus du serveur,
  - les noms de fichiers internes,
  - les secrets (clés, tokens),
  - les détails SQL,
  - les versions exactes des libs.
- Tous les messages sont sanitisés avant d'être envoyés au LLM (interne ou externe).

### 5.3 Idempotence & retry

- **`place_order` / `open_position`** : supportent `client_order_id` (optionnel).
- **Pas de retry automatique côté serveur** (sinon on masque des bugs en double-exécutant).
- **Le LLM décide** : il reçoit l'erreur, évalue (transient vs permanent), retry ou pas.
- **Exception** : `INFRA_ERROR` → le serveur peut suggérer un retry après `Retry-After` (en secondes).

### 5.4 Sécurité côté MCP

- Le contexte MCP contient `agent_id` + `user_id` (provenant du handshake MCP ou de la config client MCP).
- Toutes les actions sont scopées à ce `user_id` (un agent A ne peut PAS agir pour le user B).
- **Aucun secret loggé** : ni la clé API LLM, ni la clé agent XRPL (jamais en clair dans les logs, jamais dans les erreurs).
- **Aucune stack trace ni chemin de fichier** dans les messages d'erreur MCP sortants.
- **Pas de message d'erreur financier précis** qui leak (montants arrondis à 2 décimales, soldes jamais exposés en intégralité).

---

## 6. Sécurité (récap)

### 6.1 Surface d'attaque

- **Compromission de la master key** : déchiffre toutes les clés agent XRPL. Mitigation : `master_key_id` dans la table pour permettre rotation ; master key dans HSM / Vault (à faire avant Live, YAGNI pour le MVP).
- **Agent hostile (LLM buggé ou compromis)** : essaie de dépasser les bornes. Mitigation : garde-fous durs serveur, jamais bypassables.
- **Agent cross-user** : essaie d'agir pour le compte d'un autre user. Mitigation : scoping strict `user_id` dans toutes les requêtes DB.
- **Replay attack sur sign Xaman** : signe deux fois le même mandat. Mitigation : `mandates.status` + `mandates.id` UNIQUE.
- **LLM leak de prompts système** : tente d'extraire la master key via le contexte MCP. Mitigation : master key jamais injectée dans le contexte MCP, jamais accessible aux outils MCP.

### 6.2 Garde-fous obligatoires

- `capital_max_engaged` : Σ des positions ouvertes ≤ capital_max.
- `perte_max_journalière` : Σ PnL réalisé du jour ≤ perte_max.
- `max_trades_per_day` : calculé à la volée depuis `SELECT COUNT(*) FROM agent_actions WHERE user_id = :u AND agent_id = :a AND executed_at >= start_of_today_utc`. Pas de cron de reset nécessaire (la requête est indexée par `executed_at`).
- `max_leverage` : appliqué à chaque position perp.
- `kill_switch` : booléen global par user, désactive tous les agents instantanément.
- **Pas de mode "avancé" pour bypasser**. Les bornes sont imposées par le serveur avant chaque exécution.

### 6.3 Validation des entrées (au bord de chaque outil)

- Symbole : `^[A-Z0-9]{2,10}$` (regex stricte).
- Quantité : `> 0`, ≤ `MAX_SAFE_AMOUNT` (= `1e15`, bien sous `MAX_SAFE_INTEGER` pour éviter la perte de précision flottante).
- Levier : `[1, max_leverage]` (borné par le mandat, jamais > 100).
- Adresses XRPL : `assertValidAddress()` (réutilisé de `@tide/xrpl`).
- Prix : `> 0`, `Number.isFinite()`, ≤ `MAX_SAFE_AMOUNT`.
- `client_order_id` (idempotence) : si fourni, doit être un UUID v4 valide (regex standard).

---

## 7. Testing

### 7.1 Stratégie globale (5 niveaux)

| Niveau | Quoi | Combien |
|---|---|---|
| **Unitaires** | Chaque module critique isolé | 60–80 tests |
| **Intégration `apps/api`** | Flows API : création agent, signature mandat, trade MCP, kill switch | 15–20 tests |
| **Intégration `@tide/mcp`** | Flows MCP complets (handshake + tool call + garde-fou) | 10–15 tests |
| **Composables Vue** | `useAgent.ts`, `useAgentChat.ts`, `MandateForm.vue` (TestUI) | 10–15 tests |
| **E2E** | Serveur MCP up + Claude Desktop mock + trade complet via agent | 3–5 tests |

### 7.2 Couvertures critiques (zéro fail toléré)

- **`guard.ts`** : chaque borne (capital / perte / trades / levier / paire) a son test « dépasse → RISK_LIMIT ».
- **`audit.ts`** : toute action agent (succès OU erreur) écrit dans `agent_actions` avec les bons champs.
- **Idempotence** : 2x `place_order` avec même `client_order_id` → 1 seule exécution.
- **Cross-user** : un agent A ne peut PAS agir pour le user de l'agent B.
- **Pas de leak** : une erreur 5xx n'expose jamais de stack trace au LLM externe (filtre testé).
- **Pas de secret loggé** : la clé API LLM et la clé agent XRPL n'apparaissent dans aucun log.
- **Compteurs concurrents** : 2 trades simultanés qui incrémentent `trades_jour` → compteur final cohérent (test de race).

### 7.3 Conventions

- **Fakes pour les I/O** : `priceFeed`, `paperService`, `liveSwap`, `claudeApi`, `xamanApi` — interfaces injectées, jamais de vrais appels réseau dans les tests.
- **Pas de flaky** : pas de `setTimeout`, pas de random non maîtrisé, pas de timing réseau.
- **1 test = 1 comportement**, snappy (< 50 ms idéal, < 200 ms toléré pour intégration).
- **Chaque tool MCP a son fichier de test** (1 fichier par outil, ou 1 fichier par domaine groupé).
- **Sécurité testée explicitement** : cross-user, leak de secrets, races sur les compteurs.

### 7.4 Démo / vérification manuelle (avant pitch jury)

1. **Setup** : `pnpm install`, `pnpm test` (100 % vert), `pnpm typecheck`, `pnpm --filter @tide/api start`.
2. **Scenario 1 — agent externe** : configurer Claude Desktop pour brancher le MCP Tide, dire « trade du DCA sur BTC avec $100/sem », vérifier que les bornes sont respectées.
3. **Scenario 2 — agent intégré** : dans l'UI Tide, créer un agent avec mandat, chatter, le voir ouvrir une position.
4. **Scenario 3 — kill switch** : un agent trade, on clique kill → il s'arrête.
5. **Scenario 4 — dépassement de bornes** : forcer un trade qui dépasse capital → erreur remontée + audit log.

---

## 8. Roadmap d'implémentation (proposition)

Découpage en 4 phases, chacune livrable et testable.

### Phase A1 (~3 jours) — Fondations
- Nouveau package `@tide/mcp` (skeleton, dépendance `@modelcontextprotocol/sdk`).
- Tables SQLite `agents`, `mandates`, `agent_actions`.
- Services `AgentService`, `MandateService` (CRUD, sans MCP).
- Routes API de base (`POST /api/agents`, `GET /api/agents/:id`, etc.).

### Phase A2 (~3 jours) — MCP server + outils core
- `bin/tide-mcp.ts` (entrypoint), `server.ts` (bootstrap stdio).
- 6 outils core : `get_market`, `get_markets`, `get_history`, `get_balance`, `get_portfolio`, `place_order` (Paper).
- `guard.ts` : enforcement des bornes du mandat.
- `audit.ts` : écriture dans `agent_actions`.
- Tests unitaires + intégration MCP de base.

### Phase A3 (~3 jours) — Outils restants + Live
- 14 outils restants (competitions, perp, mandate, meta).
- Mode Live : `agent_xrpl_keys`, chiffrement AES-256-GCM, endpoint de génération du compte agent.
- Integration `live.swap()` dans `place_order` si l'agent a un compte Live.
- Tests d'intégration Live (avec fakes XRPL).

### Phase A4 (~4 jours) — UI + chat intégré
- `AgentView.vue` + `useAgent.ts` + `useAgentChat.ts` + composants.
- Streaming SSE Claude API.
- `McpConfigInstructions.vue` (instructions pour Claude Desktop).
- Tests composables + TestUI.
- Démo end-to-end + docs (README mis à jour).

**Total estimé : ~13 jours** (1 dev solo full-time, 4 phases).

---

## 9. Risques & dette tracée

### 9.1 Risques (avant Live)

| Risque | Signe d'alerte | Mitigation |
|---|---|---|
| La master key XRPL agent est compromise | Toutes les sessions agents compromises | Master key dans HSM / Vault (YAGNI pour MVP, mais documenter) |
| L'agent LLM fait du wash-trading involontaire | Montée rapide du volume sans PnL | `min_pnl_realized` dans le mandat (extension possible), alertes orga |
| Mismatch entre le prix du feed et le prix Live | Glissement, perte non planifiée | Slippage toléré dans `place_order`, validation serveur |
| Rate limit Claude API | Erreurs `LLM_ERROR` récurrentes | Clé Tide démo limitée + BYOK user + cache des prompts statiques |

### 9.2 Dette connue (tracée, YAGNI pour le MVP)

- Pas de cache des réponses Claude (coût + latence).
- Pas de multi-agent orchestration (1 user = 1 agent principal + N agents secondaires possibles plus tard).
- Pas de backtest des stratégies (les agents testent en Live/Paper, pas de simulation historique).
- Pas de "social" : agents publics leaderboardés, partage de mandat.
- Pas de notifications push sur kill switch triggered (user doit rafraîchir l'UI).
- Pas de migration du mode "compte agent dédié" vers multi-sig (v2).

---

## 10. Annexes

### 10.1 Glossaire

- **MCP** : Model Context Protocol — standard ouvert pour brancher des agents LLM à des outils.
- **Mandat** : ensemble de bornes signées par l'user, autorisant un agent à trader.
- **Garde-fous durs** : bornes imposées par le serveur, jamais bypassables.
- **Compte agent** : compte XRPL dédié à un agent Live, clé chiffrée côté Tide.
- **BYOK** : Bring Your Own Key — l'user fournit sa propre clé API LLM.

### 10.2 Dépendances ajoutées

| Package | Version | Pourquoi |
|---|---|---|
| `@modelcontextprotocol/sdk` | latest | Lib TypeScript officielle MCP |

Aucune autre dépendance n'est nécessaire : on réutilise tout le reste (`@tide/core`, `@tide/xrpl`, `@tide/client`, `@tide/evm` pour v2).

### 10.3 Liens

- Spec Tide : [`../SPEC.md`](../SPEC.md)
- Roadmap Tide : [`../ROADMAP.md`](../ROADMAP.md)
- Skills : `superpowers:brainstorming`, `superpowers:writing-plans`
- MCP : https://modelcontextprotocol.io/
- Claude API : https://docs.anthropic.com/

---

*Spec rédigée le 2026-07-05 après brainstorming collaboratif avec Armand. Toutes les décisions sont verrouillées. Prêt pour `superpowers:writing-plans`.*
