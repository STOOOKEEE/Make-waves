# Tide — état du projet

App de paper trading + compétitions on-chain sur **XRPL Mainnet**, avec passage au trading réel (mode Live). Hackathon **Make Waves XRPL** (90 j, fin 2026-09-21).

- **Spec complète** : [`docs/SPEC.md`](docs/SPEC.md)
- **Roadmap d'exécution** : [`docs/ROADMAP.md`](docs/ROADMAP.md)
- **Historique** : [`docs/DEVLOG.md`](docs/DEVLOG.md)

## Le produit en bref

Un seul produit, deux modes partageant feed de prix / UI / leaderboard :
- **Paper** : portefeuille virtuel, ordres simulés sur prix réels, PnL, compétitions. 100 % off-chain.
- **Live** : swap spot réel sur le DEX natif XRPL, signé Xaman (non-custodial), taggé `SourceTag` (compteur du hackathon).
- **Funnel** : foule en Paper → top joueurs convertissent en Live → volume.
- **Revenu** : buy-in de tournoi (rake type poker), **pas** de fee sur les swaps.

## Stack

- Frontend : **Vue 3 + Vite + TypeScript** (terminal de trading, leaderboard, compétitions).
- Backend : **Node + TS + DB** (état Paper, compétitions, leaderboard, métriques taggées).
- XRPL : **`xrpl.js`** (`OfferCreate`/`Payment` avec `SourceTag`/`Memos`, lecture AMM + carnet).
- Wallet : **Xaman (XUMM SDK)** — signature non-custodial.
- Prix : `xrpl.js` (on-chain) + API CEX (CoinGecko/Binance). **Aucun oracle on-chain.**
- Moteur de volume (option) : base du bot **Diaso** adaptée XRPL, taggée.

## Décisions verrouillées

