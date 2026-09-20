# Tide — Roadmap d'exécution

> Deadline finale : 2026-09-21 · Reste : ~13 semaines (depuis 2026-06-21) · Capacité : équipe 2-3, full-time (40h+/sem) · Mis à jour : 2026-06-21
> Spec : [`docs/SPEC.md`](SPEC.md) · Deadline inscription : **2026-07-21** (le MVP doit tourner avant)

Cocher au fil du dev (`[x]` fait · `[~]` partiel · `[ ]` à faire). 3 prix sur 4 sont des **métriques on-chain** (`SourceTag`) : l'objectif n'est pas « livrer du code » mais **faire monter les compteurs**. Tout est calé là-dessus.

**Pistes parallèles** (équipe) :
- **[BC]** Blockchain / backend XRPL — *Armand* (xrpl.js, Xaman, SourceTag, multisig, indexeur de métriques).
- **[FE]** Front / UX Nuxt — terminal de trading, leaderboard, compétitions, flow Xaman.
- **[GROWTH]** Produit / acquisition — orga, compétitions étudiantes, pitch (fusionne dans [BC]/[FE] si on est 2).

---

## Chemin critique (à sécuriser en priorité)

Tâches bloquantes ou incertaines — si l'une casse, le projet change de forme. À traiter **avant** de construire le reste.

1. **[BC] Spike d'attribution** : 1 swap `OfferCreate` + 1 `Payment` taggés `SourceTag` en **mainnet**, et vérifier que le compteur d'attribution du hackathon monte. *Tant que ce n'est pas prouvé, rien d'autre n'a de sens.*
2. **[GROWTH] Questions orga tranchées** : définition « active account », volume self-généré compté ?, `SourceTag` seul moyen d'attribution ? → décide si le buy-in est le bon véhicule d'activation et si le bot de volume est jouable.
3. **[BC] SourceTag déclaré/réservé** auprès de l'orga, et figé comme constante unique partagée par toutes les tx de l'app.
4. **[BC] Mécanique multisig du prize pool** : créer un compte multisig (`SignerListSet`), encaisser un buy-in, payer 2 gagnants par `Payment`. Prouver la boucle custody bornée.
5. **[FE+BC] Vertical slice** : connexion Xaman → 1 ordre Paper → rejoindre 1 compète (buy-in taggé) → voir le compte actif monter. La boucle de bout en bout, même moche, avant d'enrichir.

---

## Phase 0 — Setup & dé-risquage · 22 juin → 5 juil (sem 1-2)
**Jalon démo :** un swap taggé en mainnet qui fait monter le compteur d'attribution, + le squelette d'app (Xaman connect) qui tourne en local.
**Definition of done :** je peux montrer une tx mainnet avec notre `SourceTag` et pointer le compteur orga qui s'incrémente.

