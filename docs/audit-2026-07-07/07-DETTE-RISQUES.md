# 07 — Dette technique & risques

> Ce qui est **assumé** aujourd'hui et devra être traité pour un produit mainnet robuste. La plupart de ces points sont acceptables en paper/démo mais deviennent bloquants en Live réel.

## Dette technique tracée

| # | Dette | Impact | Où | Quand la régler |
|---|-------|--------|-----|-----------------|
| 1 | **Montants en `number` JS** (pas BigInt/drops) | Précision flottante au règlement réel | `core/src/paper/account.ts`, `paper/equity.ts` | Avant swap Live (garde `MAX_SAFE_INTEGER` déjà posée) |
| 2 | **Prix on-chain clé par `currency` sans issuer** | Collision d'homonymes (tokens de même code) | couche prix `packages/xrpl` | Avant multi-token Live |
| 3 | **Curseur indexeur non persisté** | Rescan complet au boot (store idempotent compense) | `apps/api/src/indexer/indexer.ts` | Phase 4 |
| 4 | **Déclencheurs limit/TP-SL côté front** | Onglet fermé = pas de déclenchement | `apps/web/src/composables/usePaper.ts` | Si on veut du perp « sérieux » |
| 5 | **Pas de liquidation auto serveur** | Plancher −marge seulement à la fermeture | `services/paper-service.ts` | Si perp Live un jour |
| 6 | **`entry`/`qty` issus du client à l'ouverture de position** | Acceptable en paper, exploitable en Live | `services/paper-service.ts` | Avant perp Live |
| 7 | **Chat agent ctx stubbé** | Agent UI n'exécute rien | `http/server.ts:120-188` | Phase 3 |
| 8 | **Routes agents non montées** | `AgentView` cassée en runtime | `main.ts:275-291` | Phase 3 (rapide) |
| 9 | **`ONCHAIN_POOLS = {}` hardcodé** | Feed prix on-chain non activable sans éditer le code | `main.ts:64` | Phase 1 |
| 10 | **Issuer RLUSD mainnet en dur** | Pas de testnet propre | `exec/plan-live.ts:35` | Avant tests testnet |

## Risques

### Dépendance forte aux API externes (le plus gros risque produit)
Prix, carnets et charts dépendent d'API tierces (CoinGecko, Binance, Hyperliquid, Gate, GeckoTerminal). Risques : **rate-limit, CORS, indisponibilité**. En démo live devant un jury, une panne CoinGecko casse le feed de prix (donc ordres/equity). → prévoir cache + fallback + éventuellement un proxy serveur pour contourner CORS.

### Swap Live non prouvé
Le moteur produit un `OfferCreate` correct, mais **aucun swap réel n'a jamais été exécuté sur mainnet**. Risque d'inconnues à la signature/remplissage (frais, trustline RLUSD requise côté joueur, partial fill, échec `engine_result`). → spike obligatoire avant de le présenter comme fonctionnel.

### Attribution = métrique du hackathon
Tout le scoring orga repose sur le compteur de tx taggées. L'indexeur est bien conçu mais **non éprouvé en conditions réelles**. Un SourceTag mal réservé ou des comptes mal listés = zéro attribution comptée.

### Écart docs ↔ code
`CLAUDE.md`/`DEVLOG.md` décrivent des features comme « vérifiées » qui sont en réalité **dormantes ou non câblées au runtime** (routes agents, chat, Live). Risque de surestimer la maturité. → ce dossier `docs/audit-2026-07-07/` sert de contre-poids factuel.

### Track EVM dans le repo
`packages/evm` + `packages/contracts` (Foundry) existent alors que `CLAUDE.md` verrouille « pas de smart contract / pas d'EVM pour ce hack ». Aucun lien runtime avec l'app XRPL, mais présence de code + submodules qui alourdit le repo et peut semer la confusion. → clarifier le statut (perp v2 assumé) ou isoler.

## Ce qui est sain (à préserver)

- **Séparation domaine pur / I/O** — `packages/core` sans effet de bord, testable.
- **SourceTag injecté serveur** — jamais fourni par le client (bonne sécurité).
- **Garde-fous agents durs côté serveur** — capital/perte/trades/levier + kill switch.
- **« Fail loud »** — config partielle → crash au boot (pas de demi-activation silencieuse).
- **Stubs explicites** — les stubs **lèvent** au lieu de simuler un faux succès (`throwAgentChatNotWired`, 501). Honnête et facile à repérer.
- **Persistance testée** — survie au redémarrage vérifiée, même batterie sur InMemory + SQLite.