- **Pas de smart contract** (XLS-100/101 = devnet ~2027). Tout en primitives natives + backend off-chain.
- **Pas d'oracle on-chain** (XLS-47 inutile sans contrat consommateur).
- **Pas de perp on-chain, pas d'EVM sidechain** pour ce hack (perp = smart contracts absents du mainnet ; sidechain = hors `SourceTag` L1, c'est la v2). Un perp **simulé en Paper** (front, off-chain) est **assumé** (décision 30/06, réouvre le « spot-only » du 21/06) — cadré comme simulation, **sans levier réel**. Son PnL **remonte au backend** (leaderboard complet, cf. « Où on en est »).
- **Pas d'atomicité multi-tx** (amendment `Batch` désactivé).
- Prize pool : **compte opérateur multisig** (pas d'Escrow — destination unique, ne peut pas payer N gagnants). Distribution semi-custodiale par `Payment` taggés vers les gagnants.

## Structure (monorepo pnpm)

```
make-waves/
├── packages/
│   ├── core/          # domaine pur (paper, competition, leaderboard)
│   ├── xrpl/          # intégration XRPL (tx taggées, metrics, price, amm-reader)
│   └── client/        # client API typé (@tide/client)
├── apps/
│   ├── api/           # backend Node : services + HTTP (Fastify) + feed + store SQLite
│   │   └── src/{services, http, feed, store, app.ts, main.ts}
│   └── web/           # front Vue 3 + Vite (composables + vues terminal/leaderboard/compét)
├── docs/              # SPEC, ROADMAP, DEVLOG
└── CLAUDE.md          # ce fichier (état courant)
```
*Branche de travail : `dev` (main = baseline). Équipe 2-3, full-time.*

## Commandes

```bash
pnpm install                   # dépendances
pnpm test                      # tests (vitest) — 406 tests
pnpm typecheck                 # types (tsc/vue-tsc strict, par-package)
pnpm lint                      # eslint (no-explicit-any en erreur)
pnpm --filter @tide/api start  # API (PORT=3000, persistance TIDE_DB_PATH=tide.db)
pnpm --filter @tide/web dev    # front (Vite ; pointe VITE_API_BASE sur l'API)
pnpm --filter @tide/web build  # build du front
```

## Où on en est

**MVP vertical complet (off-chain) + couche on-chain câblée au runtime (activable par config, OFF par défaut) + front refondu RELIÉ au backend + mode Live réel (connexion wallet + swap spot signé) avec moteur d'exécution (best execution + slippage).** 473 tests. `dev` = tout commit jusqu'à la campagne « honnêteté des surfaces » (back F1-F15 + front design + câblage + carnets/charts réels). ⚠️ Non commit : **F16 — terminal dérivés Paper** (perp/levier/limit/TP-SL) + **F17 — remontée des positions perp au backend** (modèle de position au domaine, leaderboard complet).

- **Domaine pur** (`packages/core`) : moteur Paper (ordres, equity/PnL), **positions** (perp à levier : `positionPnl`, `equityWithPositions` = soldes + PnL, marge réservée, `validateOpenPosition`), compétitions (pool, rake, classement, **split-pot** ex-aequo, reliquat), leaderboard (inclut le PnL des positions).
- **Backend off-chain** (`apps/api`) : services + **Fastify** + feed CEX + cache + **persistance SQLite** (survie au redémarrage) + lecteur AMM, runnable. Client `@tide/client` typé.
- **Front** (`apps/web`) : Vue 3 + Vite, refonte **« terminal éditorial » bilingue FR/EN** (vues Landing/Dashboard/Portfolio/Leaderboard/Competitions/Competition/Arena). Consomme `@tide/client`. Build OK.
- **Intégration front↔back (F11)** : front et back **reliés et vérifiés end-to-end**. Session partagée (`useSession`, userId persistant). Vues branchées sur l'API : Dashboard (ordres XRP/RLUSD réels + prix live), Leaderboard, Compétitions (liste/détail **live** fusionnés au catalogue de présentation), Portfolio (holdings valorisés + equity/pnl/rang + activité = ordres réels). Nouvelles routes back : **`GET /competitions`**, **`GET /competitions/:id`**, **`GET /prices`**, **`GET /accounts/:id/portfolio`** ; **seed** de compétitions de démo (ids alignés sur le catalogue front). Décor assumé (pas de donnée back) : courbe d'équité, win-rate, carnet/chart simulés. `useMarket.ts` = code mort (non importé).
- **Intégration XRPL on-chain** (`packages/xrpl` + `apps/api`), F1→F9, chacune auditée :
  - **F1** `XrplClient` (connexion injectable + `ammSpotPrice`) · **F2** lecteur de carnet `book_offers` · **F3** feed double source CEX+on-chain (garde de divergence) · **F4** **indexeur d'attribution** (tx taggées réussies, fenêtre figée, store idempotent — la métrique reine) · **F5** best execution + bornage slippage · **F6** **multisig** (`SignerListSet`) + **payouts** plus grand reste · **F7** soumission tx + classification `engine_result` · **F8** **Xaman** (payload non-custodial, SDK injecté) · **F9** moteur de volume conditionnel + garde-fou anti wash-trading (OFF par défaut).
- **F10 — câblage runtime + HTTP** (`apps/api/src/main.ts`, `config/env.ts`, `http/server.ts`, `xaman/sdk.ts`, `@tide/xrpl` `connectXrplClient`) : `main.ts` est un **assembleur** ; feed on-chain, indexeur (+ sync) et Xaman sont **activés par config env**, OFF par défaut. Routes **`POST /sign/buy-in`**, **`GET /metrics`**. `xumm-sdk` ajouté. **Config** : voir `.env.example`.
- **F12 — mode Live (wallet + swap réel)** : connexion non-custodiale **Xaman** (QR/polling) **et GemWallet** (extension) ; `useWallet` (singleton) + `SignModal` ; toggle Paper/Live dans le ticket. Routes `POST /sign/connect`, `GET /sign/status/:uuid`, `GET /config`. Chart trading réel (**Binance klines**, timeframes `5m/15m/1H/4H/1D`, axe des dates).
- **F13 — moteur d'exécution Live spot** (`apps/api/src/exec/plan-live.ts`) : le front envoie une **intention** (base/side/quantité/slippage), le serveur calcule l'`OfferCreate` borné via `planExecution` (best execution + **slippage**, `sourceTag` + issuer du quote injectés serveur). Routes **`POST /exec/plan`** (GemWallet) et **`POST /sign/live-offer`** (Xaman). Quote Live = **RLUSD mainnet par défaut** dès que `TIDE_SOURCE_TAG` est défini ; `TIDE_RLUSD_ISSUER` ne sert qu'à surcharger. `@tide/client` : `planLiveOffer`/`signLiveOffer` (intention). **Vérifié au runtime** : OFF par défaut, `live:on` avec SourceTag → `/exec/plan` rend un `OfferCreate` réel (prix XRP live, bornage +slippage, `SourceTag`).
- **F14 — refonte UX du terminal** : **barre de mode Paper↔Live** en tête (`DashboardView`, `.main` flex → `.deck` 3 colonnes), transformation visuelle ambre en Live (token `--live`), contexte wallet/solde, bascule Live qui **ouvre la connexion wallet** si besoin. Nettoyage spot (carnet RLUSD, retrait Funding/Stop/Limit, CSS/i18n morts — Limit/levier réintroduits ensuite en F16, en moteur local). Recherche watchlist câblée. Vérifié headless (Paper + Live).
- **F15 — feed « markets » top 250** : watchlist **dynamique** via CoinGecko **`/coins/markets`** (`feed/coingecko-markets.ts`, route `GET /markets`, `client.markets()`) — prix + %24h réels + nom, sans mapping manuel (remplace `SYMBOL_TO_ID`/9 coins). `PriceMap` couvre les 250 (ordres/equity OK). Recherche locale dedans (HYPE & co). Live reste XRP/RLUSD.
- **« Honnêteté des surfaces » (29/06, post-F15)** : purge des dernières données simulées du marché. **Carnets réels** multi-venues (XRPL `book_offers`, Binance, **Hyperliquid** pour HYPE) avec refresh + tri vers le spread ; **charts réels** en cascade (Binance klines → CoinGecko history/OHLC → GeckoTerminal → Gate candles, distinction OHLC/ligne) à la place des bougies synthétiques. Feeds ajoutés : `binance/hyperliquid/gate-book-feed`, `coingecko-history/ohlc`, `geckoterminal-history`, `gate-history`. Dette : forte dépendance aux API externes (rate-limit/CORS/dispo).
- **F16 — terminal dérivés Paper [⚠️ non commit, WIP]** : spot↔**perp** + **levier**, ordres **market↔limit**, **TP/SL**, maker/taker, **blotter** (positions/ordres/historique), zoom chart + bougie live. Identité paper **anonyme** sans wallet (`tide.paperUserId`, rouvre `586a4e4`).
- **F17 — remontée des positions perp au backend [⚠️ non commit]** : les positions perp sont modélisées au **domaine** (`@tide/core` module `position`) et exposées en HTTP (`POST/GET /accounts/:id/positions`, `.../close`) ; `@tide/client` `openPosition`/`closePosition`/`positions`. **Compta** : spot → soldes (cash dépensé) ; perp → position (marge réservée, fee débité à l'ouverture, **PnL réalisé crédité à la fermeture, plafonné à -marge**, valorisé au **prix serveur**). `equityWithPositions` → **leaderboard/portfolio incluent le PnL des positions**. Le terminal (`DashboardView`/`usePaper`) appelle le backend (TP/SL/limit restent des **déclencheurs côté front**, seule l'exécution remonte). Vérifié : tests bout en bout (inject) + build web ; **reste la vérif navigateur runtime**.
- **Tide School — section éducative [branche `feat/tide-school`]** : cursus de **16 leçons bilingues FR/EN** (`/learn` + `/learn/:slug`) sur 4 pistes (Bases, Perps & levier, Stratégies, Tide & compétitions). Contenu en **blocs typés** bilingues (`data/learn/` : `types.ts` + `index.ts` résolveurs, un fichier par leçon — patron `data/competitions.ts`, sans nouvelle dépendance, sans markdown/`v-html`). Vues `LearnView`/`LearnArticleView` + renderer `ArticleBody` sur les tokens `docs/DESIGN.md`. Routing/nav câblés (`useRoute`/`App`/`AppBar` « Learn »/« Apprendre ») + entrée footer landing. **Points d'entrée contextuels** : composant `LearnHint` (puce « ? » → leçon) posé sur 5 contrôles du ticket `DashboardView` (perp, types d'ordres, maker/taker, levier, TP/SL). Contenu **conforme aux règles produit** (perp simulé sans levier réel, PnL planchonné à −marge, TP/SL déclencheurs client, frais 0,02/0,06 %, rake, Live spot XRP taggé). Vérifié : typecheck/build/lint + **515 tests** ; **reste la vérif navigateur runtime**.

