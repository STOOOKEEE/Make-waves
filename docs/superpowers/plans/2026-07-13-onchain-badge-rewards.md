# Badges + NFT claim — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Badges de trading gagnés off-chain (gratuit) que l'utilisateur peut réclamer en NFT XLS-20 soulbound taggé, minté on-demand par l'issuer serveur et accepté (signé) par le user.

**Architecture:** Builders XLS-20 purs dans `@tide/xrpl` ; mint serveur derrière une interface `NftIssuer` injectable (concret = `xrpl` `Client` + issuer wallet, fake en test) ; `BadgeService` dérive le mérite de l'état paper et orchestre le claim ; routes Fastify gated (OFF sans clé issuer) ; front `useBadges` + grille dans `PortfolioView` + signature de l'accept via le wallet existant.

**Tech Stack:** TS strict, `xrpl` (XLS-20), `node:sqlite` (`DatabaseSync`), Fastify (`inject()`), Vitest, Vue 3.

## Global Constraints

- TS strict, **jamais `as any`** ni `: any` (lint `no-explicit-any` = erreur). `unknown` puis narrow.
- Pas de valeur magique (constantes nommées), pas de duplication.
- Valider toute entrée critique (adresse via `assertValidAddress`, SourceTag via `assertAttributionTag`).
- Secrets hors repo ; issuer seed via env, feature **OFF par défaut** (absente → route 503).
- Un module = une responsabilité. Commits fréquents (1 par tâche).
- Pas de `Co-Authored-By` ni mention Claude dans les commits.
- Soulbound : mint SANS `tfTransferable`, SANS `TransferFee` (sinon tx rejetée).

---

### Task 1: Builders XLS-20 purs (`@tide/xrpl` `tx/nft.ts`)

**Files:**
- Create: `packages/xrpl/src/tx/nft.ts`
- Modify: `packages/xrpl/src/index.ts` (re-export)
- Test: `packages/xrpl/test/nft.test.ts`

**Interfaces produites:**
- `buildBadgeMint(p: { issuer: string; uri: string; taxon: number; sourceTag: number }): NFTokenMint`
- `buildBadgeSellOffer(p: { issuer: string; nftTokenId: string; destination: string; sourceTag: number }): NFTokenCreateOffer`
- `buildBadgeAcceptOffer(p: { account: string; sellOfferId: string; sourceTag: number }): NFTokenAcceptOffer`
- `readMintedNftId(meta: unknown): string` / `readOfferId(meta: unknown): string` — lisent `meta.nftoken_id` / `meta.offer_id` (champs rippled), throw si absents.

**Détails:**
- `uri` encodé hex (helper `convertStringToHex` de `xrpl`).
- Mint : `Flags` omis/0 (soulbound), pas de `TransferFee`, `NFTokenTaxon: taxon`, `SourceTag`. Valider `issuer` (`assertValidAddress`), `taxon` entier ≥0, `sourceTag` (`assertAttributionTag`).
- Sell offer : `Flags: NFTokenCreateOfferFlags.tfSellNFToken` (ou `1`), `Amount: "0"`, `NFTokenID`, `Destination`, `SourceTag`. Valider `destination` + `sourceTag`.
- Accept : `NFTokenSellOffer: sellOfferId`, `SourceTag`. Valider `account` + `sourceTag`.

- [ ] Step 1: test — `buildBadgeMint` valide n'a pas `Flags` transferable ni `TransferFee`, a `SourceTag`, `NFTokenTaxon`, `URI` hex ; throw sur issuer invalide et sourceTag 0.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implémenter les 3 builders + 2 readers.
- [ ] Step 4: tests offer/accept (shape + validation) + `readMintedNftId`/`readOfferId` (objet `{nftoken_id}` / `{offer_id}` → valeur ; throw si absent).
- [ ] Step 5: run → PASS ; export dans `index.ts`.
- [ ] Step 6: commit `feat(xrpl): builders XLS-20 badges (mint/offer/accept) + readers meta`.

---

### Task 2: Issuer minter serveur (`@tide/xrpl` `nft/issuer.ts`)

**Files:**
- Create: `packages/xrpl/src/nft/issuer.ts`
- Modify: `packages/xrpl/src/index.ts`
- Test: `packages/xrpl/test/nft-issuer.test.ts` (uniquement le mapping ; PAS le réseau)

**Interfaces produites:**
- `interface NftIssuer { issueBadge(p: { uri: string; taxon: number; destination: string }): Promise<NftIssueResult> }`
- `interface NftIssueResult { nftTokenId: string; sellOfferId: string; mintHash: string; offerHash: string }`
- `class XrplNftIssuer implements NftIssuer` — `constructor(deps: { serverUrl: string; issuerSeed: string; sourceTag: number })`. Utilise `xrpl` `Client` + `Wallet.fromSeed` : `connect` → `autofill(buildBadgeMint(...))` → `wallet.sign` → `submitAndWait` → `readMintedNftId(meta)` → idem create-offer → `readOfferId(meta)`. Ferme la connexion (`disconnect`) en `finally`.

