# 00 — Synthèse exécutive

## Verdict

> **Le produit paper trading est réel, complet, testé et solide. La couche on-chain/Live est entièrement codée mais dormante par défaut et jamais prouvée sur mainnet. L'AI agent est à moitié câblé (MCP externe OK, chat intégré en stubs). Il n'existe aucune infrastructure de déploiement.**

Autrement dit : **on peut lancer une démo paper crédible aujourd'hui**, mais **on ne peut pas encore déployer un produit Live fonctionnel sur mainnet** sans travail de câblage + l'environnement d'Armand (clés, SourceTag).

## Scoring par domaine

| Domaine | Feu | Confiance | Ce que ça veut dire |
|---------|-----|-----------|---------------------|
| **Paper trading** (spot + perp + compétitions) | ✅ | 95 % | Bout en bout, testé, persisté SQLite disque, câblé runtime. Prêt pour démo. |
| **Front (UI)** | ✅ | 85 % | Dashboard/Portfolio/Leaderboard/Competitions reliés au back. `AgentView` appelle des routes non montées ⚠️. Arena + Tide School = décor. |
| **Persistance** | ✅ | 95 % | Vraie SQLite (`node:sqlite`), transactions atomiques, survie au redémarrage testée. |
| **Live / swap on-chain** | 🟡 | 40 % | Chaîne `OfferCreate` taggé codée et propre, mais prix AMM **simulés** par le CEX, pas de soumission serveur, jamais exécutée sur mainnet. |
| **Wallets (Xaman / GemWallet)** | 🟡 | 70 % | Vraies intégrations non-custodiales, mais inertes sans clés XUMM + SourceTag. |
| **Attribution (SourceTag → compteur orga)** | 🟡 | 50 % | Indexeur réel et bien conçu, mais jamais activé ni prouvé sur un swap réel. |
| **AI Agent — MCP externe** | ✅ | 80 % | `bin/tide-mcp.ts` réellement connecté au backend via HTTP, garde-fous serveur réels. |
| **AI Agent — chat intégré** | 🔴 | 90 % | `/api/agent-chat/stream` : chaque outil lève `agent chat not wired`. Rien ne s'exécute. |
| **Déploiement / infra** | ❌ | 100 % | Aucun Docker, CI, host, build backend packagé. État « dev local ». |

## Les 5 blockers majeurs vers le mainnet

1. **Prix Live simulés** — `apps/api/src/exec/plan-live.ts` alimente prix AMM **et** carnet avec le feed CEX (CoinGecko). `ONCHAIN_POOLS = {}` est vide et **hardcodé** dans `main.ts:64` → le provider de prix on-chain ne s'active jamais sans éditer le code.
2. **Pas de soumission serveur du swap** — le backend produit un `OfferCreate` borné correct mais ne le soumet jamais ; le remplissage on-chain dépend du wallet. La boucle « 1 swap taggé → compteur d'attribution » n'est **pas prouvée de bout en bout**.
3. **Routes agents non montées** — `main.ts` n'appelle jamais `createApp` avec `agentService`/`mandateService`/`agentActionsStore`/`agentXrplAccountService`. Le front `AgentView` tape des routes **absentes du runtime réel** (elles n'existent qu'en test).
4. **Chat agent en stubs** — `throwAgentChatNotWired` (`server.ts:120`) : le LLM voit les 20 outils mais toute lecture/écriture échoue.
5. **Aucune infra** — pas de conteneur, pas de CI, pas d'host, API lancée via `tsx`. Rien n'est déployé ni packagé.

## Dépendances externes hors de ce repo (environnement d'Armand)

Ces points **ne sont pas résolubles par le code seul** :

- Réserver / déclarer le **`SourceTag`** auprès de l'orga.
- Clés **XUMM** (`XUMM_API_KEY` / `XUMM_API_SECRET`).
- Comptes XRPL à indexer + compte **multisig prize pool**.
- Spikes mainnet : 1 swap taggé → compteur d'attribution ; multisig prize pool.

## Distance au mainnet

| Étape | État | Effort estimé |
|-------|------|---------------|
| Démo paper hébergée | Faisable **maintenant** | Faible (infra host + build) |
| Lecture on-chain (feed AMM, indexeur) | Code prêt, non activé | Faible (env + remplir `ONCHAIN_POOLS`) |
| Swap Live prouvé sur mainnet | Non prouvé | **Moyen/élevé** (câblage prix réels + spike signature) |
| AI agent trading réel | Stubs | **Élevé** (câbler ctx runtime + mode Live) |

➡️ Détail actionnable dans **[06-CHECKLIST-MAINNET.md](06-CHECKLIST-MAINNET.md)**.