- **AI Agent (Phase 5 du ROADMAP)** : **Tide devient MCP-native**. Couche **AI Agent** ajoutée par-dessus le produit existant (cf. spec [`docs/superpowers/specs/2026-07-05-ai-agent-design.md`](docs/superpowers/specs/2026-07-05-ai-agent-design.md)) : agents autonomes — externes via **MCP** (Claude Desktop, Cursor) ou intégrés dans l'UI Tide — qui tradent via les mêmes primitives Tide, scopés par un **mandat signé Xaman** et encadrés par des **garde-fous durs serveur** (capital max, perte max/jour, max trades/jour, max levier, kill switch). Les 2 populations (externes + intégrés) utilisent **les mêmes 20 outils** définis dans `@tide/mcp`, avec les mêmes gardes — pas de mode « avancé » pour bypasser. Mode Paper + Live pour les deux types. **Mode Live** = compte XRPL agent dédié, clé chiffrée AES-256-GCM (`TIDE_AGENT_KEY_MASTER`, `master_key_id="v1"` versionnable). Nouvelle vue **`AgentView.vue`** (mandat + chat LLM + log actions + kill switch), nouveau **bus SSE agent** (`agent_killed` / `agent_action`). **738/738 tests**, typecheck 8/8 vert, lint : 5 erreurs pré-existantes (stores SQLite T3 + guard test T7) inchangées. Plan 33-tâches (`docs/superpowers/plans/2026-07-05-ai-agent.md`) **complété** (T1→T33) — `feat/agent-mcp` branche de travail. **Reste** : câblage runtime MCP (`bin/tide-mcp.ts` stubs `bootstrapPaper`/`bootstrapTrading`/`bootstrapPerp`/`bootstrapCompetitions` à remplacer par les vrais adapters HTTP `@tide/api` quand Armand branche) ; packaging release (`npx -y @tide/mcp` pour Claude Desktop).

