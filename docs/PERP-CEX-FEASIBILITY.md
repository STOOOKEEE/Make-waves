# Faisabilité — Perp "comme un CEX" sur XRP

> Évaluation honnête : construire un perp (futures perpétuels à levier) en mode **CEX custodial**, où XRPL n'est qu'un rail de dépôt/retrait et où tout le moteur perp (matching, marge, liquidation, funding, mark price, règlement) tourne **off-chain** dans notre backend. Alternative au Tide spot-only, motivée par l'envie de "vrai trading" à levier/short.
> Contexte vérifié (juin 2026) : pas de smart contracts XRPL mainnet ; lending natif XLS-66 en vote (pas activé, et non-collatéralisé institutionnel) ; oracle XLS-47, AMM/DEX, Escrow, RLUSD = mainnet.

## Verdict

**Techniquement faisable — parce que ce n'est PAS un projet XRPL : c'est un mini-BitMEX off-chain où XRPL n'est qu'un rail de dépôt interchangeable.** Mais les bloqueurs décisifs ne sont pas techniques (custody, réglementaire, risque de maison, et surtout : ça tue le hackathon), et le cœur dangereux (risk/liquidation engine) est exactement ce qu'on ne peut ni couper ni construire sans risque en 90 jours. **Fortement déconseillé pour ce contexte.**

## Décomposition & faisabilité par brique

Un perp-CEX ≈ 10 briques, toutes du **backend d'exchange** — aucune n'a besoin d'XRPL sauf le dépôt/retrait.

| Brique | Faisable ? | Avec quoi / difficulté réelle |
|---|---|---|
| Moteur de **matching** (orderbook) | ✅ | Backend (Node/Rust), orderbook in-memory pour le MVP. Pas le problème. |
| Mark price / **index** | ✅ | **Pas** l'oracle on-chain XLS-47 (manipulable, trop lent pour liquider). Index multi-CEX (Binance/Bybit/OKX) en websockets. |
| Moteur de **marge** (cross/isolated) | ✅ tech / ⚠️ dur | Suivi equity + maintenance margin par compte. « Juste du backend » mais zéro droit à l'erreur. |
| Moteur de **liquidation** | ✅ tech / ❌ **dangereux** | **Le cœur qui perd du vrai argent.** Surveiller, force-close au bon prix, gérer la cascade en vol. Bug = bankruptcies non couvertes. |
| **Funding rate** | ✅ tech / ⚠️ | Premium perp-index + paiements périodiques longs↔shorts. |
| **Insurance fund / ADL** | ✅ tech / ⚠️ | Filet quand une liquidation ne couvre pas. Design délicat. |
| **Risk engine maison** (B-book) | ✅ tech / ❌ **mortel financièrement** | On est la contrepartie → on mange le PnL agrégé. Il FAUT hedger l'expo nette sur un CEX externe, sinon on saute. |
| **Custody** des dépôts | ✅ tech / ❌ risque | Hot/cold wallets XRPL → **honeypot**. Sécu opérationnelle = métier à part. |
| Dépôt/retrait | ✅ | `xrpl.js` : `Payment` RLUSD/XRP, scan ledger, withdrawal queue. **La seule vraie partie XRPL, et elle est triviale.** |
| **KYC / AML** | ⚠️/❌ | Légalement requis pour un venue de dérivés. Et sans licence, illégal dans la plupart des juridictions. |

## Bloqueurs décisifs (les vrais ne sont PAS techniques)

1. **🔴 Ça défonce le hackathon.** Les trades perp sont off-chain → **aucun `SourceTag`**. Le compteur on-chain de Make Waves ne verrait que les `Payment` de dépôt/retrait. **3 prix sur 4 = morts.** On construirait un produit qui, par design, ne peut pas gagner le concours pour lequel on le construit.
2. **🔴 XRPL ne sert à rien ici.** Le perp étant off-chain, le rail de dépôt pourrait être Solana, une EVM, ou du fiat — **identique**. Chaîne interchangeable = ce n'est pas un projet de cette chaîne.
3. **🔴 Réglementaire.** Opérer un exchange de dérivés à levier = activité **régulée** (CFTC, MiFID II…). Sans licence, illégal quasi partout. Exposition légale sérieuse pour un projet étudiant qui détient des fonds réels.
4. **🔴 On est la maison.** B-book = on parie contre les users → hedge parfait requis (infra + capital), sinon on saute. A-book (matched) = problème de liquidité des deux côtés sur un venue naissant.
5. **🟠 Contradiction de branding.** « Apprends sans te faire rekt » + levier custodial pour débutants = machine à liquidation.

## Stack (si on le faisait quand même)

- **Hot path** (matching + risk/liquidation) : Rust ou Node+TS, état mémoire + **Redis**, persistance **Postgres**.
- **Index/mark price** : agrégat websockets Binance/Bybit/OKX (`ccxt` ou WS bruts).
- **Hedging du book maison** : `ccxt` → Binance/Bybit futures.
- **XRPL** : `xrpl.js` (dépôts/retraits, scan ledger) — seule brique XRPL, triviale.
- **Front** : Vue/Nuxt — terminal avec levier.
- **KYC** : Sumsub/Onfido. **Licence** : le vrai bloqueur.
- **Diaso** (bot MM) réutilisable comme market maker interne pour amorcer un A-book — le seul endroit où l'existant aide.

## Scope MVP — pourquoi il n'existe pas de MVP « safe »

On **ne peut pas couper le cœur dangereux** : un perp sans liquidation/risk engine n'est pas un perp. Même le MVP minimal exige matching + marge + **liquidation** + index + custody + dépôt/retrait. Les exchanges ont des équipes entières sur des années pour rendre le risk engine sûr. En 90 jours → un jouet qui **perd du vrai argent au premier jour de vol**.

## Recommandation

**Faisable ≠ bonne idée — c'est un piège quasi-parfait pour ce contexte.** Risque maximal (technique : risk engine ; financier : on est la maison ; légal : venue régulé ; opérationnel : honeypot) pour un produit qui **ne compte pas dans le hackathon** et **n'a rien d'XRPL**. Deux routes propres, pas trois :

1. **Make Waves** → assumer le **spot non-custodial**, le rendre bon (scoring risk-adjusted + memecoins volatils). Expédiable, ça compte, honnête.
2. **Produit perp** → **autre chaîne, autre moment**, en **DEX** (forker une infra type GMX/Hyperliquid-like, trustless, non-custodial). Hors de ce hackathon.

Le mini-BitMEX custodial sur XRP n'est aucune des deux : le pire des deux mondes.
