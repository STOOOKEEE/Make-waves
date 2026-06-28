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

- Frontend : **Nuxt + TypeScript** (terminal de trading, leaderboard, compétitions).
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
pnpm test                      # tests (vitest) — 384 tests
pnpm typecheck                 # types (tsc/vue-tsc strict, par-package)
pnpm lint                      # eslint (no-explicit-any en erreur)
pnpm --filter @tide/api start  # API (PORT=3000, persistance TIDE_DB_PATH=tide.db)
pnpm --filter @tide/web dev    # front (Vite ; pointe VITE_API_BASE sur l'API)
pnpm --filter @tide/web build  # build du front
```

## Où on en est

**MVP vertical complet (off-chain) + couche d'intégration on-chain écrite, testée ET câblée au runtime (activable par config, OFF par défaut).** 384 tests, ~25 audits sous-agents. `dev` poussé sur `origin`, `main` = MVP off-chain + front (PR #1 mergée).

- **Domaine pur** (`packages/core`) : moteur Paper (ordres, equity/PnL), compétitions (pool, rake, classement, **split-pot** ex-aequo, reliquat), leaderboard.
- **Backend off-chain** (`apps/api`) : services + **Fastify** + feed CEX + cache + **persistance SQLite** (survie au redémarrage) + lecteur AMM, runnable. Client `@tide/client` typé.
- **Front** (`apps/web`) : Vue 3 + Vite, refonte **style Analogue** (hero light-tunnel animé en canvas, achromatie stricte). Build OK.
- **Intégration XRPL on-chain** (`packages/xrpl` + `apps/api`), F1→F9, chacune auditée :
  - **F1** `XrplClient` (connexion injectable + `ammSpotPrice`) · **F2** lecteur de carnet `book_offers` · **F3** feed double source CEX+on-chain (garde de divergence) · **F4** **indexeur d'attribution** (tx taggées réussies, fenêtre figée, store idempotent — la métrique reine) · **F5** best execution + bornage slippage · **F6** **multisig** (`SignerListSet`) + **payouts** plus grand reste · **F7** soumission tx + classification `engine_result` · **F8** **Xaman** (payload non-custodial, SDK injecté) · **F9** moteur de volume conditionnel + garde-fou anti wash-trading (OFF par défaut).
- **F10 — câblage runtime + HTTP** (`apps/api/src/main.ts`, `config/env.ts`, `http/server.ts`, `xaman/sdk.ts`, `@tide/xrpl` `connectXrplClient`) : `main.ts` est un **assembleur** ; feed on-chain, indexeur (+ sync) et Xaman sont **activés par config env**, OFF par défaut. Routes **`POST /sign/buy-in`**, **`POST /sign/live-offer`** (sourceTag + prize pool injectés **côté serveur**), **`GET /metrics`**. `xumm-sdk` ajouté. Client `@tide/client` étendu (`metrics`/`signBuyIn`/`signLiveOffer`). **Config** : voir `.env.example` (`XRPL_WSS_URL`, `TIDE_SOURCE_TAG`, `TIDE_INDEXED_ACCOUNTS`, `TIDE_PRIZE_POOL_ADDRESS`, `XUMM_API_KEY`/`SECRET`).

**Frontière restante — demande l'environnement d'Armand (non vérifiable ici) :**
- **Chemin critique mainnet** : exécuter le spike d'attribution (1 swap taggé → compteur orga), réserver/déclarer le `SourceTag`, trancher les questions orga (active account, volume self-généré → conditionne F9), spike multisig prize pool.
- **Activation runtime** (le code est câblé, il manque les **valeurs réelles** — non vérifié tant que pas testé sur ton mainnet/tes clés) : remplir le `.env` (clés XUMM secrètes, `XRPL_WSS_URL`, `SourceTag` réservé, comptes indexés) et **`ONCHAIN_POOLS`** dans `main.ts` (issuers réels, ex. RLUSD, vide par défaut).
- **Front Xaman** : déclencher la signature depuis l'UI (`@tide/client` expose déjà `signBuyIn`/`signLiveOffer` ; composables/vues à brancher).

Dette tracée (DEVLOG) : montants en `number` → BigInt/drops au règlement (garde `MAX_SAFE_INTEGER` posée) ; prix on-chain clé par `currency` sans issuer (homonymes) ; curseur indexeur non persisté (rescan au boot, store idempotent).

## Conventions

TS strict, jamais `as any` · modules cohérents (un module = une responsabilité) · pas de valeurs magiques ni de duplication · valider toutes les entrées critiques (montants, adresses, paramètres de tx) · secrets hors repo. Voir aussi `~/.claude/CLAUDE.md`.
