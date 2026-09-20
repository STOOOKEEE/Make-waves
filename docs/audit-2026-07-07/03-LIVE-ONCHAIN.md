# 03 — Couche Live / on-chain (codée mais non prouvée) 🟡

> **Verdict : la chaîne d'exécution Live est entièrement codée, propre et bien pensée, mais elle est dormante par défaut, limitée à XRP/RLUSD, alimentée par des prix simulés, et n'a jamais été exécutée sur mainnet.**

## Ce qui est réellement codé (et bon)

### Chaîne d'exécution Live spot
```
Front (intention: base/side/qté/slippage — jamais de montants)
   │  DashboardView.vue → wallet.signLiveOffer()
   ▼
Client @tide/client
   │  signLiveOffer() → POST /sign/live-offer (Xaman)
   │  planLiveOffer() → POST /exec/plan        (GemWallet)
   ▼
Serveur  apps/api/src/exec/plan-live.ts
   │  planExecution() (best exec AMM vs carnet, borne slippage)
   ▼
Builder taggé  packages/xrpl/src/tx/offer.ts
   └─ { OfferCreate, Account, TakerGets, TakerPays, SourceTag }
```

- **Best execution + slippage** — `packages/xrpl/src/exec/route.ts` (`planExecution`) : compare AMM vs carnet, borne le slippage, arrondi drops en faveur de l'utilisateur, sérialisation IOU 15 chiffres sans notation scientifique.
- **SourceTag** — injecté **côté serveur** (jamais par le client), validé non-nul via `packages/xrpl/src/tx/source-tag.ts` (`assertAttributionTag`). Bonne posture sécurité.
- **Indexeur d'attribution** — `apps/api/src/indexer/indexer.ts` (`AttributionIndexer`) : fenêtre de ledger figée (anti double-comptage / anti-miss), dédup par hash. Réel et bien conçu.
- **Multisig prize pool** — `packages/xrpl/src/tx/multisig.ts` (`buildSignerListSet`) : codé et testé.
- **Moteur de volume** — `packages/xrpl/src/volume/engine.ts` (`planVolumeTrade`) : garde-fous durs, refuse edge négatif, OFF par défaut.
- **Wallets** — GemWallet (`@gemwallet/api`, front, `submitTransaction`) et Xaman (`xumm-sdk`, serveur, `payload.create/get`) : **vraies intégrations non-custodiales**, pas des stubs.

## Ce qui manque pour un swap mainnet réel ⛔

| # | Manque | Preuve code |
|---|--------|-------------|
| 1 | **Prix AMM & carnet simulés** — `plan-live.ts` alimente `ammPrice` ET `bookPrice` avec `deps.getPrices()[base]` (feed CoinGecko/CEX). Aucune vraie lecture `book_offers`/AMM on-chain dans le plan Live. | `apps/api/src/exec/plan-live.ts` |
| 2 | **`ONCHAIN_POOLS = {}` vide et hardcodé** — le provider de prix on-chain n'est **jamais** instancié sans éditer le code (pas une env). | `apps/api/src/main.ts:64,115-118` |
| 3 | **Pas de soumission serveur** — le backend ne soumet jamais l'`OfferCreate` ; le remplissage passe par le wallet. La boucle « swap taggé → compteur » n'est pas prouvée end-to-end. | `packages/xrpl/src/client/xrpl-client.ts` (`submit` existe mais non utilisé pour le Live) |
| 4 | **Live limité à XRP/RLUSD** — tout autre actif → `LiveExecError`. Le front le reflète (`liveTradable()` = `XRP && liveConfigured()`). | `plan-live.ts` (`NATIVE_BASE = "XRP"`) |
| 5 | **Issuer RLUSD mainnet en dur** — `RLUSD_MAINNET_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De"`. Pas de notion testnet/mainnet dans le code. | `plan-live.ts:35,39` |
| 6 | **Buy-in on-chain sans UI** — `/sign/buy-in` (`client.signBuyIn`) existe mais **aucune vue front ne l'appelle** ; `CompetitionView` fait un join **paper**. | `apps/web/src/views/CompetitionView.vue` |
| 7 | **Multisig & moteur de volume non câblés** — builders présents mais jamais appelés dans `apps/api` ni exposés en route/UI. | `packages/xrpl/src/tx/multisig.ts`, `.../volume/engine.ts` |

## Activation (tout est gated par config)

- `/exec/plan` et `/sign/live-offer` ne sont montées **que si** `TIDE_SOURCE_TAG` est défini (quote RLUSD mainnet par défaut).
- `/sign/*` ne sont montées **que si** `XUMM_API_KEY` + `XUMM_API_SECRET` (+ SourceTag + prize pool).
- Sans clés → `useWallet` capte le 404 et affiche « Mode Live non configuré côté serveur ».

## Le trou testnet ⚠️

Il n'y a **aucune notion de réseau (testnet/mainnet)** dans le code — seul `XRPL_WSS_URL` détermine le réseau. Mais l'issuer RLUSD est **mainnet en dur**. Pour tester sur testnet il faut :
1. pointer `XRPL_WSS_URL` sur un nœud testnet, **et**
2. surcharger `TIDE_RLUSD_ISSUER` avec un émetteur testnet (sinon on signe des offres contre un issuer mainnet inexistant sur testnet).

## Conclusion

L'ingénierie est là et de qualité (bornage slippage, SourceTag serveur, indexeur robuste). Mais **entre « le moteur produit un `OfferCreate` correct » et « un swap réel taggé remplit on-chain et incrémente le compteur orga », il reste un vrai chemin non parcouru** : câbler des prix on-chain réels, exécuter le spike de signature+remplissage sur mainnet, et brancher l'attribution. Voir [06-CHECKLIST-MAINNET.md](06-CHECKLIST-MAINNET.md).
