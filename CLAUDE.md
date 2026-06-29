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
- **Pas de perp, pas d'EVM sidechain** pour ce hack (sidechain = hors `SourceTag` L1, c'est la v2).
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

**MVP vertical complet (off-chain) + couche on-chain câblée au runtime (activable par config, OFF par défaut) + front refondu RELIÉ au backend + mode Live réel (connexion wallet + swap spot signé) avec moteur d'exécution (best execution + slippage).** 406 tests. `dev` = tout (back F1-F15 + front design + câblage). ⚠️ Travail F11→F15 **non commit**.

- **Domaine pur** (`packages/core`) : moteur Paper (ordres, equity/PnL), compétitions (pool, rake, classement, **split-pot** ex-aequo, reliquat), leaderboard.
- **Backend off-chain** (`apps/api`) : services + **Fastify** + feed CEX + cache + **persistance SQLite** (survie au redémarrage) + lecteur AMM, runnable. Client `@tide/client` typé.
- **Front** (`apps/web`) : Vue 3 + Vite, refonte **« terminal éditorial » bilingue FR/EN** (vues Landing/Dashboard/Portfolio/Leaderboard/Competitions/Competition/Arena). Consomme `@tide/client`. Build OK.
- **Intégration front↔back (F11)** : front et back **reliés et vérifiés end-to-end**. Session partagée (`useSession`, userId persistant). Vues branchées sur l'API : Dashboard (ordres XRP/RLUSD réels + prix live), Leaderboard, Compétitions (liste/détail **live** fusionnés au catalogue de présentation), Portfolio (holdings valorisés + equity/pnl/rang + activité = ordres réels). Nouvelles routes back : **`GET /competitions`**, **`GET /competitions/:id`**, **`GET /prices`**, **`GET /accounts/:id/portfolio`** ; **seed** de compétitions de démo (ids alignés sur le catalogue front). Décor assumé (pas de donnée back) : courbe d'équité, win-rate, carnet/chart simulés. `useMarket.ts` = code mort (non importé).
- **Intégration XRPL on-chain** (`packages/xrpl` + `apps/api`), F1→F9, chacune auditée :
  - **F1** `XrplClient` (connexion injectable + `ammSpotPrice`) · **F2** lecteur de carnet `book_offers` · **F3** feed double source CEX+on-chain (garde de divergence) · **F4** **indexeur d'attribution** (tx taggées réussies, fenêtre figée, store idempotent — la métrique reine) · **F5** best execution + bornage slippage · **F6** **multisig** (`SignerListSet`) + **payouts** plus grand reste · **F7** soumission tx + classification `engine_result` · **F8** **Xaman** (payload non-custodial, SDK injecté) · **F9** moteur de volume conditionnel + garde-fou anti wash-trading (OFF par défaut).
- **F10 — câblage runtime + HTTP** (`apps/api/src/main.ts`, `config/env.ts`, `http/server.ts`, `xaman/sdk.ts`, `@tide/xrpl` `connectXrplClient`) : `main.ts` est un **assembleur** ; feed on-chain, indexeur (+ sync) et Xaman sont **activés par config env**, OFF par défaut. Routes **`POST /sign/buy-in`**, **`GET /metrics`**. `xumm-sdk` ajouté. **Config** : voir `.env.example`.
- **F12 — mode Live (wallet + swap réel)** : connexion non-custodiale **Xaman** (QR/polling) **et GemWallet** (extension) ; `useWallet` (singleton) + `SignModal` ; toggle Paper/Live dans le ticket. Routes `POST /sign/connect`, `GET /sign/status/:uuid`, `GET /config`. Chart trading réel (**Binance klines**, timeframes `5m/15m/1H/4H/1D`, axe des dates).
- **F13 — moteur d'exécution Live spot** (`apps/api/src/exec/plan-live.ts`) : le front envoie une **intention** (base/side/quantité/slippage), le serveur calcule l'`OfferCreate` borné via `planExecution` (best execution + **slippage**, `sourceTag` + issuer du quote injectés serveur). Routes **`POST /exec/plan`** (GemWallet) et **`POST /sign/live-offer`** (Xaman). Quote Live = **RLUSD mainnet par défaut** dès que `TIDE_SOURCE_TAG` est défini ; `TIDE_RLUSD_ISSUER` ne sert qu'à surcharger. `@tide/client` : `planLiveOffer`/`signLiveOffer` (intention). **Vérifié au runtime** : OFF par défaut, `live:on` avec SourceTag → `/exec/plan` rend un `OfferCreate` réel (prix XRP live, bornage +slippage, `SourceTag`).
- **F14 — refonte UX du terminal** : **barre de mode Paper↔Live** en tête (`DashboardView`, `.main` flex → `.deck` 3 colonnes), transformation visuelle ambre en Live (token `--live`), contexte wallet/solde, bascule Live qui **ouvre la connexion wallet** si besoin. Nettoyage spot (carnet RLUSD, retrait Funding/Stop/Limit, CSS/i18n morts). Recherche watchlist câblée. Vérifié headless (Paper + Live).
- **F15 — feed « markets » top 250** : watchlist **dynamique** via CoinGecko **`/coins/markets`** (`feed/coingecko-markets.ts`, route `GET /markets`, `client.markets()`) — prix + %24h réels + nom, sans mapping manuel (remplace `SYMBOL_TO_ID`/9 coins). `PriceMap` couvre les 250 (ordres/equity OK). Recherche locale dedans (HYPE & co). Live reste XRP/RLUSD.

**Frontière restante — demande l'environnement d'Armand (non vérifiable ici) :**
- **Chemin critique mainnet** : exécuter le spike d'attribution (1 swap taggé → compteur orga), réserver/déclarer le `SourceTag`, trancher les questions orga (active account, volume self-généré → conditionne F9), spike multisig prize pool.
- **Activation runtime** (le code est câblé, il manque les **valeurs réelles**) : `.env` (clés XUMM, `XRPL_WSS_URL`, `SourceTag` réservé, comptes indexés). Le **quote Live = RLUSD mainnet par défaut** (`DEFAULT_LIVE_QUOTE`, émetteur vérifié) → Live s'active dès que `TIDE_SOURCE_TAG` est défini ; `TIDE_RLUSD_ISSUER` ne sert qu'à surcharger. **`ONCHAIN_POOLS`** dans `main.ts` reste vide (prix d'exécution depuis le CEX).
- **Swap Live de bout en bout** : le moteur produit un `OfferCreate` borné correct (vérifié), reste à voir la **signature wallet réelle + le remplissage on-chain** sur mainnet (1 swap taggé → compteur d'attribution). UI Xaman/GemWallet déjà branchée (`useWallet`/`SignModal`).

Dette tracée (DEVLOG) : montants en `number` → BigInt/drops au règlement (garde `MAX_SAFE_INTEGER` posée) ; prix on-chain clé par `currency` sans issuer (homonymes) ; curseur indexeur non persisté (rescan au boot, store idempotent).

## Conventions

TS strict, jamais `as any` · modules cohérents (un module = une responsabilité) · pas de valeurs magiques ni de duplication · valider toutes les entrées critiques (montants, adresses, paramètres de tx) · secrets hors repo. Voir aussi `~/.claude/CLAUDE.md`.
