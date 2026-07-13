# Design — Badges off-chain + claim NFT on-chain (récompenses de trading)

**Date** : 2026-07-13
**Statut** : design validé (brainstorming), prêt pour plan d'implémentation.
**Branche cible** : à créer depuis `feat/roadmap-lots` (ou `main` une fois le lot agent commité).

## 1. Objectif

Donner aux utilisateurs (et aux agents IA) des **récompenses de trading** qui :
- peuplent la démo **gratuitement** (leaderboard/portfolio animés, 0 gas) ;
- offrent une **empreinte on-chain crédible** — un vrai NFT XLS-20 taggé Tide — **uniquement** quand un **humain réel** le réclame vers **son** wallet ;
- servent le funnel produit déjà verrouillé (foule Paper → conversion Live).

### Non-objectif (écarté explicitement)
- **Générer un wallet + envoyer un NFT par visiteur.** Écarté : coûte ~1,2 XRP de réserve verrouillée par wallet, nous rend custodial, et signe une **ferme de sybils** (tous fundés d'une source) — ça prouve l'inverse de « vrais users ».
- **Faux volume Live taggé généré par les agents pour gonfler le compteur d'attribution de l'orga.** Écarté : c'est du wash trading, repérable, risque de disqualification. Le « fake » de démo reste **paper / off-chain** (seeding légitime). Le SourceTag de swap n'est porté que par de **vrais** swaps.

## 2. Décisions verrouillées

| Axe | Décision | Raison |
|---|---|---|
| Défaut | **Badge off-chain** (image + ligne DB) pour tous | 0 gas, instantané, suffit à animer la démo |
| On-chain | **Vrai NFT XLS-20**, **réclamé par le user** (il signe) | preuve crédible + funnel Live + optique « on-chain rewards » |
| Mint | **On-demand au claim**, pas de pré-mint | 0 gas tant que personne ne réclame ; aucune réserve immobilisée |
| Transférabilité | **Soulbound** : mint SANS `tfTransferable`, SANS `TransferFee` | badge de mérite, pas un marché secondaire |
| Métadonnées | **Hébergées par Tide** (URL dans le champ `URI`) | lazy ; IPFS seulement si la décentralisation devient un critère |
| Mérite | **Dérivé** de l'état paper réel (fills, compétitions) | pas de système d'events à câbler ; on ne persiste que le *claim* |
| Activation feature | **OFF par défaut** (pas de clé issuer → route désactivée) | cohérent avec le câblage « activé par config » du projet |

## 3. Faits XLS-20 vérifiés (xrpl.org, 2026-07-13)

- Sans le flag `tfTransferable`, un NFT ne peut circuler qu'**entre l'issuer et un autre compte** (dans les deux sens) → l'issuer PEUT le distribuer à un user (offer/accept), mais le user ne peut pas le revendre. C'est notre soulbound.
- `TransferFee` **doit être absent** si `tfTransferable` n'est pas positionné (sinon la tx échoue). On ne met pas `TransferFee`.
- `NFTokenMint` **et** `NFTokenAcceptOffer` supportent le champ `SourceTag`. `NFTokenCreateOffer` aussi (champ commun).
- Transfert = flow **offer/accept** : l'issuer émet un `NFTokenCreateOffer` (sell, `tfSellToken`, `Amount: "0"`, `Destination: <wallet user>`) → le user émet `NFTokenAcceptOffer` (`NFTokenSellOffer: <offerID>`). Un sell offer avec `Destination` ne peut être accepté que par cette destination.
- Un mint réussi rend le NFT **détenu par le minter** (l'issuer) jusqu'au transfert.

**Réserves mainnet actuelles** (baisse déc. 2024) : base **1 XRP**, owner **0,2 XRP** par objet. Réserves *verrouillées, pas dépensées* (récupérables seulement en supprimant le compte).

Sources : [NFTokenMint](https://xrpl.org/docs/references/protocol/transactions/types/nftokenmint) · [NFTokenCreateOffer](https://xrpl.org/nftokencreateoffer.html) · [NFTokenAcceptOffer](https://xrpl.org/docs/references/protocol/transactions/types/nftokenacceptoffer) · [NFTs concept](https://xrpl.org/docs/concepts/tokens/nfts) · [Reserves](https://xrpl.org/docs/concepts/accounts/reserves)

## 4. Architecture

### 4.1 Flow

```
Off-chain (gratuit)                          On-chain (au claim, par le user)
─────────────────────                        ───────────────────────────────
Trades paper / compét  ──► badge "earned"    (dérivé de l'état paper)
   (user ou agent)          (dérivé)
                                │
UI portfolio : badge + bouton  │
"Claim on-chain" (si wallet    │
 connecté)                     ▼
                        POST /badges/:code/claim {userId, walletAddress}
                                │  1. re-vérifie le critère (serveur)
                                │  2. refuse si déjà claimed (idempotent)
                                │  3. issuer NFTokenMint (URI, taxon, soulbound, SourceTag)  ─► submit (F7)
                                │  4. issuer NFTokenCreateOffer (sell, Amount 0, Destination=user, SourceTag) ─► submit
                                │  5. persiste user_badges (nftTokenId, sellOfferId, status=offer_pending)
                                ▼
                        renvoie { sellOfferId, acceptTx }
                                │
UI : user signe NFTokenAcceptOffer via Xaman/Gem (SignModal, F12/F13)
                                ▼
                        NFT dans le wallet du user ; front confirme ─► status=claimed
```

### 4.2 Composants (réutilise l'existant)

**`packages/xrpl` — nouveau module `tx/nft.ts`** (patron : `tx/offer.ts`)
- `buildBadgeMint(params)` → `NFTokenMint` non signé : `URI` (hex de l'URL metadata), `NFTokenTaxon` (dérivé du code badge), `Flags` **sans** `tfTransferable`, **pas** de `TransferFee`, `SourceTag` (via `assertAttributionTag`). Valide l'adresse issuer.
- `buildBadgeSellOffer(params)` → `NFTokenCreateOffer` : `tfSellToken`, `Amount: "0"`, `Destination` (wallet user, `assertValidAddress`), `NFTokenID`, `SourceTag`.
- `buildBadgeAcceptOffer(params)` → `NFTokenAcceptOffer` : `NFTokenSellOffer: <offerID>`, `SourceTag` — c'est le tx que le **user** signe.
- Helpers de parsing des `meta.AffectedNodes` pour extraire `NFTokenID` (après mint) et l'offer id (après create-offer). Isolés + testés.

**`packages/xrpl` — compte issuer**
- L'issuer est le **compte opérateur Tide** (le même qui portera le multisig prize pool F6), **pas** un compte d'agent.
- Sa clé est chargée par config (env), chiffrée au repos via le même helper `@tide/mcp/crypto` (`readMasterKey` / `decryptPrivateKey`) que les comptes d'agents. Sans clé issuer configurée → la route claim répond « feature désactivée » (503) : OFF par défaut.
- Signature + soumission : matérialise le seed (patron `AgentXrplAccountService.decryptSeed`), `Wallet.fromSeed`, autofill/sign/submit via `XrplClient`, classification `engine_result` (F7).

**`apps/api` — service `BadgeService` + routes**
- Catalogue de badges = **constantes en code** (`badges/catalog.ts`), pas une table config. Chaque badge : `code`, `title`, `description`, `imageUrl`, `taxon`, prédicat de mérite `(paperState) => boolean`.
- `earnedFor(userId)` : dérive les badges mérités depuis les données paper existantes (fills, compétitions) — pas de nouvelle plomberie d'events.
- `claim(userId, walletAddress, code)` : re-vérifie le mérite serveur, idempotence, orchestre mint + sell-offer via `tx/nft.ts` + issuer, persiste.
- Store `BadgeClaimStore` (SQLite, patron des stores existants) : ne persiste **que les claims** (mérite = dérivé).
- Routes : `GET /accounts/:id/badges` (earned + claimed status), `POST /badges/:code/claim`, `POST /badges/:code/claim/confirm` (front confirme la signature → `status=claimed`).

**`apps/web`**
- `useBadges` (composable) : liste des badges (earned/claimed) via `@tide/client`.
- Affichage dans `PortfolioView` : grille de badges, état (earned / claim en cours / claimed on-chain, avec lien explorer).
- Bouton « Claim on-chain » (visible si `walletConnected`) → `POST claim` → `SignModal` (accept offer, Xaman/Gem) → `POST claim/confirm`.

**`@tide/client`** : `badges(userId)`, `claimBadge(userId, code, walletAddress)`, `confirmBadgeClaim(userId, code)`.

### 4.3 Catalogue initial (petit set)

| code | taxon | critère (dérivé) |
|---|---|---|
| `first_trade` | 1 | ≥ 1 fill paper |
| `ten_trades` | 2 | ≥ 10 fills paper |
| `first_competition` | 3 | a rejoint ≥ 1 compétition |
| `competition_winner` | 4 | rang 1 dans ≥ 1 compétition terminée |

### 4.4 Modèle de données (SQLite)

`badge_claims` :
- `user_id` TEXT
- `badge_code` TEXT
- `claimed_at` INTEGER (epoch ms)
- `nft_token_id` TEXT
- `sell_offer_id` TEXT
- `status` TEXT (`offer_pending` | `claimed`)
- `claim_tx_hash` TEXT NULL
- **UNIQUE(user_id, badge_code)** ← anti double-mint

Métadonnées NFT (hébergées par Tide) : `GET /nft-metadata/:code` → JSON `{ name, description, image, attributes }`. L'URL de cet endpoint (ou un asset statique) est encodée en hex dans le champ `URI` du mint.

## 5. Coût & sécurité

**Coût** : par claim, l'opérateur paye ~2 fees de tx négligeables (mint + create-offer). Le user paye l'owner reserve **0,2 XRP** + le fee d'accept, et l'activation **1 XRP seulement** s'il arrive avec un wallet vierge (rare — un Xaman/Gem connecté est déjà actif). **Zéro coût pour tout badge non réclamé.**

**Garde-fous** :
- Mérite **re-vérifié côté serveur** au claim (jamais confiance au front).
- Idempotence par `UNIQUE(user_id, badge_code)` → un badge = un mint max.
- `walletAddress` validée (`assertValidAddress`), `SourceTag` validé non nul (`assertAttributionTag`).
- Soulbound → pas de marché secondaire de badges.
- Pas de payout monétaire adossé aux badges → **aucune incitation économique** à farmer des comptes paper anonymes ; et chaque claim coûte au user, pas à nous.
- Feature OFF sans clé issuer (comme le reste du câblage Live).

## 6. Hors-scope / dette tracée

- **Parsing `AffectedNodes`** pour récupérer `NFTokenID` / `offerID` : à implémenter et tester soigneusement (source d'erreurs classiques). MVP acceptable si robuste.
- **Confirmation on-chain de l'accept** : MVP = le front confirme après une signature réussie (retour Xaman `signed`). Version dure = l'indexeur d'attribution détecte le `NFTokenAcceptOffer` (réutilise F4) avant de passer `status=claimed`.
- **Catalogue limité** (4 badges) : extensible en ajoutant une constante + un prédicat.
- **Metadata hébergée par Tide** (pas IPFS) : si la décentralisation devient un critère de jugement, migrer le `URI` vers IPFS.
- **Anti-sybil résiduel** : un user peut créer plusieurs identités paper anonymes et mériter les mêmes badges. Acceptable (pas de payout, coût de claim porté par le user). Durcissement futur : lier le mérite au wallet Live plutôt qu'à l'id paper anonyme.
- **Farming de badges par les agents** : un agent paper peut mériter des badges ; ils restent off-chain (0 gas) tant que personne ne les réclame on-chain.

## 7. Questions ouvertes (0 coût de trancher plus tard)

- Le `SourceTag` sur `NFTokenMint` / `NFTokenAcceptOffer` compte-t-il pour le **classement d'attribution de l'orga** (qui compte probablement le *volume de swap*, pas les NFT) ? À confirmer avec l'orga. On met le tag quoi qu'il arrive (0 coût).
- Compte issuer = réutilise-t-on le compte opérateur multisig (F6) ou un compte dédié aux NFT ? Défaut proposé : **le compte opérateur** (une clé de moins à gérer).
