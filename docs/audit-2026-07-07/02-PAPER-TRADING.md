# 02 — Paper trading (le cœur solide) ✅

> **Verdict : opérationnel de bout en bout, testé, persisté sur disque, câblé au runtime.** C'est la partie la plus mature du projet et elle est prête pour une démo.

## Flux fonctionnel complet

```
POST /accounts (ou /accounts/ensure)
      │  crédite PAPER_STARTING_EQUITY en QUOTE_CURRENCY
      ▼
POST /accounts/:userId/orders   → applyMarketOrder (spot)
POST /accounts/:userId/positions → open perp (marge réservée, frais)
      ▼
GET /accounts/:userId/portfolio → equity/PnL (equityWithPositions)
      ▼
GET /leaderboard                → buildLeaderboard (classement + PnL)
```

Tout ce flux est **réellement câblé** dans `apps/api/src/main.ts` et couvert par les tests.

## Domaine pur (`packages/core/src`)

Moteur immuable, sans I/O, ré-exporté par `index.ts` :

- **Spot** — `paper/account.ts` (`applyMarketOrder`, `balanceOf`, `InsufficientBalanceError`), `paper/equity.ts` (`equity`, `pnl`, `pnlRatio`), `paper/validate.ts`.
- **Perp** — `position/pnl.ts` (`positionPnl` long/short), `position/equity.ts` (`equityWithPositions`, `reservedMargin`, `availableMargin` — sans double comptage de la marge), `position/validate.ts`.
- **Compétitions** — `competition/prize.ts` (`prizePool`, `distributable`), `competition/ranking.ts` (`rankByEquity`, gère les ex-aequo), `competition/payout.ts` (`computePayouts` split-pot + `undistributedAmount` reliquat).
- **Leaderboard** — `leaderboard/leaderboard.ts` (`buildLeaderboard`).

## Service applicatif (`apps/api/src/services/paper-service.ts`)

Classe `PaperService` qui délègue la persistance à un `AccountStore` injecté :

- `openAccount` / `ensureAccount` — crédite le capital de départ.
- `placeOrder` — spot, `applyMarketOrder` + persistance atomique.
- `openPosition` / `closePosition` — perp : marge réservée, frais débités à l'ouverture, **PnL réalisé plafonné à −marge** (isolated margin), valorisé au **prix serveur** à la fermeture.
- `equityOf`, `pnlOf`, `portfolioOf`, `leaderboard` — branchés sur le domaine.

`competition-service.ts` : `create/list/get/join/participants/close`. Le `close()` classe par equity via `EquityProvider` (= `paper.equityOf`), calcule payouts + reliquat, et ne marque `closed` qu'**après** calcul (anti double-paiement).

## Persistance SQLite — RÉELLE, sur disque

- `store/sqlite.ts` charge le module builtin **`node:sqlite`** via `createRequire` (contourne le bundler vitest). `:memory:` par défaut, **fichier disque en prod** (`main.ts` ouvre `openDatabase(env.readDbPath())`, défaut `tide.db`).
- `store/sqlite-account-store.ts` — 4 tables (`accounts`, `balances`, `orders`, `positions`), mutations **transactionnelles** (`BEGIN/COMMIT/ROLLBACK`) : soldes + fill/position écrits atomiquement.
- Les variantes `InMemoryAccountStore` / `InMemoryCompetitionStore` existent mais servent de **défaut de test uniquement** ; la prod utilise SQLite.

**Preuve par test :**
- `test/persistence.test.ts` — vérifie qu'« une nouvelle app sur la même base retrouve les comptes » (survie au redémarrage) + partage de connexion.
- `test/paper-store.test.ts` — lance **la même batterie sur InMemory ET Sqlite** → comportement identique garanti.

## Couverture de tests

92 fichiers de test au total dans le repo. Pour le paper trading spécifiquement :
- `packages/core/test/{account,equity,position,competition,leaderboard}.test.ts`
- `apps/api/test/{paper-service,paper-store,competition-service,competition-store,persistence,app,server}.test.ts`

## Limites assumées (pas des bugs, des choix MVP)

- **Pas de slippage** en paper spot (`applyMarketOrder` exécute au prix fourni) — assumé.
- **Montants en `number` JS** (pas de BigInt/drops) — acceptable en paper, dette tracée pour le Live (voir [07-DETTE-RISQUES.md](07-DETTE-RISQUES.md)).
- **Déclencheurs limit/TP-SL côté front** — si l'onglet est fermé, pas de déclenchement ; pas de liquidation auto serveur (plancher −marge seulement à la fermeture).

## Conclusion

Le paper trading **n'est pas un mock** : moteur pur testé + service + SQLite disque + routes montées. On peut créer un compte, trader spot et perp, valoriser un portefeuille, jouer une compétition avec payouts, et tout survit au redémarrage. **C'est déployable en démo dès aujourd'hui.**
