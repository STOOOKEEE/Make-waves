# 01 — Inventaire exhaustif des features

> La **carte de vérité** du projet. Chaque ligne = une feature, son feu, si elle est câblée au runtime réel, et sa preuve dans le code.
> Feux : ✅ fonctionnel & câblé · 🟡 codé mais dormant/non câblé · 🔴 stub qui échoue · ⚪ décor/statique.

## Domaine métier (`packages/core`)

| Feature | Feu | Câblé runtime | Preuve code |
|---------|-----|---------------|-------------|
| Ordres marché spot (equity/PnL) | ✅ | Oui | `core/src/paper/account.ts`, `paper/equity.ts` |
| Positions perp (levier, marge, PnL non réalisé) | ✅ | Oui | `core/src/position/{pnl,equity,validate}.ts` |
| Compétitions (pool, rake, classement, split-pot, reliquat) | ✅ | Oui | `core/src/competition/{prize,ranking,payout}.ts` |
| Leaderboard (valorisation + PnL vs capital) | ✅ | Oui | `core/src/leaderboard/leaderboard.ts` |
| Tests domaine (~85 cas) | ✅ | — | `core/test/{account,equity,position,competition,leaderboard}.test.ts` |

## Backend (`apps/api`)

| Feature | Feu | Câblé runtime | Preuve code |
|---------|-----|---------------|-------------|
| Service paper (openAccount, placeOrder, open/closePosition, portfolio, leaderboard) | ✅ | Oui | `apps/api/src/services/paper-service.ts` |
| Service compétitions (create/join/close + payouts) | ✅ | Oui | `apps/api/src/services/competition-service.ts` |
| Persistance SQLite disque (transactions, survie redémarrage) | ✅ | Oui | `store/sqlite.ts`, `store/sqlite-account-store.ts`, `test/persistence.test.ts` |
| ~24 routes HTTP paper/prices/markets/history/competitions | ✅ | Oui (montées inconditionnellement) | `http/server.ts` |
| Seed compétitions + comptes démo | ✅ | Oui | `main.ts:267-273` |
| Feed prix CEX (CoinGecko 30s) | ✅ | Oui | `main.ts:297-301` |

## Intégration XRPL (`packages/xrpl` + `apps/api`) — F1→F9

| Feature | Feu | Câblé runtime | Preuve code |
|---------|-----|---------------|-------------|
| F1 `XrplClient` (connexion, `ammSpotPrice`) | 🟡 | Sur `XRPL_WSS_URL` | `packages/xrpl/src/client/xrpl-client.ts` |
| F2 lecteur carnet `book_offers` | 🟡 | Dormant | `packages/xrpl/src/...book-reader` |
| F3 feed double source CEX + on-chain | 🟡 | Dormant (`ONCHAIN_POOLS={}`) | `main.ts:64,115-118` |
| F4 indexeur d'attribution (SourceTag) | 🟡 | Sur env (indexeur off par défaut) | `apps/api/src/indexer/indexer.ts` |
| F5 best execution + bornage slippage | 🟡 | Via `/exec/plan` (gated) | `packages/xrpl/src/exec/route.ts` |
| F6 multisig prize pool (`SignerListSet`) + payouts | 🟡 | **Non câblé** (builder seul) | `packages/xrpl/src/tx/multisig.ts` |
| F7 soumission tx + classification `engine_result` | 🟡 | Dormant | `packages/xrpl/src/...submit` |
| F8 Xaman (payload non-custodial) | 🟡 | Sur clés XUMM | `apps/api/src/xaman/{sdk,sign-request}.ts` |
| F9 moteur de volume + garde anti wash-trading | 🟡 | **Non câblé** (OFF par défaut) | `packages/xrpl/src/volume/engine.ts` |

## Runtime + HTTP (F10, F12-F14)

| Feature | Feu | Câblé runtime | Preuve code |
|---------|-----|---------------|-------------|
| F10 assemblage `main.ts` + routes `/sign/buy-in`, `/metrics` | ✅ | Oui (features gated par env) | `apps/api/src/main.ts` |
| F12 mode Live wallet (Xaman QR + GemWallet) | 🟡 | Sur config | `apps/web/src/composables/useWallet.ts`, `components/SignModal.vue` |
| F13 moteur d'exécution Live spot (`OfferCreate` borné taggé) | 🟡 | Via `/exec/plan`, `/sign/live-offer` (gated) | `apps/api/src/exec/plan-live.ts` |
| F14 refonte UX terminal (barre Paper↔Live) | ✅ | Oui | `apps/web/src/views/DashboardView.vue` |