**[BC] Dé-risquage & socle**
- [~] Spike d'attribution : swap `OfferCreate` taggé en mainnet (chemin critique #1). *(outillage prêt : `pnpm --filter @tide/api spike:tx` + `docs/SPIKE.md` ; reste à exécuter par Armand sur son wallet mainnet)*
- [~] Idem `Payment` taggé + `Memos` (le futur buy-in). *(même script, sortie vérifiée)*
- [ ] Réserver/déclarer le `SourceTag`, le figer en constante partagée (chemin critique #3). *(à faire avec l'orga ; le code accepte déjà un SourceTag non nul)*
- [ ] Spike multisig prize pool : `SignerListSet` + encaissement + payout 2 gagnants (chemin critique #4).
- [x] Init repo code (monorepo pnpm), TS strict, lint, `.env` hors repo, structure modulaire. *(fait)*
- [ ] Brancher le feed de prix off-chain : lecture carnet + spot AMM (`xrpl.js`) + API CEX (CoinGecko/Binance), avec cache et double source.

**[FE] Socle UI**
- [ ] Design « un terminal, deux modes » (Paper/Live partagent feed/UI/leaderboard) — maquette.
- [ ] Connexion Xaman (XUMM SDK), affichage du wallet, état connecté.
- [ ] Squelette du terminal de trading (lecture du feed de prix, pas encore d'ordres).

**[GROWTH] Orga & prep**
- [ ] Inscription équipe au hackathon.
- [ ] Poser les questions orga (chemin critique #2) et logger les réponses dans le DEVLOG.
- [ ] Repérer 2-3 paires liquides cibles (dont RLUSD) via xrpl.to / XPMarket.
- [ ] Lister les premiers canaux étudiants (ESILV, DVB) pour la 1re compète.

---

## Phase 1 — MVP Paper + compétitions · 6 juil → 20 juil (sem 3-4)
**⚠️ Doit tourner avant la deadline inscription du 21 juil.**
**Jalon démo :** un user se connecte, trade en Paper sur de vrais prix, rejoint une compétition (buy-in taggé) et devient **1er compte actif** visible dans nos métriques.
**Definition of done :** la boucle Paper + 1 compète jouable est en ligne, et le compteur de comptes actifs taggés s'incrémente pour de vrai.

**[BC] Backend Paper & on-chain**
- [ ] Modèle de données (User, PaperWallet, PaperOrder, Competition, Entry, LeaderboardSnapshot, MetricEvent) — cf. SPEC §5.
- [x] Moteur Paper : portefeuille virtuel, ordres simulés au prix réel, calcul PnL. *(cœur pur `packages/core/paper`)*
- [x] Moteur de compétitions : création opérateur locale, catalogue SQLite, fenêtre, entrées payées, classement depuis l'equity d'entrée, pool réelle et winner-takes-all sans rake. *(18/07 : anciens seeds et catalogue front supprimés)*
- [x] Ancrage on-chain : ticket `Payment` taggé (`SourceTag` + `Memo` id tournoi) vers le compte prize pool multisig, signé GemWallet/Xaman puis vérifié dans un ledger validé avant inscription.
- [~] Indexeur de métriques : observer les tx taggées en mainnet → `MetricEvent` (volume, comptes actifs **distincts**). *(agrégation `aggregateAttribution` livrée `packages/xrpl/metrics` ; lecture ledger temps réel = backend)*
- [x] Validation stricte des entrées (montants, adresses, devises, params tx) avant tout payload. *(dans tous les moteurs/builders)*

**[FE] UI Paper & compétitions**
- [ ] Terminal Paper jouable (passer un ordre, voir PnL, historique).
- [~] Leaderboard (classement PnL Paper). *(calcul `buildLeaderboard` livré `packages/core/leaderboard` ; UI à faire)*
- [x] Liste / page compétitions : données API uniquement, états vides honnêtes, ticket GemWallet/Xaman et leaderboard réel.
- [ ] Onboarding zéro friction (Xaman only, pas de signup email).

**[GROWTH]**
- [ ] Préparer la 1re compétition étudiante (format, buy-in faible, dates, petit prize pool d'amorçage).
- [ ] Texte produit honnête sur le Paper (engagement/apprentissage, ne pas survendre la perf).

---

## Phase 2 — Mode Live + funnel complet · 21 juil → 10 août (sem 5-7)
**Jalon démo :** le funnel entier — un top joueur Paper clique « passer en Live », exécute un **swap spot réel taggé**, et à la clôture d'un tournoi le **prize pool est distribué** aux gagnants (multisig → `Payment`).
**Definition of done :** funnel paper→live démontrable de bout en bout + 1 prize pool réellement payé + le volume taggé monte.

**[BC] Live & best execution**
- [ ] Mode Live : construire `OfferCreate` taggé, signé Xaman, non-custodial.
- [ ] Best execution basique : router carnet d'ordres vs pool AMM (XLS-30) sur 2-3 paires (dont RLUSD).
- [~] Clôture de tournoi : rang #1 figé en DB → unique `Payment` taggé de 100 % de la pool, régénérable depuis la console locale. *(reste : faire signer et soumettre un payout réel par le quorum multisig)*
- [ ] Suivi du volume Live taggé dans l'indexeur (vers Most Volume).
- [ ] Gestion d'erreurs tx (échec, partial, timeout) sans avaler l'erreur.

**[FE] Bascule Live**
- [ ] Bouton « passer en Live » (même UI, settlement réel).
- [ ] Affichage de la réserve de compte / friction onboarding au moment du Live ou du buy-in (cf. SPEC §9).
- [ ] Page résultats de tournoi + distribution visible.
- [ ] Track record vérifiable (lien vers les tx on-chain).

**[GROWTH]**
- [ ] Lancer la **1re compétition publique** (test acquisition réel).
- [ ] Mesurer le taux de conversion paper→live observé (input du risque central).

---

## Phase 3 — Acquisition & volume · 11 août → 31 août (sem 8-10)
**Jalon démo :** les compteurs montent — comptes actifs vers l'objectif 300, et du volume Live qui s'accumule.
**Definition of done :** au moins 1 compétition étudiante de 100+ inscrits passée, funnel optimisé, courbe de métriques orientée à la hausse.

**[GROWTH] Users (Most Users + 300 Active)**
- [ ] Compétitions étudiantes ESILV / DVB / écoles partenaires (viser 150-300 inscrits par tournoi).
- [ ] Referral (invite = bonus) et partage du track record (viralité du classement).
- [ ] Proposer les compètes aux communautés crypto XRPL (holders memecoins, Telegram/Discord).

**[BC] Volume (Most Volume) — conditionnel**
- [ ] Funnel paper→live ciblé top joueurs (rebates/incentives sur trades Live taggés).
- [ ] **Si** self-généré compté (réponse orga) **et** edge validé : bot arb/MM taggé en arrière-plan, base Diaso adaptée XRPL.
- [ ] ⚠️ Garde-fou quant : valider l'edge en petite taille (`quant-mentor`/`strat-audit`) — **ne pas wash-trader à perte** (cf. SPEC §9).
- [ ] Intégrer RLUSD dans le routing (le gros du volume).

**[FE]**
- [ ] Optimiser le funnel (réduire les frictions mesurées en Phase 2).
- [ ] Tuiles de stats publiques (leaderboard, volume) pour la viralité.

---

## Phase finale — Scaling, polish & pitch · 1 sept → 21 sept (sem 11-13)
*Buffer obligatoire. Ne pas le sacrifier pour caser une feature.*
**Jalon final :** app stable, métriques au plus haut, pitch jury prêt.

- [ ] Pousser users (referral, derniers tournois) et volume (whales, RLUSD).
- [ ] Stabiliser / corriger les bugs bloquants (priorité aux flux tx et payouts).
- [ ] Durcir la sécurité du multisig prize pool (revue des signataires, montants).
- [ ] Préparer la démo (funnel paper→live en live) et le pitch jury (impact / innovation / exécution / honnêteté — cf. doc d'idée §9).
- [ ] Vérifier les compteurs finaux d'attribution au 21 sept.
- [ ] Geler le scope ~5 jours avant la fin : plus de features, que du polish.

---

## Phase 5 — AI Agent (post-MVP stretch) · branche `feat/agent-mcp`
**⚠️ Livré en parallèle sur branche dédiée, ne bloque pas le funnel MVP.** Spec : [`docs/superpowers/specs/2026-07-05-ai-agent-design.md`](superpowers/specs/2026-07-05-ai-agent-design.md) · Plan 33-tâches : [`docs/superpowers/plans/2026-07-05-ai-agent.md`](superpowers/plans/2026-07-05-ai-agent.md) · DEVLOG : entrées `2026-07-07 — AI Agent Phase 1/2/3/4`.

**Jalon démo :** un user crée un agent (externe via Claude Desktop OU intégré dans l'UI), le dote d'un mandat signé Xaman (bornes capital/perte/trades/leverage/paires), l'agent ouvre une position Paper OU Live en respectant les garde-fous durs serveur, le kill switch arrête tout immédiatement, et tout est tracé dans `agent_actions`. Catalogue **20 outils MCP** partagé entre les 2 populations (externes + intégrés) — pas de duplication. **738/738 tests**, typecheck 8/8 vert.

**Definition of done :** un agent externe (Claude Desktop) branché via `npx -y @tide/mcp` appelle `tools/list` → 20 outils, exécute un `place_order` Paper, et tout est observable côté UI Tide via SSE temps réel.

### A1 — Fondations (data layer + APIs HTTP) · T1→T5
- [x] T1 : nouveau package `packages/mcp` (skeleton + dep `@modelcontextprotocol/sdk`).
- [x] T2 : migration SQLite `migrateAgentTables` (tables `agents`/`mandates`/`agent_actions`/`agent_xrpl_keys` conformes spec §3.5).
- [x] T3 : stores `InMemory*` + `Sqlite*` pour Agent / Mandate / AgentActions.
- [x] T4 : `AgentService` (CRUD + kill + révocation automatique des mandats actifs) + `MandateService` (create + sign-callback + revoke).
- [x] T5 : routes HTTP `/api/agents*` + `/api/mandates*` + `/api/sign/mandate-callback`.

### A2 — Serveur MCP stdio + outils core · T6→T14
- [x] T6 : `lib/errors.ts` (McpError + sanitizeError masque chemins/secrets/stack).
- [x] T7 : `lib/audit.ts` (`recordAction` idempotent via `idempotency_key UNIQUE`).
- [x] T8 : `lib/context.ts` (`loadContext` charge mandate actif + agent + actions depuis `agentId`).
- [x] T9 : `lib/guard.ts` (`enforceRiskLimits` : capital max / perte max/jour / max trades/jour / max levier / kill switch / paires autorisées — **raise avant tout ordre**).
- [x] T10 : `bin/tide-mcp.ts` + `server.ts` (bootstrap stdio JSON-RPC).
- [x] T11 : `get_market` (1er outil, branchement du `PriceFeed`).
- [x] T12 : `get_markets` + `get_history` + `get_orderbook` (OHLC Binance klines + clamp limit).
- [x] T13 : portfolio (`get_balance` / `get_portfolio` / `get_positions` / `get_leaderboard`).
- [x] T14 : `place_order` (Paper + guard amont + audit + idempotency + broadcast) + `cancel_order`.

### A3 — Outils restants + mode Live · T15→T22
- [x] T15 : `open_position` + `close_position` (perp, mapping `long→buy`/`short→sell` pour le guard, marge réservée).
- [x] T16 : `list_competitions` + `get_competition` + `join_competition` (renvoie le `txJson` non signé — Xaman requis) + `get_competition_leaderboard`.
- [x] T17 : `get_mandate` + `get_risk_limits` + `get_config` + `get_agent_status` (4 read-only meta tools). *+ fix critique T17-fix : 4 outils non enregistrés dans `tools/index.ts` → test `tools-index.test.ts` verrou de régression.*
- [x] T18 : SSE agent-broadcaster (`agent_killed`/`agent_action`) + `GET /api/agents/events` + diff `reason?` optionnel pour rétrocompat.
- [x] T19 : `lib/crypto.ts` (AES-256-GCM helpers `encryptPrivateKey`/`decryptPrivateKey`/`readMasterKey`).
- [x] T20 : `AgentXrplAccountService` (generate / decryptSeed / revoke) + `AgentXrplKeysStore` (InMemory + SQLite `agent_xrpl_keys`) + `readAgentKeyMaster()` valide `TIDE_AGENT_KEY_MASTER`.
- [x] T21 : 2 routes HTTP `POST/DELETE /api/agents/:id/live-account` (provision + revoke) + `parseProvisionLiveAccount` + fix latent `AgentNotFoundError.name`/`MandateNotFoundError.name`.
- [x] T22 : `place_order` branche sur `trading.placeLiveOrder(...)` quand `mode === "live"` (seed déchiffré via `LiveCryptoService.decryptAgentSeed(mandate.agentId)`). Risk guard partagé Paper/Live.

### A4 — UI + chat intégré + E2E · T23→T33
- [x] T23 : `@tide/client` étendu de 9 méthodes (`agents`/`agent`/`createAgent`/`updateAgent`/`deleteAgent`/`killAgent`/`mandates`/`createMandate`/`agentActions`) + 3 DTOs.
- [x] T24 : `useAgent` composable (CRUD + bus SSE temps réel + buffer actions capé à 200 + fix Node 25+ `localStorage` dans `test-setup/dom.ts`).
- [x] T25 : `useMandate` composable (form → create + calcul `validUntil`).
- [x] T26 : composants `MandateForm.vue` + `KillSwitch.vue` + `ActionLog.vue` (FR/EN i18n).
- [x] T27 : `AgentChatService` backend (Claude API + tool interception + SSE stream).
- [x] T28 : `useAgentChat` composable (streaming SSE token-par-token).
- [x] T29 : `ChatPanel.vue` (interface chat LLM + tool_use blocks).
- [x] T30 : `AgentView.vue` (~280 lignes, layout 3 colonnes) + nav + i18n câblée + route `/agent` dans `useRoute.ts`.
- [x] T31 : `McpConfigInstructions.vue` (instructions branchement Claude Desktop, bloc JSON `claude_desktop_config.json` + Copy clipboard). *Orphelin volontaire — intégration AgentView attend câblage MCP runtime.*
- [x] T32 : E2E test `e2e-agent-flow.test.ts` (147 lignes, 2 tests `inject()` : `createAgent → signMandate → kill` puis vérification `revoked`).
- [x] T33 : docs update (CLAUDE.md + DEVLOG entries Phase 1/2/3/4 + ce ROADMAP Phase 5).

### Reste (câblage runtime — hors plan 33, post-livraison)
- [ ] `bin/tide-mcp.ts` : remplacer les stubs `bootstrapPaper`/`bootstrapTrading`/`bootstrapPerp`/`bootstrapActions`/`bootstrapCompetitions` (throw loud) par les vrais adapters HTTP `@tide/api` (`HttpPaperBackend`/`HttpTradingBackend`/etc.).
- [ ] Packaging release : publier `@tide/mcp` sur npm (ou tarball GitHub) pour que `npx -y @tide/mcp` résolve depuis `McpConfigInstructions`.
- [ ] Intégrer `<McpConfigInstructions>` dans la sidebar gauche de `AgentView` (`v-if` sur `currentAgent?.type === "external"`).
- [ ] Brancher `AgentChatService` côté `main.ts` (si clé LLM dispo : `TIDE_LLM_API_KEY`).
- [ ] Outils MCP restants du catalogue original : `place_limit_order` / `set_tp_sl` (ré-attribution scope, pattern additif rodé sur T14-T17).
- [ ] Activation runtime mainnet : `.env` (`TIDE_AGENT_KEY_MASTER`, comptes agents indexés, `TIDE_LLM_API_KEY`).
- [ ] Vérification navigateur runtime de l'écran `AgentView` + streaming SSE chat (chat intégré) + branchement Claude Desktop (chat externe).

---

## Hors-scope (coupé du MVP)
Perp/dérivés · oracle on-chain (XLS-47) · EVM sidechain · smart contracts · backtest engine · multi-chain · fiat on-ramp · mobile natif · design léché · atomicité multi-tx (Batch) · Escrow pour le prize pool (remplacé par multisig, cf. SPEC §3).

---

## Risques de planning

| Risque | Signe d'alerte | Plan B |
|---|---|---|
| Le spike d'attribution échoue / le `SourceTag` ne suffit pas | Compteur orga ne bouge pas après une tx taggée | Demander à l'orga le mécanisme exact d'attribution avant de coder le reste ; pivoter le véhicule d'activation |
| Réponses orga tardives (active account / self-généré) | Pas de réponse avant fin Phase 0 | Coder l'activation par buy-in **avec valeur** (hypothèse safe) ; ne pas miser sur le bot de volume tant que non confirmé |
| Retard Phase 1 (MVP pas prêt au 21 juil) | Paper non jouable mi-juillet | Couper le moteur de compétitions multi-tournois → 1 seul tournoi hardcodé pour la démo d'inscription |
| Conversion paper→live trop faible | Peu de top joueurs passent en Live (Phase 2) | Renforcer les rebates, cibler quelques whales ; ne pas dépendre du volume retail diffus |
| Bot de volume à perte | Spread + frais AMM mangent le capital | Couper le bot ; jouer Most Volume uniquement par users réels + RLUSD |
| Custody multisig = point sensible | Cagnottes qui grossissent | Garder les buy-ins faibles, clôtures rapides, quorum multisig strict |
| Buffer final grignoté | Features encore ouvertes au 10 sept | Gel de scope ferme ; tout ce qui n'est pas stable passe hors-scope |
