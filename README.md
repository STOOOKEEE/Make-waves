# Tide

Terrain d'entraînement au trading crypto sur **XRPL Mainnet** : on apprend sans risque en **paper trading**, on prouve son edge dans des **compétitions** ancrées on-chain (`SourceTag`), puis on passe au **trading réel** en un clic.

Projet pour le hackathon **Make Waves XRPL** (22 juin → 21 septembre 2026).

## Documentation

- [`docs/SPEC.md`](docs/SPEC.md) — spec technique (primitives XRPL, architecture, modèle de données).
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — plan d'exécution (tâches, jalons).
- [`docs/DEVLOG.md`](docs/DEVLOG.md) — historique daté.
- [`CLAUDE.md`](CLAUDE.md) — état courant du projet.

## Structure (monorepo pnpm)

```
packages/core   # domaine pur : moteur paper, compétitions, PnL (testable sans I/O)
packages/xrpl   # intégration XRPL : tx builders + SourceTag, Xaman, feed prix
apps/api        # backend (API + DB)
apps/web        # front Vue 3 + Vite
```

## Commandes

```bash
pnpm install      # installer les dépendances
pnpm test         # lancer les tests (vitest)
pnpm typecheck    # vérifier les types (tsc)
pnpm lint         # linter (eslint)
```

## Stack

Vue 3 + Vite + TypeScript · Node + DB · `xrpl.js` · Xaman (XUMM SDK). Aucun smart contract (tout en primitives natives XRPL + backend off-chain).