## Marchés & données (F15 + « honnêteté des surfaces »)

| Feature | Feu | Câblé runtime | Preuve code |
|---------|-----|---------------|-------------|
| F15 watchlist top 250 CoinGecko `/coins/markets` | ✅ | Oui | `feed/coingecko-markets.ts`, route `GET /markets` |
| Carnets réels multi-venues (XRPL, Binance, Hyperliquid) | ✅ | Oui | `feed/{binance,hyperliquid,gate}-book-feed.ts` |
| Charts réels en cascade (Binance→CoinGecko→GeckoTerminal→Gate) | ✅ | Oui | `feed/{coingecko-history,coingecko-ohlc,geckoterminal-history,gate-history}.ts` |

## Terminal dérivés & remontée (F16-F17)

| Feature | Feu | Câblé runtime | Preuve code |
|---------|-----|---------------|-------------|
| F16 terminal perp/levier/limit/TP-SL/blotter | ✅ | Oui (front) | `apps/web/src/views/DashboardView.vue`, `usePaper.ts` |
| F17 remontée positions perp au backend | ✅ | Oui | routes `POST/GET /accounts/:id/positions`, `core position` |
| Déclencheurs limit/TP-SL | 🟡 | **Front seulement** (onglet fermé = pas de déclenchement) | `usePaper.ts` |

## Front — vues (`apps/web/src/views`)

| Vue | Feu | Preuve code |
|-----|-----|-------------|
| Landing | ✅ | `LandingView.vue` (`client.leaderboard()`) |
| Dashboard (trading paper complet) | ✅ | `DashboardView.vue` |
| Portfolio | ✅ | `PortfolioView.vue` |
| Leaderboard | ✅ | `LeaderboardView.vue` |
| Competitions / Competition | ✅ | `CompetitionsView.vue`, `CompetitionView.vue` (join **paper**) |
| **Agent** | 🔴 | `AgentView.vue` — appelle `/api/agents*` **non montées dans `main.ts`** |
| Arena | ⚪ | `ArenaView.vue` (aucun appel backend) |
| Tide School (Learn) | ⚪ | `LearnView.vue` + 17 articles statiques `data/learn/**` |

## AI Agent / MCP (`packages/mcp`)

| Feature | Feu | Câblé runtime | Preuve code |
|---------|-----|---------------|-------------|
| 20 outils MCP | ✅ | — | `packages/mcp/src/tools/index.ts` |
| Garde-fous serveur (capital/perte/trades/levier, kill switch) | ✅ | Oui (côté MCP) | `packages/mcp/src/lib/guard.ts` |
| MCP standalone connecté au backend HTTP | ✅ | Oui | `packages/mcp/bin/tide-mcp.ts`, `src/lib/api-client.ts` |
| Chat agent intégré (`/api/agent-chat/stream`) | 🔴 | Monté si `TIDE_LLM_API_KEY`, mais **ctx stubbé** | `http/server.ts:120-188` |
| Routes agents (`/api/agents*`, `/api/mandates*`, `/api/agent-actions*`) | 🔴 | **Non montées** (absentes de `createApp` dans `main.ts:275-291`) | `main.ts` |
| Mode Live agent (compte dédié, clé chiffrée) | 🔴 | Stubs (`decryptAgentSeed` throw, import seed → 501) | `bin/tide-mcp.ts`, `server.ts:636-639` |

## Track EVM / contrats (hors scope hackathon, présent dans le repo)

| Feature | Feu | Note | Preuve code |
|---------|-----|------|-------------|
| Vault de settlement EVM (viem client, ABI, units) | 🟡 | Code réel mais **non branché à l'app XRPL** — track perp v2 | `packages/evm/src/*` |
| Contrats Solidity (Foundry) | 🟡 | Déployé seulement en local `chain-id 31337` | `packages/contracts/` |

> ⚠️ `CLAUDE.md` verrouille « pas de smart contract / pas d'EVM sidechain pour ce hack ». Le code EVM existe mais n'a **aucun lien runtime** avec le produit XRPL. Voir `docs/ROADMAP-PERP-V2.md` et `docs/PERP-CEX-FEASIBILITY.md`.