**Détails:**
- L'issuer address = `Wallet.fromSeed(seed).classicAddress`.
- Réseau non testé unitairement (pas de nœud). Garder la classe **fine** ; toute logique parsable (readers) est dans Task 1 et testée là. `NftIssuer` est l'unique boundary réseau injectée dans `BadgeService`.
- ponytail : `submitAndWait` de `xrpl` fait autofill+attente ; on ne réimplémente rien. `// ponytail: xrpl Client direct pour le mint issuer (pas de helper seed dans le wrapper read-only)`.

- [ ] Step 1: test mapping — instancier `XrplNftIssuer` avec un `Client` factice (injecté) qui renvoie des meta `{nftoken_id, offer_id}` → `issueBadge` renvoie le `NftIssueResult` attendu. (Rendre le `Client` injectable via un param optionnel `clientFactory` pour tester sans réseau.)
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implémenter `XrplNftIssuer` (clientFactory injectable, défaut `new Client(serverUrl)`).
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `feat(xrpl): XrplNftIssuer (mint+offer on-demand, meta ids)`.

---

### Task 3: Catalogue + dérivation du mérite (`apps/api` `badges/`)

**Files:**
- Create: `apps/api/src/badges/catalog.ts`, `apps/api/src/badges/merit.ts`
- Test: `apps/api/test/badge-merit.test.ts`

**Interfaces produites:**
- `interface BadgeDef { code: string; title: string; description: string; imageUrl: string; taxon: number }`
- `const BADGE_CATALOG: readonly BadgeDef[]` — 3 badges : `first_trade` (taxon 1), `ten_trades` (taxon 2), `first_competition` (taxon 3).
- `interface BadgeActivity { fillCount: number; competitionCount: number }`
- `earnedCodes(a: BadgeActivity): string[]` — `first_trade` si `fillCount>=1`, `ten_trades` si `fillCount>=10`, `first_competition` si `competitionCount>=1`.
- Constantes seuils nommées (`TEN_TRADES_THRESHOLD = 10`).

- [ ] Step 1: test `earnedCodes` — 0 fill → [] ; 1 fill → [first_trade] ; 10 fills → [first_trade, ten_trades] ; +1 compét → +first_competition.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implémenter catalog + merit.
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `feat(api): catalogue badges + dérivation mérite (paper-derived)`.

