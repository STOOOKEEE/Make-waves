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
│   ├── core/          # domaine pur (testable sans I/O)
│   │   └── src/
│   │       ├── paper/        # moteur paper : ordres, equity, PnL
│   │       └── competition/  # tournois : pool, rake, classement, payouts
│   └── xrpl/          # intégration XRPL : builders tx taggées (SourceTag + Memos)
├── apps/              # (à venir) api + web
├── docs/              # SPEC, ROADMAP, DEVLOG
└── CLAUDE.md          # ce fichier (état courant)
```
*Branche de travail : `dev` (main = baseline). Équipe 2-3, full-time.*

## Commandes

```bash
pnpm install      # dépendances
pnpm test         # tests (vitest) — 76 tests
pnpm typecheck    # types (tsc strict)
pnpm lint         # eslint (no-explicit-any en erreur)
```

## Où on en est

**Phase 0/1 — fondations métier (off-chain) posées.** 3 features livrées, testées, auditées par sous-agent et commitées sur `dev` :
1. Scaffold monorepo + **moteur Paper** (`packages/core/paper` : `applyMarketOrder`, equity/PnL).
2. **Builders de tx taggées** (`packages/xrpl` : `buildBuyInPayment`, `buildLiveOffer` avec `SourceTag` + `Memos`).
3. **Moteur de compétitions** (`packages/core/competition` : pool, rake, classement, payouts).

**Suite immédiate :** feed de prix off-chain (lecture carnet/AMM + API CEX), service backend (apps/api) reliant paper + compétitions + indexeur de métriques, puis intégration Xaman côté front. Chemin critique non encore fait (nécessite Armand) : **spike d'attribution mainnet** (1 swap taggé qui fait monter le compteur orga), réserver le `SourceTag`, questions orga, spike multisig du prize pool.

## Conventions

TS strict, jamais `as any` · modules cohérents (un module = une responsabilité) · pas de valeurs magiques ni de duplication · valider toutes les entrées critiques (montants, adresses, paramètres de tx) · secrets hors repo. Voir aussi `~/.claude/CLAUDE.md`.
