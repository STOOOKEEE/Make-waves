# 06 — Checklist vers le mainnet (plan d'action) 🎯

> Le document **actionnable**. Objectif : « tout fonctionnel + déployable mainnet ». On progresse par phases ; chaque phase est utile en soi et démontrable.
>
> Légende : `[ ]` à faire · **[CODE]** faisable dans ce repo · **[ARMAND]** dépend de l'environnement/orga (hors code) · **[INFRA]** besoin d'hébergement.

---

## Phase 0 — Démo paper hébergée (rapide, gros ROI)

Rendre montrable ce qui marche déjà. Aucune dépendance on-chain.

- [ ] **[CODE]** Vérifier `pnpm test` (92 fichiers) + `pnpm typecheck` + `pnpm lint` au vert.
- [ ] **[CODE]** Décider packaging backend : garder `tsx` ou compiler.
- [ ] **[INFRA]** Dockerfile API + volume persistant pour `tide.db`.
- [ ] **[INFRA]** Host backend avec disque (Fly.io / Render / VPS — **pas** serverless éphémère).
- [ ] **[INFRA]** `vite build` front → statique (Vercel/Netlify), `VITE_API_BASE` → API prod.
- [ ] **[CODE]** Corriger le décalage `AgentView` : soit masquer la vue, soit exécuter Phase 3 avant la démo (sinon elle est cassée).

**Livrable :** une URL publique où on crée un compte, on trade paper spot+perp, on voit leaderboard + compétitions.

---

## Phase 1 — Lecture on-chain (attribution & prix réels)

Activer la couche on-chain en lecture. Prépare la métrique reine du hackathon.

- [ ] **[ARMAND]** Réserver / déclarer le **`SourceTag`** auprès de l'orga.
- [ ] **[ARMAND]** Fournir `XRPL_WSS_URL` mainnet (ex. `wss://xrplcluster.com`).
- [ ] **[ARMAND]** Lister les comptes à indexer (`TIDE_INDEXED_ACCOUNTS` : prize pool + comptes joueurs Live).
- [ ] **[CODE]** Remplir `ONCHAIN_POOLS` dans `main.ts:64` (actuellement `{}` vide) avec les pools AMM réels → active le feed de prix on-chain.
- [ ] **[CODE]** Définir `TIDE_ATTRIBUTION_DB_PATH` (sinon l'indexeur perd son état au reboot).
- [ ] **[CODE/ARMAND]** Spike : exécuter 1 swap taggé manuellement → vérifier que l'indexeur le compte.

**Livrable :** l'API lit les prix AMM on-chain et l'indexeur compte les tx taggées.

---

## Phase 2 — Swap Live prouvé de bout en bout (chemin critique)

Le vrai enjeu : passer de « `OfferCreate` correct » à « swap réel rempli + compté ».

- [ ] **[ARMAND]** Clés **XUMM** (`XUMM_API_KEY`, `XUMM_API_SECRET`).
- [ ] **[ARMAND]** Adresse **multisig prize pool** (`TIDE_PRIZE_POOL_ADDRESS`).
- [ ] **[CODE]** Remplacer les prix AMM/carnet simulés dans `plan-live.ts` par une **vraie lecture `book_offers`/AMM on-chain** (aujourd'hui = feed CEX).
- [ ] **[CODE/ARMAND]** Spike mainnet : connecter Xaman/GemWallet, signer un `OfferCreate` taggé XRP→RLUSD, observer le **remplissage on-chain** + l'incrément du compteur d'attribution.
- [ ] **[CODE]** Brancher le **buy-in on-chain** à l'UI (`/sign/buy-in` existe mais aucune vue ne l'appelle — `CompetitionView` fait un join paper).
- [ ] **[CODE/ARMAND]** Spike **multisig** prize pool (`buildSignerListSet` codé mais jamais appelé) + payouts taggés.

**Livrable :** un joueur convertit un trade paper en swap Live réel, signé, rempli, taggé, compté.

---

## Phase 3 — AI agent fonctionnel dans l'UI

Réparer la coquille agent (voir [04](04-AI-AGENT-MCP.md)).

- [ ] **[CODE]** Monter les routes agents : passer `agentService`/`mandateService`/`agentActionsStore`/`agentXrplAccountService` à `createApp` dans `main.ts` (sinon `AgentView` tape des routes inexistantes).
- [ ] **[CODE]** Câbler `buildAgentChatCtx` (`server.ts:120-188`) sur les vrais services au lieu de `throwAgentChatNotWired`.
- [ ] **[ARMAND/CODE]** `TIDE_LLM_API_KEY` + modèle pour le chat.
- [ ] **[CODE]** (Live agent) `TIDE_AGENT_KEY_MASTER` + endpoints live-account + soumission (aujourd'hui : `decryptAgentSeed` throw, import seed → 501).

**Livrable :** un agent (paper d'abord) trade réellement depuis l'UI, scopé par mandat, avec kill switch.

---

## Phase 4 — Durcissement production

- [ ] **[CODE]** Régler la dette Live : montants `number` → BigInt/drops au règlement (voir [07](07-DETTE-RISQUES.md)).
- [ ] **[CODE]** Persister le curseur de l'indexeur (rescan au boot aujourd'hui).
- [ ] **[CODE]** Réduire la dépendance aux API externes (rate-limit/CORS des feeds CEX/carnets/charts) : cache, fallback, monitoring.
- [ ] **[INFRA]** CI : `pnpm test && typecheck && lint` sur PR.
- [ ] **[INFRA]** Monitoring/logs/alerting, gestion des secrets.

---

## Résumé des dépendances Armand (à demander en priorité)

| Besoin | Bloque |
|--------|--------|
| Réserver le **SourceTag** | Phases 1, 2 (tout le Live + attribution) |
| `XRPL_WSS_URL` mainnet + comptes indexés | Phase 1 |
| Clés **XUMM** | Phase 2 (signature) |
| Adresse **multisig prize pool** | Phase 2 (buy-in, payouts) |
| Spikes mainnet (attribution, multisig) | Phase 2 |

## Rappel — le trou testnet

Pour tester avant mainnet : `XRPL_WSS_URL` testnet **+** `TIDE_RLUSD_ISSUER` testnet (l'issuer RLUSD mainnet est en dur dans `plan-live.ts:35`). Le code ne connaît pas la notion de réseau.