**Frontière restante — demande l'environnement d'Armand (non vérifiable ici) :**
- **Chemin critique mainnet** : exécuter le spike d'attribution (1 swap taggé → compteur orga), réserver/déclarer le `SourceTag`, trancher les questions orga (active account, volume self-généré → conditionne F9), spike multisig prize pool.
- **Activation runtime** (le code est câblé, il manque les **valeurs réelles**) : `.env` (clés XUMM, `XRPL_WSS_URL`, `SourceTag` réservé, comptes indexés). Le **quote Live = RLUSD mainnet par défaut** (`DEFAULT_LIVE_QUOTE`, émetteur vérifié) → Live s'active dès que `TIDE_SOURCE_TAG` est défini ; `TIDE_RLUSD_ISSUER` ne sert qu'à surcharger. **`ONCHAIN_POOLS`** dans `main.ts` reste vide (prix d'exécution depuis le CEX).
- **Swap Live de bout en bout** : le moteur produit un `OfferCreate` borné correct (vérifié), reste à voir la **signature wallet réelle + le remplissage on-chain** sur mainnet (1 swap taggé → compteur d'attribution). UI Xaman/GemWallet déjà branchée (`useWallet`/`SignModal`).

Dette tracée (DEVLOG) : montants en `number` → BigInt/drops au règlement (garde `MAX_SAFE_INTEGER` posée) ; prix on-chain clé par `currency` sans issuer (homonymes) ; curseur indexeur non persisté (rescan au boot, store idempotent) ; **positions perp** — déclencheurs limit/TP-SL côté front (onglet fermé = pas de déclenchement), pas de liquidation auto serveur (plancher -marge à la fermeture seulement), `entry`/`qty` issus du client à l'ouverture (acceptable en paper).

## Conventions

TS strict, jamais `as any` · modules cohérents (un module = une responsabilité) · pas de valeurs magiques ni de duplication · valider toutes les entrées critiques (montants, adresses, paramètres de tx) · secrets hors repo. Voir aussi `~/.claude/CLAUDE.md`.