*Note : `competition_winner` reporté (pas de vainqueur persisté aujourd'hui ; cf. spec §6).*

---

### Task 4: Store des claims (`apps/api` InMemory + SQLite + migration)

**Files:**
- Create: `apps/api/src/store/badge-store.ts` (interface + `InMemoryBadgeStore`), `apps/api/src/store/sqlite-badge-store.ts`, `apps/api/src/store/migrations/2026-07-13-badge-tables.ts`
- Modify: `apps/api/src/main.ts` (appeler `migrateBadgeTables(db)` au boot, à côté de `migrateAgentTables`)
- Test: `apps/api/test/badge-store.test.ts`

**Interfaces produites:**
- `interface BadgeClaim { userId: string; badgeCode: string; claimedAt: number; nftTokenId: string; sellOfferId: string; status: "offer_pending" | "claimed"; claimTxHash: string | null }`
- `interface BadgeStore { get(userId: string, code: string): BadgeClaim | null; listByUser(userId: string): BadgeClaim[]; create(c: BadgeClaim): void; markClaimed(userId: string, code: string, txHash: string | null): void }`
- `class InMemoryBadgeStore implements BadgeStore`, `class SqliteBadgeStore implements BadgeStore` (`constructor(db: DatabaseSync)`), `function migrateBadgeTables(db: DatabaseSync): void`.
- Table `badge_claims (user_id TEXT, badge_code TEXT, claimed_at INTEGER, nft_token_id TEXT, sell_offer_id TEXT, status TEXT, claim_tx_hash TEXT, PRIMARY KEY(user_id, badge_code))` — la PK compose l'idempotence.

- [ ] Step 1: test InMemory — create + get + listByUser + markClaimed(status→claimed) ; create doublon (même user+code) throw `BadgeAlreadyClaimedError`.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implémenter interface + InMemory + erreur.
- [ ] Step 4: test SQLite (via `openDatabase(":memory:")` + `migrateBadgeTables`) — même contrat + la PK rejette le doublon.
- [ ] Step 5: implémenter `migrateBadgeTables` + `SqliteBadgeStore` (mirror `SqliteMandateStore`).
- [ ] Step 6: run → PASS ; câbler `migrateBadgeTables(db)` dans `main.ts`.
- [ ] Step 7: commit `feat(api): BadgeStore (InMemory+SQLite) + migration badge_claims`.

---

### Task 5: `BadgeService` (mérite + claim orchestré)

**Files:**
- Create: `apps/api/src/services/badge-service.ts`
- Test: `apps/api/test/badge-service.test.ts`

**Interfaces consommées:** `PaperService.ordersOf(userId): readonly Fill[]`, `CompetitionService.participants(id): string[]` + `.list()`, `BadgeStore`, `NftIssuer`, `earnedCodes`, `BADGE_CATALOG`.

**Interfaces produites:**
- `interface BadgeStatus { code: string; title: string; description: string; imageUrl: string; earned: boolean; status: "unclaimed" | "offer_pending" | "claimed"; nftTokenId: string | null }`
- `class BadgeService` — `constructor(deps: { paper: PaperService; competition: CompetitionService; store: BadgeStore; issuer: NftIssuer; sourceTag: number; metadataBaseUrl: string })`
  - `statusFor(userId: string): BadgeStatus[]` — dérive mérite (fillCount = `paper.ordersOf(userId).length` ; competitionCount = nb de compétitions dont `participants` inclut userId) + join claims.
  - `claim(userId: string, walletAddress: string, code: string): Promise<{ sellOfferId: string; nftTokenId: string }>` — valide `walletAddress` ; 404 si code inconnu ; 400 si non mérité ; `BadgeAlreadyClaimedError` si déjà en store ; `uri = ${metadataBaseUrl}/nft-metadata/${code}` ; `issuer.issueBadge({uri, taxon, destination: walletAddress})` ; `store.create({... status:"offer_pending", claimTxHash:null})`.
  - `confirmClaim(userId: string, code: string, txHash: string | null): void` — `store.markClaimed`.

- [ ] Step 1: test `statusFor` avec `FakePaper`/`FakeCompetition`/`InMemoryBadgeStore` — user 1 fill → first_trade earned/unclaimed ; après `claim` → status offer_pending + nftTokenId ; après `confirmClaim` → claimed. `FakeNftIssuer` renvoie ids fixes.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implémenter `BadgeService`.
- [ ] Step 4: test erreurs — claim non mérité throw ; code inconnu throw ; double claim throw ; adresse invalide throw.
- [ ] Step 5: run → PASS.
- [ ] Step 6: commit `feat(api): BadgeService (statut dérivé + claim mint/offer + confirm)`.

---

### Task 6: Env + routes + wiring `main.ts`

**Files:**
- Modify: `apps/api/src/config/env.ts` (readers), `apps/api/src/http/server.ts` (ServerDeps + bloc gated), `apps/api/src/main.ts` (construction + threading via `createApp`)
- Test: `apps/api/test/badge-routes.test.ts`

**Env (mirror `readLlmBaseUrl`/`readPrizePoolAddress`):**
- `readNftIssuerSeed(): string | undefined` — `optional("TIDE_NFT_ISSUER_SEED")`, throw si présent mais ne matche pas `^s[1-9A-HJ-NP-Za-km-z]{25,}$` (format seed base58).
- `readPublicBaseUrl(): string` — `optional("TIDE_PUBLIC_BASE_URL") ?? "http://localhost:3000"` (base des URI de metadata).

**Routes (bloc `if (deps.badgeService !== undefined)`), sinon absentes → 404/503 :**
- `GET /accounts/:userId/badges` → `badgeSvc.statusFor(userId)` (200).
- `POST /badges/:code/claim` body `{ userId, walletAddress }` → `badgeSvc.claim(...)` (200 `{sellOfferId, nftTokenId}`).
- `POST /badges/:code/claim/confirm` body `{ userId, txHash? }` → `confirmClaim` (200).
- `GET /nft-metadata/:code` → JSON `{ name, description, image, attributes:[{trait_type:"badge", value:code}] }` depuis `BADGE_CATALOG` (200 ; 404 si code inconnu). **Non gated** (statique, utile même sans issuer).

**main.ts :** si `readNftIssuerSeed()` défini ET `XRPL_WSS_URL` défini → construire `new XrplNftIssuer({serverUrl, issuerSeed, sourceTag})` + `new SqliteBadgeStore(db)` + `new BadgeService({...})` et le passer à `createApp`. Sinon `badgeService` = undefined (routes claim absentes ; `/nft-metadata` reste).

- [ ] Step 1: test routes via `buildServer({..., badgeService})` + `inject()` avec `FakeNftIssuer` : GET badges 200 ; POST claim 200 + body ; POST confirm 200 ; GET /nft-metadata/first_trade 200 JSON ; POST claim d'un badge non mérité → 400.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: env readers + `ServerDeps.badgeService?: BadgeService` + bloc routes + `/nft-metadata`.
- [ ] Step 4: run → PASS ; wiring `main.ts` (gated).
- [ ] Step 5: commit `feat(api): routes badges/claim/confirm/metadata + env issuer + wiring`.

---

### Task 7: `@tide/client`

**Files:**
- Modify: `packages/client/src/client.ts`
- Test: `packages/client/test/client.test.ts` (si suite existe ; sinon typecheck)

**Interfaces produites (mirror `mandates`/`createMandate`, helper `call<T>` + `path(...)`):**
- `interface BadgeDto { code: string; title: string; description: string; imageUrl: string; earned: boolean; status: "unclaimed"|"offer_pending"|"claimed"; nftTokenId: string | null }`
- `badges(userId: string): Promise<BadgeDto[]>` → `GET /accounts/:userId/badges` (200).
- `claimBadge(userId: string, code: string, walletAddress: string): Promise<{ sellOfferId: string; nftTokenId: string }>` → `POST /badges/:code/claim` (200).
- `confirmBadgeClaim(userId: string, code: string, txHash?: string): Promise<void>` → `POST /badges/:code/claim/confirm` (200).

- [ ] Step 1: test (transport factice) `badges` GET path + `claimBadge` POST body.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implémenter + DTO.
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `feat(client): badges/claimBadge/confirmBadgeClaim`.

---

### Task 8: Front — `useBadges` + grille `PortfolioView` + claim signé

**Files:**
- Create: `apps/web/src/composables/useBadges.ts`
- Modify: `apps/web/src/views/PortfolioView.vue`
- Test: `apps/web/test/useBadges.test.ts`

**Flow claim (réutilise `useWallet`/`SignModal`, F12/F13) :**
1. bouton « Claim » (visible si `walletConnected`) → `client.claimBadge(userId, code, liveAddress)` → `{ sellOfferId }`.
2. `buildBadgeAcceptOffer({ account: liveAddress, sellOfferId, sourceTag })` → signer via le wallet (Xaman/GemWallet) — **inspecter `SignModal`/`useWallet` à l'exécution** pour la forme exacte du payload d'un tx générique.
3. sur succès → `client.confirmBadgeClaim(userId, code, txHash)` → recharger `badges`.

**Interfaces produites:** `useBadges(client)` → `{ badges: Ref<BadgeDto[]>, loading, error, load(userId), claim(code, walletAddress) }`.

- [ ] Step 1: test `useBadges` (client factice) — `load` remplit `badges` ; `claim` appelle `claimBadge` puis `confirmBadgeClaim` (mock du sign).
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implémenter `useBadges` (isole l'étape signature derrière un callback injecté pour testabilité).
- [ ] Step 4: câbler la grille badges dans `PortfolioView` (`<div class="card">` après les holdings) + bouton claim → `SignModal`.
- [ ] Step 5: run tests + `pnpm --filter @tide/web build`.
- [ ] Step 6: commit `feat(web): grille badges + claim NFT signé dans Portfolio`.

---

## Self-Review

**Spec coverage :** badge off-chain gratuit (Task 3 mérite dérivé, aucun gas) ✓ ; NFT soulbound on-demand (Task 1 flags + Task 2 mint) ✓ ; claim signé par le user (Task 8) ✓ ; SourceTag (Task 1) ✓ ; mérite dérivé, seul le claim persisté (Task 4/5) ✓ ; idempotence PK (Task 4) ✓ ; OFF sans issuer (Task 6) ✓ ; metadata hébergée (Task 6 `/nft-metadata`) ✓. `competition_winner` volontairement reporté (spec §6, pas de source).

**Placeholders :** aucun step sans code/interface ; readers meta concrets (`meta.nftoken_id`).

**Type consistency :** `NftIssueResult.nftTokenId`/`sellOfferId` (T2) = `BadgeClaim.nftTokenId`/`sellOfferId` (T4) = `BadgeStatus.nftTokenId` (T5) = `BadgeDto.nftTokenId` (T7). `earnedCodes`/`BadgeActivity` (T3) consommés par `BadgeService.statusFor` (T5). `status` enum aligné T4/T5/T7.

**Dette (spec §6) :** parsing `AffectedNodes` évité au profit de `meta.nftoken_id`/`offer_id` (fallback parser à ajouter si un nœud ne les renvoie pas) ; confirmation on-chain de l'accept = confiance au retour de signature (MVP), durcissement via indexeur F4 plus tard.
