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
pnpm test                      # tests (vitest) — 237 tests
pnpm typecheck                 # types (tsc/vue-tsc strict, par-package)
pnpm lint                      # eslint (no-explicit-any en erreur)
pnpm --filter @tide/api start  # API (PORT=3000, persistance TIDE_DB_PATH=tide.db)
pnpm --filter @tide/web dev    # front (Vite ; pointe VITE_API_BASE sur l'API)
pnpm --filter @tide/web build  # build du front
```

## Où on en est

**Backend off-chain complet, testé (174 tests) et runnable.** 11 features livrées, chacune testée + auditée par sous-agent + commitée sur `dev` :
- **Domaine pur** (`packages/core`) : moteur Paper (ordres, equity/PnL), compétitions (pool, rake, classement, **split-pot** ex-aequo, reliquat), leaderboard.
- **Intégration XRPL** (`packages/xrpl`) : builders de tx taggées (`buildBuyInPayment`/`buildLiveOffer`, SourceTag+Memos), agrégateur d'attribution (volume + comptes actifs distincts), cœur du feed de prix (spot AMM, mid, conversion drops).
- **Backend** (`apps/api`) : services + **Fastify** + feed CEX + cache + **persistance SQLite** (survie au redémarrage vérifiée) + lecteur AMM, entrypoint runnable.
- **Client** (`packages/client`) : `TideClient` typé, transport injecté, testé contre le vrai serveur.
- **Front MVP** (`apps/web`) : Vue 3 + Vite, composables testés + vues terminal/leaderboard/compétitions. Build OK, **rendu visuel à valider par Armand**.

**MVP vertical complet et démontrable** (backend ↔ client ↔ front). 237 tests, ~17 audits sous-agents, sur `dev`, jamais push.

**Frontière restante — demande l'environnement d'Armand (non vérifiable ici) :**
- **Chemin critique mainnet** : spike d'attribution (1 swap taggé qui fait monter le compteur orga), réserver/déclarer le `SourceTag`, questions orga, spike multisig prize pool.
- **Adaptateur xrpl Client live** (connexion mainnet), **order book reader**, **intégration Xaman** (clés XUMM = secrets). Tout ça : code « non vérifié » tant que pas testé sur ton mainnet/tes clés.

Dette tracée (DEVLOG) : montants en `number` (passer en BigInt/drops au point de règlement) ; normalisation du volume pour l'agrégateur (un seul point partagé).

## Conventions

TS strict, jamais `as any` · modules cohérents (un module = une responsabilité) · pas de valeurs magiques ni de duplication · valider toutes les entrées critiques (montants, adresses, paramètres de tx) · secrets hors repo. Voir aussi `~/.claude/CLAUDE.md`.
