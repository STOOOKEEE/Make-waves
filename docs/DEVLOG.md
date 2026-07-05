# DEVLOG — Tide

Historique daté, append-only. Format par entrée : **Quoi / Pourquoi / Cheminement / Bugs & fix**.

---

## 2026-07-06 — AI Agent : `get_markets` + `get_history` + `get_orderbook` MCP tools [Tâche 12/33]

**Quoi.** Les 3 outils MCP marché restants, calquis sur le pattern de `get_market` (Tâche 11) : `get_markets(limit?)` (top N, clampé `[1, 250]`, défaut 100) ; `get_history({symbol, interval, limit?})` (OHLC, interval validé par type guard, limit clampé `[10, 500]`, défaut 120) ; `get_orderbook({symbol})` (depth bids/asks, `null` → `MARKET_ERROR`). **611/611** (+11 vs 600), typecheck vert. Helper interne `clampLimit` (gère `NaN`/`Infinity` + `Math.trunc`) et `isInterval` (type guard sur `Set<string>`) extraits pour rester typé strict.

**Pourquoi.** Un agent a besoin de **voir avant d'agir** : top markets pour la discovery, historique OHLC pour raisonner sur la tendance, carnet pour la microstructure. Ces 3 outils complètent la trousse de lecture ; les outils d'ordre (Tâches 14+) introduiront les **garde-fous durs** (capital max, perte max / jour, max trades / jour, max levier, kill switch) — ici on est lecture-seule, pas de garde à appliquer.

**Cheminement (3 écarts au brief, tous défendables — identiques à Tâche 11).**
- **`(ctx as any).priceFeed.X(...)` retiré.** Le brief utilisait ce cast pour atteindre le feed — violation de la convention « jamais `as any` » (cf. `~/.claude/CLAUDE.md`). Refacto : `McpContext.priceFeed: PriceFeed` était déjà en place (Tâche 11), le tool accède maintenant à `ctx.priceFeed.markets/history/orderbook` typé naturellement. **0 cast de type** dans le livrable.
- **`INTERVALS.includes(interval as never)` retiré.** Le cast `as never` laideur caché sous un `Array.includes` sur tuple readonly. Refacto : `INTERVALS = [...] as const` + `INTERVALS_SET = new Set<string>(INTERVALS)` + `isInterval(s): s is Interval` — type narrowing sans cast, et runtime rapide (Set lookup O(1), pas scan).
- **`Number(args["limit"])` non protégé.** Le brief faisait `Number(args["limit"] ?? N)` puis `Math.min(Math.max(..., MIN), MAX)` — mais `Number("foo") = NaN` (NaN passe `Math.min/max` → propagé → bug silencieux au LLM qui envoie une string), `Number(3.7) = 3.7` (3.7 bougies = nonsense). Refacto : `clampLimit(raw, fallback, min, max)` centralisé, `Number.isFinite` + `Math.trunc`.
- **11 tests au lieu de 3** (le brief en demandait 3 minimum). Couverture ajoutée : clamp de limit (haut + bas + défaut) sur `get_markets`, symbole invalide + interval invalide + `McpError` instance + forwarding symbol/interval au feed + clamp limit sur `get_history`, symbole invalide + livre absent sur `get_orderbook`. Verrouille les contrats implicites.

**Modifications collatérales (3 fichiers mis à jour, conséquence additive obligatoire).**
- **`PriceFeed.markets(limit)`** ajouté dans `src/types.ts` + type `MarketRow` exporté. `history` et `orderbook` existaient déjà depuis Tâche 7 (le brief les supposait ajoutés, ils étaient déjà là).
- L'extension additive de `PriceFeed` oblige à **compléter les stubs partiels** : `bin/tide-mcp.ts` (bootstrap throw-loud), `test/context.test.ts` (fake no-op), `test/tools-market.test.ts` (`makePriceFeed`). Sans ces ajouts, typecheck échouait (l'interface exige 4 méthodes). Fait en suivant le pattern établi Tâche 11 (`priceFeed` lui-même avait dû être ajouté partout quand `McpContext` l'avait adopté).

**Bugs & fix.** Aucun (impl + tests verts dès le premier jet, modulo les 4 écarts documentés ci-dessus). Lint : 5 erreurs **pré-existantes** inchangées (4 dans stores SQLite Tâche 3, 1 dans `guard.test.ts`) — vérifié **0 nouveau** de mon fait via diff pré-commit. Dette tracée : `bin/tide-mcp.ts` stub le `PriceFeed` avec un throw loud (volontaire, le câblage runtime arrive en Tâche 13+) ; `INTERVALS` codé en dur ici mais **pas de duplication** côté front pour l'instant (à surveiller si DashboardView expose des timeframes).

**Suite logique.** Tâche 13 : câblage runtime `loadContext` ← vrais stores (`@tide/api` exposera un `PriceFeed` concret branché sur CoinGecko + Binance klines + book-offers). Les 4 outils marché (Tâches 11+12) sont **prêts sans modification** — il suffira de passer le vrai `PriceFeed` à `startMcpServer`. Les outils d'ordre (Tâches 14+) introduiront les garde-fous durs, qui ne s'appliquent pas ici.

---

## 2026-07-06 — AI Agent : AgentService + MandateService (logique métier) [Tâche 4/33]

**Quoi.** Couche service au-dessus des stores (Tâche 3). `AgentService` (create/get/listByUser/kill/delete) orchestre `AgentStore` + `MandateStore` — le kill d'un agent révoque automatiquement ses mandats actifs. `MandateService` (create/getActiveForAgent/onSignCallback/revoke) orchestre `MandateStore` + une surface `MandateXamanApi` stubbée (l'intégration Xaman réelle arrive plus tard). `onSignCallback` refuse tout mandat non-`pending` via `MandateInvalidError`. 3 nouvelles erreurs typées (`AgentAlreadyExistsError`, `MandateAlreadyExistsError`, `MandateInvalidError`) dans `services/errors.ts` ; `MandateNotFoundError` déjà fourni par le store. **558/558** (+8 vs 550), typecheck vert.

**Pourquoi.** La couche service isole la logique métier du transport HTTP et des effets de bord (SSE) — pure orchestration store, constructeur sans I/O, méthodes async. Sépare clairement « ce que fait l'app » de « comment c'est branché ». Le kill avec révocation des mandats actifs est la première garantie métier transversale : un agent tué ne peut plus rien trader, même si un mandat signé traîne en base.

**Cheminement.**
- Pattern repris de `PaperService` (constructeur injecte les stores, defaults `InMemory`, pas d'I/O).
- Brief du plan respecté quasi verbatim, avec 5 tests au lieu de 4 sur `MandateService` (ajout du cas « refuse si non-pending » pour blinder le contrat).
- Pas de SSE dans `kill()` : volontairement laissé pour la Tâche 18. Le service retourne juste l'agent mis à jour.
- `MandateXamanApi` = interface locale (2 méthodes), stub `fakeXaman` dans les tests. Pas d'import de `@tide/xrpl` ici — l'intégration concrète est une tâche ultérieure.

**Bugs & fix.** Aucun (Tâche 4 isolée, pas de modification des stores). Lint : 4 erreurs pré-existantes dans les stores SQLite (Tâche 3, `Row`/`openDatabase` unused) — hors périmètre, ne bloquent pas.

---

## 2026-07-06 — AI Agent : `get_market` MCP tool (1er outil, branchement du `PriceFeed`) [Tâche 11/33]

**Quoi.** Premier outil MCP livré, lecture seule : `get_market(symbol)` → `{symbol, price, change24h, volume24h, timestamp}`. Vit dans `packages/mcp/src/tools/market.ts` (~40 lignes) et est enregistré dans `tools/index.ts`. **600/600** tests (+4 vs 596), typecheck vert. Modifications collatérales : `McpContext.priceFeed: PriceFeed` ajouté à `types.ts`, propagé dans `loadContext`/`ServerConfig`/`ContextStores` (le `PriceFeed` de la Tâche 7 attendait d'être branché au runtime, c'est chose faite). `bin/tide-mcp.ts` stubbe un `PriceFeed` qui throw loud (le vrai câblage runtime = Tâche 12+).

**Pourquoi.** Premier « ce que peut appeler un LLM » : c'est la brique qui rend l'agent observable (lire le marché avant d'agir). Le tool est volontairement lecture-seule (pas de garde-fou capital/perte à appliquer) — les outils d'ordre viendront en Tâches 14+ où les garde-fous durs (capital max, perte max / jour, max trades / jour, max levier, kill switch) seront branchés. L'extension de `McpContext` est légitime : il est défini comme le transport des deps d'exécution (cf. design Tâche 7), et `PriceFeed` en fait partie.

**Cheminement (3 écarts au brief, tous défendables).**
- **`ctx as any` retiré.** Le brief utilisait `(ctx as any).priceFeed.priceOf(symbol)` pour atteindre le feed — violation de la convention « jamais `as any` ». Refonte : `priceFeed: PriceFeed` ajouté à `McpContext`, propagation à travers `loadContext`/`ServerConfig`/`ContextStores`. Le tool accède maintenant à `ctx.priceFeed.priceOf(symbol)` typé naturellement. 4 callsites de tests mis à jour.
- **`ctx as never` retiré dans le test.** Remplacé par un helper `makeCtx(priceFeed)` qui construit un `McpContext` **complet et typé** (agent + mandate + priceFeed). Le test reste lisible et compile sans cast.
- **Symboles de test du brief incompatibles avec l'impl.** Le brief testait `"bt"` et `"VERYLONG"` pour `INVALID_PARAMS`, mais l'impl uppercasé d'abord puis applique `^[A-Z0-9]{2,10}$` : `"bt"` → `"BT"` (2 chars, matche) ; `"VERYLONG"` → 8 chars, matche. Les deux inputs **passeraient** le regex. Choix : utiliser `"VERYLONGNAME"` (12 chars) et `"BT!"` (caractère spécial), qui eux échouent réellement le regex post-uppercase. Commentaire dans le test documente ce choix. La regex du brief reste la source de vérité, c'est le test qui est corrigé.
- **4e test ajouté** (`throws an McpError instance with the documented code`) : vérifie que l'erreur levée est bien `instanceof McpError` (pas juste un objet `{code: …}`). 8 lignes, verrouille un contrat runtime implicite.

**Bugs & fix.** Aucun (impl + tests verts dès le premier jet, modulo les 3 écarts documentés ci-dessus). Lint : 5 erreurs pré-existantes (4 dans les stores SQLite de Tâche 3, 1 dans `guard.test.ts`) — vérifié inchangé avant ce commit via `git stash` + lint, **0 nouveau**. Dette tracée : `bin/tide-mcp.ts` stub le `PriceFeed` avec un throw loud (volontaire, le câblage runtime arrive en Tâche 12+) ; 4 fichiers manquent un newline en fin (cohérent avec un pattern pré-existant dans le package).

**Suite logique.** Tâche 12 : câblage runtime `loadContext` ← vrais stores (`@tide/api` exposera un `PriceFeed` concret branché sur CoinGecko). Le tool `get_market` est déjà prêt à le consommer sans modification — il suffira de brancher le vrai `PriceFeed` à l'entrée de `startMcpServer`.

---

## 2026-07-05 — `GET /metrics` : audit de la chaîne d'attribution + test d'intégration bout en bout [chemin critique, métrique reine]

**Quoi.** Suite à un retour externe (« l'indexeur fait la lecture mais pas l'agrégation »), audit de bout en bout du pipeline d'attribution, puis comblement du trou de couverture identifié. **519/519** (+4 vs 515), typecheck + lint verts, suite complète 2,43 s. Aucun changement de code de prod — uniquement 1 fichier de test ajouté (`apps/api/test/metrics-route.test.ts`).

### Audit du pipeline existant (avant le test)

Lecture exhaustive du flux pour confirmer ou infirmer le retour externe. Le pipeline tient en 6 étapes, **toutes prouvées par au moins un test unitaire** :

| # | Étape | Fichier | Test qui la couvre |
|---|-------|---------|--------------------|
| 1 | **Lecture** : `extractTaggedTxs(transactions, sourceTag)` parse une liste `account_tx`, ne retient QUE `validated === true && meta.TransactionResult === "tesSUCCESS" && SourceTag === tideSourceTag` | `packages/xrpl/src/metrics/observe.ts:79` | `packages/xrpl/test/observe.test.ts` (couvre statut meta, tag, hash, etc.) |
| 2 | **Normalisation** : `normalizeVolume(tx, prices, reference)` convertit `Amount` (Payment) ou `TakerGets` (OfferCreate) en devise de référence via le feed (drops/IOU × prix). Repli conservateur : prix manquant → 0 | `apps/api/src/indexer/normalize-volume.ts:42` | `apps/api/test/normalize-volume.test.ts` (5 tests) |
| 3 | **Indexeur** : `AttributionIndexer.sync()` orchestre — pagine `account_tx` (fenêtre figée sur 1re page, marker suivi, garde `MAX_PAGES`), pour chaque tx appelle `recorder.record({account, sourceTag, volume, ledgerIndex, hash})` | `apps/api/src/indexer/indexer.ts:104` | `apps/api/test/indexer.test.ts` (7 tests — **mais via `FakeRecorder`, juste `push` dans un array**) |
| 4 | **Persistance** : `SqliteAttributionStore.record(tx)` insère avec `INSERT OR IGNORE` sur `tx_hash UNIQUE` (clé d'idempotence). Valide `volume ∈ ℝ⁺` et `ledgerIndex ∈ ℕ` | `apps/api/src/store/attribution-store.ts:53` | `apps/api/test/attribution-store.test.ts` (10 tests) |
| 5 | **Agrégation** : `aggregateAttribution(txs, sourceTag)` somme `totalVolume`, compte `txCount`, dédoublonne les comptes via `Set<string>` → `activeAccounts`. Rejette `volume < 0 \|\| !finite`. Filtré par `sourceTag === tideSourceTag` | `packages/xrpl/src/metrics/aggregate.ts:15` | `packages/xrpl/test/metrics.test.ts` (11 tests) |
| 6 | **Exposition** : `app.get("/metrics", () => store.metrics(sourceTag))` | `apps/api/src/http/server.ts:293-296` | `apps/api/test/sign-routes.test.ts` (test « expose les métriques pour le sourceTag configuré (200) » + « sans indexeur câblé, /metrics est absent (404) ») — **mais via `FakeStore implements MetricsReader { return METRICS }`** |

**Verdict.** Le retour externe est **faux sur le fond** : l'agrégation existe et est bien câblée (étape 5 appelée par l'étape 4, appelée par l'étape 6). **Vrai sur la forme** : aucun test ne compose les étapes 3 → 4 → 5 → 6 ensemble. Conséquence concrète : une régression silencieuse (signature de `MetricsReader` modifiée, `sourceTag` non injecté dans `MetricsDeps`, `aggregateAttribution` qui change sa sémantique, `attribution-store.ts` qui perd l'import) faisait passer **tous les tests** mais coupait `/metrics` en prod. C'est précisément le scénario que décrit la personne à qui on a parlé. La métrique `totalVolume/activeAccounts/txCount` est la **métrique reine** du hackathon (3 prix sur 4 dépendent d'elle) — un trou de couverture là-dessus est inacceptable.

### Test ajouté (`apps/api/test/metrics-route.test.ts`, 4 cas)

Un seul `describe`, **`buildServer` + `app.inject` + vrai `SqliteAttributionStore` (in-memory `:memory:`) + vrai `AttributionIndexer`**. `FakeReader` local pour piloter la pagination (pattern repris d'`indexer.test.ts`). Le store passe le check TypeScript via `store as unknown as AttributionRecorder` (sa signature `record(tx: ObservedTx): void` est structurellement compatible avec l'interface, pas besoin de déclaration explicite — et c'est le store de prod qu'on teste ainsi, pas un fake déguisé).

- **Cas 1 — agrégation nominale** : 2 comptes (`rPool`, `rPlayer`), 2 Payments XRP de 2 000 000 + 1 000 000 drops à prix 0,5 USD, SourceTag Tide → attend `totalVolume: 1.5, activeAccounts: 2, txCount: 2`. Sanity check `result.recorded === 2` AVANT le `inject` pour s'assurer que l'indexeur a bien poussé.
- **Cas 2 — filtre par SourceTag** : 1 tx taggée Tide (0,5 USD) + 1 tx taggée `OTHER_TAG` avec un volume énorme (9 999 000 000 drops) → seul Tide compte. Prouve que `aggregateAttribution` filtre bien et que la métrique n'est pas gonflée par les tx d'autres apps.
- **Cas 3 — volume = 0 conservateur** : Payment IOU d'une devise sans prix (`FOO` absent de la `PriceMap`) → `totalVolume: 0` mais `activeAccounts: 1, txCount: 1`. Démontre la sémantique « la tx a eu lieu, on crédite le compte actif, on ne SUR-compte pas un volume qu'on ne sait pas valoriser » (dette tracée `DEVLOG 22/06` entrée « F4 indexeur d'attribution », limites d'attribution).
- **Cas 4 — idempotence par hash** : `beforeEach` a déjà poussé 2 lignes. On relance un sync avec les **mêmes hashes** (`H_rPool_50`, `H_rPlayer_51`) pour simuler un rescan post-reboot (la dette « curseur non persisté » de F4). L'`INSERT OR IGNORE` neutralise → on reste à 2 lignes, jamais 4. Démontre que la route reflète l'idempotence du store.

### Pourquoi `feedLogger` au premier jet — leçon

Première passe du test, j'ai ajouté un `silentLogger` dans les appels `buildServer({ ..., feedLogger: silentLogger })` — réflexe pris en lisant `AppConfig` qui expose `feedLogger?`. Mais `ServerDeps` (l'interface passée à `buildServer`) **n'expose pas `feedLogger`** (cf. `server.ts:66-87` vs `app.ts:53`). Typecheck a rappelé à l'ordre : `TS2353: Object literal may only specify known properties`. Retiré en 3 Edit, puis lint a rappelé les 2 imports inutilisés (`AccountTxOptions`, `ObservedTx`). Trois lignes d'erreur pour trois réflexes à corriger — note pour plus tard : **lire l'interface cible avant d'écrire ses appels, pas après**.

### Dette technique résiduelle (tracée, YAGNI pour l'instant)

- **Pas de cache d'agrégation** : `store.metrics()` lit la table entière à chaque `GET /metrics`. Sur des millions de lignes ça peut devenir lent. YAGNI tant que la table reste < ~100k lignes ; si bottleneck observé, ajouter un compteur cumulé en mémoire mis à jour à chaque `record()`.
- **Le `AccountTxReader` du test stub ne respecte pas l'interface** : la signature est `accountTx(account, options?)` mais le stub ignore `account` et `options`. Acceptable en test, mais à aligner si quelqu'un copie-colle le pattern dans un test d'intégration plus large.
- **CLI runtime** : on n'a toujours pas vérifié `/metrics` contre un **vrai** serveur booté avec `XRPL_WSS_URL` + `TIDE_INDEXED_ACCOUNTS` + `TIDE_SOURCE_TAG`. Le test couvre la composition, pas la réalité réseau — ce qui manque c'est le spike d'attribution lui-même (`ROADMAP §chemin critique #1`).

**Bugs & fix.** Cf. la leçon ci-dessus (3 erreurs typecheck/lint corrigées en Edit) + `store as unknown as AttributionRecorder` (cast localisé, justifié dans le commentaire du test).

**Prochain pas logiquement.** Tant que ce test passe + 0 régression sur les 515 autres : la chaîne est tenue. **Bloqueur suivant =** exécuter le spike d'attribution (chemin critique #1) sur le wallet d'Armand pour faire monter le compteur orga — pas ce qu'on peut tester sans mainnet.

---

## 2026-07-01 — Perp v2 : revue de la PR adaptateur (audit 3 lentilles) + correctifs [piste v2]

**Quoi.** Revue de la PR #2 (adaptateur viem + anti-rejeu) : tests re-joués (Foundry 40/40, e2e anvil, 515 TS) puis audit adversarial 3 lentilles (anti-rejeu contrat / adaptateur viem / address+service). Contrat anti-rejeu jugé sain. Correctifs appliqués à l'adaptateur/tests :
- **`nonceManager`** sur l'account viem (`viem-vault-client.ts`) : deux règlements concurrents d'une même clé opérateur ne collisionnent plus sur le même nonce pending (bug de chemin de fonds en usage concurrent).
- **`AlreadySettled` → no-op idempotent** : un retry après succès on-chain était remonté comme erreur ; désormais avalé (exactly-once propre bout-en-bout). Suppose des clés uniques par opération (`positionId:action:seq`). ABI complété (`AmountOutOfRange`).
- **Robustesse** : `timeout`+`confirmations` sur `waitForTransactionReceipt` (plus de hang RPC) ; garde `idempotencyKey` vide dans l'adaptateur (`keccak256("")` ≠ 0).
- **e2e** : `beforeAll` lance `forge build` et `CAN_RUN` ne gate plus que sur anvil → plus de faux résultat sur un `out/` périmé (ce qui faisait échouer l'e2e en review).

**Laissé (YAGNI).** `applyFunding` non exposé dans `VaultClient`/adaptateur : aucun appelant, funding-on-chain hors du flux courant. Rappel runbook : le backend doit dériver `settlementId` déterministe (jamais un nonce aléatoire par tentative).

---

## 2026-07-01 — Perp v2 : audit du travail on-chain + correctifs (adaptateur viem, anti-rejeu) [piste v2]

**Quoi.** Audit end-to-end du perp v2 livré (`packages/contracts` + `packages/evm`) puis comblement des deux trous trouvés — tout **codable et vérifié sans testnet** (contre anvil). Non déployé testnet (frontière `[env]` inchangée).
- **Audit.** 37 tests Foundry + 38 TS verts ; cycle de vie complet re-joué sur **anvil** via le script de déploiement existant ; config `solc 0.8.24` / EVM Paris / chainId 1449000 **conforme à la doc officielle XRPL EVM**. Deux manques : (1) le pont runtime n'existait pas (aucune implémentation concrète de `VaultClient`, zéro `viem` dans le repo) ; (2) aucune protection anti-rejeu on-chain (idempotence « best-effort au niveau appel » seulement).
- **Anti-rejeu on-chain (`MarginVault.sol`).** `openAccounting`/`closeAccounting`/`applyFunding` prennent un `bytes32 settlementId` consommé par `_consume` (première ligne, avant tout effet) : id nul rejeté (`ZeroSettlementId`), rejeu rejeté (`AlreadySettled`), `mapping usedSettlementId` public, `settlementId` indexé dans les events. Idempotence **exactly-once** garantie par le contrat, plus seulement par la couche d'appel. Réalise la ligne 52 de `docs/ROADMAP-PERP-V2.md`.
- **Adaptateur viem concret (`createViemVaultClient`).** Première entrée de `viem` dans le repo. Factory sur le modèle de `createXamanApi` : enveloppe RPC + clé opérateur, retourne l'interface pure `VaultClient`. Hache l'`idempotencyKey` string en `settlementId` (`keccak256`), **attend le reçu** et **échoue si `status !== success`** (pas d'avalement d'erreur, ligne 52). ABI minimal typé `as const` (découplé de `out/`).
- **Durcissement couche TS.** `assertEvmAddress` (pure, sans dépendance) branché dans `SettlementService` ; `idempotencyKey` propagée de bout en bout (service → interface → adaptateur) ; clé vide rejetée.
- **Test e2e inject contre anvil.** Cycle `deposit → open → close(gain) → collateralOf → withdraw` à travers l'adaptateur réel + rejeu bloqué on-chain ; **skip propre** si anvil/artefacts absents (`pnpm test` reste vert sans Foundry). Réalise la ligne 53.

**Pourquoi.** Le collègue a livré la moitié on-chain (contrat + traduction pure) mais pas le pont runtime ni l'idempotence robuste. Sans anti-rejeu on-chain, un simple retry réseau double-appliquait un mouvement financier — inacceptable pour une brique de règlement. L'adaptateur débloque le branchement backend (Phase 2/3) et est testable sans les clés/testnet du collègue.

**Cheminement.** Modif d'un contrat déjà audité → re-run + re-audit complets : `_consume` placé après les modifiers `onlyOperator`/`whenNotPaused` (un appel non-autorisé ou en pause ne brûle pas l'id → le retry légitime reste possible). Handler d'invariant : `settlementId` frais par appel (compteur) pour ne pas bloquer le fuzzing ; l'anti-rejeu est couvert par des tests unitaires dédiés. Décision ABI : figé `as const` dans `packages/evm` plutôt qu'importé de `out/` (le typecheck ne dépend pas d'un `forge build`).

**Vérif.** Foundry **40/40** (dont 3 nouveaux : replay open cross-fonction, id nul, replay funding + invariants inchangés) ; TS **41/41** evm ; suite complète **515/515** (e2e anvil inclus) ; typecheck + lint verts.

**Bugs & fix.** `collateralOf` du service : la validation d'adresse synchrone levait *avant* de retourner la promesse (throw sync au lieu de rejet) → méthode passée `async` pour un contrat d'erreur cohérent côté appelant.

**Frontière restante (`[env]`, machine du collègue).** Déploiement testnet `1449000` + vérif Blockscout, RLUSD testnet, cadence oracle Band, câblage runtime dans `apps/api` (env reader `TIDE_EVM_*` + `buildSettlementDeps` + route, OFF par défaut) — hors de cette PR.

---

## 2026-06-30 — Perp v2 (P2, suite) : `SettlementService` + interface `VaultClient` injectable [piste v2]

**Quoi.** Deuxième maillon codable de P2 : l'**adaptateur de règlement** qui consume une `VaultClient` (interface) et expose l'API que le backend appellera — testable avec un fake, sans viem ni clés.
- `vault-client.ts` : interface `VaultClient` (`openAccounting`/`closeAccounting`/`collateralOf`, bigints en unités de base) — la frontière `[env]` entre le backend et le contrat on-chain.
- `settlement-service.ts` : `SettlementService(vault, {collateralDecimals})` avec `openPosition(account, margin, fee)` et `closePosition(account, position, exitPrice)`. Réutilise les fonctions pures auditées (`computeOpenSettlement`/`computeCloseSettlement` → unités de base + cap isolated), propage les erreurs sans avalement, garde-fou miroir `pnl ≥ -marge`.
- 8 nouveaux tests (settle-service) : 511 au total. lint + typecheck OK.

**Pourquoi.** Garder le backend **découplé** du contrat : on peut tester bout en bout (paper position → arguments vault) avec un fake, et brancher l'implémentation viem au runtime sans toucher au reste. Renforce l'invariant `pnl ≥ -marge` côté off-chain (mirror du re-plafonnement on-chain).

**Cheminement.** L'adresse de compte est **passée explicitement** (pas déduite de `Position.id`, qui est locale au backend — sinon croisement dangereux entre identifiants). Constructor valide les décimales. Pas d'idempotence on-chain : la couche d'appel (backend) doit s'assurer qu'elle n'appelle pas deux fois ; le contrat n'a pas de nonce sur les instructions d'opérateur (trade-off assumé : opérateur de confiance).

**Audit (workflow adversarial, 3 lentilles + vérif, 11 confirmés/26).** 2 corrections appliquées : (1) constructeur ne vérifiait pas la borne haute des décimales → `assertValidDecimals` exporté de `units.ts` et réutilisé (fail-fast au boot, test ajouté) ; (2) garde-fou `pnlBase < -marginReleaseBase` mort (la monotonie de l'arrondi + le cap dans `computeCloseSettlement` le garantissent déjà) → supprimé, autorité unique dans `settlement.ts`. Dettes tracées (à fermer au câblage, pas des bugs runtime) : **pas d'idempotence** (un retry backend double-appellerait `openAccounting`/`closeAccounting` ; à dédupliquer côté backend via `UNIQUE(operationId)` SQLite, ou nonce on-chain) ; **pas d'adaptateur viem concret** (`VaultClient` n'est consommé que par le fake de test ; frontière `[env]`). Le retour réel appliqué par le contrat (fee/perte plafonnés via events) n'est pas exposé par `VaultClient` → à enrichir au câblage si on synchronise le leaderboard sur la chaîne. 511 tests, lint + typecheck OK.

---

## 2026-06-30 — Perp v2 (P2, début) : module `@tide/evm` — settlement pur (number → unités de base) [piste v2]

**Quoi.** Premier maillon **codable sans environnement** de la Phase 2 : un nouveau package pur **`@tide/evm`** qui traduit les mouvements de compta du domaine (PnL/marge/fee en `number`) en arguments entiers exacts (`bigint`, unités de base du token) pour `MarginVault`. C'est le **pont off-chain → vault** et le **point de règlement** où l'on quitte le flottant.
- `units.ts` : `toBaseUnits`/`signedToBaseUnits` (montant décimal → unités de base, **troncature**), `fromBaseUnits` (affichage sans perte). Évite le piège `number * 10**decimals` (qui dépasse `MAX_SAFE_INTEGER` dès ~1e6 en 18 déc.) via décomposition de la chaîne décimale (`toFixed` + découpe).
- `settlement.ts` : `computeOpenSettlement(margin, fee, decimals)` et `computeCloseSettlement(position, exitPrice, decimals)` (réutilise `positionPnl` de `@tide/core`, **cap isolated** PnL ≥ -marge, garde-fou entier `pnlBase ≥ -marginReleaseBase`).
- 30 tests (23 units + 7 settlement) : 503 au total. typecheck + lint + tous les packages OK.

**Pourquoi.** Paie la dette tracée « montants en `number` → BigInt au règlement » pour le chemin EVM : la conversion est centralisée, exacte au-delà de `MAX_SAFE_INTEGER`. Sépare la **sérialisation** (ce module) de la **soumission** on-chain (adaptateur viem à venir, `[env]`).

**Cheminement.** Package parallèle à `@tide/xrpl` (même rôle : intégration d'une chaîne), dépend de `@tide/core` (workspace). Décimales **paramètre de config** (pas de valeur magique : RLUSD EVM non confirmé). Pas encore de viem (le module est pur, testable sans clés).

**Audit (workflow adversarial, 2 lentilles + vérification).** 6 findings, **5 confirmés** se ramenant à **2 vrais défauts** (corroborés par les deux lentilles), tous deux corrigés :
- 🟠 **La 1re implémentation n'était pas un vrai floor** (`toFixed(decimals+1)` arrondit, le carry remonte → sur-crédit d'1 unité dans ~5 % des cas). Mais le « vrai floor » testé ensuite **sous-créditait les saisies propres** (0,12 stocké 0,1199999… → 0.119999). Décision : **sémantique = arrondi au plus proche** (`toFixed(decimals)`), le bon choix face au bruit flottant (0,12 → 0,120000), symétrique/non biaisé, ≤ 0,5 unité, et qui préserve l'invariant `pnl ≥ -marge` (monotonie + re-plafonnement on-chain). Doc rendue honnête.
- 🟡 `toFixed` **exponentiel ≥ 1e21** → `BigInt` levait une erreur brute (pas `SettlementError`) → borne `MAX_AMOUNT` + `SettlementError`, commentaire corrigé.
- Finding « info » laissé : le garde-fou de `computeCloseSettlement` est sain mais inatteignable (défensif, cohérent avec le re-plafonnement du vault).

**Bugs & fix.** Cf. l'audit ci-dessus (sémantique floor → arrondi au plus proche, borne `MAX_AMOUNT`). Tests de non-régression ajoutés aux frontières d'arrondi + entrées ≥ 1e21. 503 tests verts, typecheck + lint OK.

---

## 2026-06-30 — Perp v2 (P1) : `MarginVault.sol` — coffre de collatéral on-chain (XRPL EVM) [piste v2, branche `feat/perp-v2-sidechain`]

**Quoi.** Démarrage de l'implémentation de la **roadmap perp v2** (`docs/ROADMAP-PERP-V2.md`). Phase 1 = le cœur on-chain du **perp hybride** : nouveau package Foundry **`packages/contracts/`** (solc 0.8.24, EVM Paris, OpenZeppelin v5.0.2) et le contrat **`MarginVault.sol`**.
- **Contrat** : coffre de collatéral RLUSD. `deposit`/`withdraw` **permissionless** (retrait borné au **collatéral libre** = `collateral − lockedMargin`, saturant). Compta **opérateur** (clé Safe) : `openAccounting` (débit fee + verrou marge), `closeAccounting` (libère marge + applique le PnL), `applyFunding`. **Pool de garantie** (`protocolPool`) qui finance les gains et reçoit pertes/fees ; perte **plafonnée au collatéral** (jamais négatif). Gouvernance `Ownable2Step` + `Pausable` (pause bloque dépôts/compta mais **pas** les retraits du libre) + `skim` (récupère les dons hors compta).
- **Tests** : 37 tests Foundry (unit + fuzz) + **3 invariants** (256 runs × 64 depth = 16384 appels, 0 revert) prouvant la **conservation** (`totalAccounted == Σ collateral + protocolPool`) et la **solvabilité** (`balanceOf(vault) >= totalAccounted`) ; le fuzzing d'invariant exerce aussi `skim` et `pause`/`unpause`.

**Pourquoi.** L'archi retenue (cf. roadmap) est **hybride** : la chaîne ne fait que **custodier + régler**, le matching/funding/PnL/liquidation restent off-chain (moteur `position` F16/F17, mark price = feed CEX). Le contrat doit donc être **mince mais incassable côté fonds** : un trader ne retire jamais sa marge engagée, le système ne crée/détruit jamais de valeur, l'opérateur (de confiance par design, semi-custodial assumé) ne fait qu'appliquer des mouvements bornés.

**Cheminement (décisions clés).**
- **Compta interne stricte, jamais `balanceOf`** : tous les soldes viennent de `collateral`/`protocolPool`/`totalAccounted`, jamais du solde de tokens → un don direct ou un token à frais de transfert ne peut pas corrompre la compta (et `skim` récupère l'excédent). `deposit`/`fundPool` créditent le **montant réellement reçu** (delta de solde), robustes au fee-on-transfer.
- **Gains payés depuis le pool** (revert `PoolInsolvent` si à sec → l'owner doit financer) ; **pertes plafonnées au collatéral** (ceinture de sécurité ; la sémantique *isolated* perte ≤ marge est garantie off-chain).
- **Séparation owner (Safe froid) / operator (clé chaude rotatable)** : `setOperator` permet la rotation en cas de compromission, l'owner garde pause/pool/skim.
- **Intégration monorepo** : package Foundry hors périmètre TS (ignore ESLint ajouté, pas de script `typecheck` → ignoré par `pnpm -r`), vitest matche `*.test.ts` donc n'y touche pas. Déps via submodules `forge install`. Monorepo vérifié intact (lint + typecheck + 473 tests vitest verts).

**Audit (workflow adversarial, 5 lentilles + vérification par réfutation, 25 agents).** 20 findings, **11 confirmés** (0 incertain) ; la majorité sont des assertions positives « info » (reentrancy saine, conservation/arithmétique/ERC20 vérifiées). Le finding « medium » candidat (pause laisse `withdraw` ouvert) a été **réfuté** (withdraw ne sort que le libre, pas la marge ; pas de chemin d'exploitation). **3 corrections appliquées :**
- 🟠 `renounceOwnership` héritée d'OZ pouvait briquer la gouvernance en un appel (plus de pause/rotation d'opérateur/alimentation du pool) → **override qui revert** (`RenounceDisabled`).
- 🟡 Events loggaient les montants **demandés**, pas **appliqués** (le plafonnement perte/fee est silencieux) — or l'archi repose sur la réconciliation on-chain/off-chain → `_settle` retourne le montant **réellement appliqué**, `PositionOpened`/`PositionClosed`/`FundingApplied` l'émettent (+ tests dédiés).
- 🟡 Couverture : `skim`/`pause` non fuzzés sous invariant → ajoutés au handler (`donateAndSkim`, `pauseToggle`).
Notes « info » laissées (assumées) : fee prélevé sur le collatéral total (documenté en NatSpec), marge libérable seulement par l'opérateur (liveness du modèle semi-custodial, mitigée par `setOperator`), hypothèse token standard non-rebasing (collateralToken immuable = RLUSD).

**Bugs & fix.** 1 test rouge corrigé (assertion `skim` ignorant le solde initial du destinataire → skim vers une adresse fraîche). Contrat de production **0 warning** (casts int↔uint de `_settle` suppressés avec justification, prouvés sûrs par les gardes `int256.min`/signe). `forge test` : **37 verts** ; monorepo intact (lint + typecheck + 473 tests vitest).


## 2026-06-30 — Terminal : placement d'ordre honnête (les ordres « disparaissaient ») [Phase 3, UI]

**Quoi.** Bug rapporté (Armand) : un ordre placé n'apparaissait ni dans « ordres actifs » ni dans l'historique. **Backend vérifié OK** (curl : BUY spot → 201 et listé dans `/orders`, perp → 201 et listé dans `/positions`, SELL sans détenir → 409). La cause est **front** :
- `onPlace` affichait « ✓ Ordre envoyé » **avant** d'exécuter, alors que `placePaperOrder` pouvait retourner/échouer en silence (montant 0, solde insuffisant, vente sans détenir, soldes pas encore chargés, `try/catch` muet) → l'UX mentait et l'ordre n'était jamais enregistré.
- Un ordre **limit** au prix courant s'exécutait **instantanément** (`evaluatePaperTriggers` appelé à la pose) → jamais visible dans « ordres actifs ».

**Cheminement / fix.**
- **Feedback réel** : le message (envoyé / placé / *solde insuffisant* / *ordre refusé*) provient du **résultat** de l'ordre — `openPaperPosition` renvoie un booléen, plus d'avalement muet, helper `flashPlace`. Nouvelles clés i18n.
- **Ordre des gardes** : `paper.connect()` (donc soldes chargés) **avant** la garde de cash → le 1er ordre n'est plus rejeté à tort.
- **Limit** : plus d'évaluation immédiate à la pose → l'ordre **reste dans « ordres actifs »** et se déclenche aux ticks de prix suivants s'il devient exécutable.

**Suite — positions qui « s'ouvrent puis disparaissent ~0,5 s après » (History grimpe).** Backend revérifié OK (open perp → 201, position toujours présente après 600 ms). Cause front : `evaluatePaperTriggers` fermait la position via un **TP/SL du mauvais côté du prix** (ex. sur RAIN à 0,016, un SL saisi à une valeur ronde type `2` rend `close ≤ SL` vrai pour un long → fermeture au 1er tick ; chaque cycle ouvre+ferme = 2 entrées d'historique). Fix : `coherentTpSl(side, entry, tp, sl)` n'enregistre un TP/SL que s'il est **du bon côté** du prix d'entrée (TP côté profit, SL côté perte), sinon il est ignoré — appliqué à l'ouverture market (perp) et à la pose d'un ordre limit. Un niveau incohérent ne ferme plus instantanément.

**Bugs & fix.** Cf. ci-dessus. `typecheck` + `lint` + build + 473 tests OK ; **vérif navigateur runtime à confirmer**. Note : l'historique du blotter (`tradeHistory`, local) reste distinct de l'historique backend des ordres (`paper.orders`, SQLite) — le blotter affiche le log local (market/perp/limit/tp/sl).

---

## 2026-06-30 — Chart : stabilité au refresh, espace à droite, décimales au zoom [Phase 3, UI]

**Quoi.** Trois retours Armand sur le graphe :
- **« le graphe se recrée »** : le refresh d'historique (30 s) rechargeait les bougies en **réinitialisant le zoom/déplacement** ET en **relançant l'animation de fade-in** → la vue sautait et tout clignotait. Fix : `loadHistory(resetView)` — le refresh périodique (`loadHistory(false)`) **préserve** `visibleCount`/`hOffset` et ne ré-anime pas ; seul un changement d'actif/timeframe recadre + anime. `onResizeChart` ne ré-anime plus non plus.
- **« déplacer la courbe sur la gauche / dernières bougies bloquées »** : `hOffset` était borné à `[0, …]` (impossible de dégager à droite). Désormais `hOffset` peut être **négatif** (jusqu'à -50 % de la fenêtre) → on pousse les bougies vers la gauche et on obtient de l'**espace à droite** (façon TradingView). `renderChart` ajoute `rightPad` slots vides à droite ; `chartTimeLabels` aligné sur le même nombre de slots.
- **« pas de nouvelles décimales au zoom »** : l'axe des prix utilisait un format fixe. `priceDecimals(range)` adapte le nombre de décimales au range visible → en zoomant (range plus petit), des décimales supplémentaires apparaissent (utile sur RAIN ≈ 0,016).
- **Blotter non défilable** : la carte positions/ordres/historique (`.card` `overflow:hidden` + `max-height`) **coupait** les lignes au lieu de défiler. `.pos` passe en flex colonne et `.ptable` en `flex:1; min-height:0; overflow-y:auto` → la liste défile sous l'en-tête figé (History à 19+ lignes accessible).

**Bugs & fix.** Cf. ci-dessus. typecheck + lint + build OK ; vérif navigateur runtime à confirmer.

---

## 2026-06-30 — Terminal : chart réel mal étiqueté + zoom vertical de l'axe des prix [Phase 3, UI]

**Quoi.** Deux correctifs UX du terminal (retours Armand) :
- **« Real chart unavailable » à tort.** Les bougies Binance (source principale, ex. XRP/RLUSD) s'affichaient bien, mais le label de source indiquait « indisponible ». Cause : le type client `Candle.source` est **requis**, or `parseKlines` (Binance) ne l'attachait pas → `chartSourceLabel` lisait `undefined` et retombait sur `chartUnavailable`. Fix : `parseKlines` attache `source: "Binance"` + `mode: "ohlc"` (les fallbacks coingecko/gate/geckoterminal le faisaient déjà). Le chart **était** réel, il est désormais correctement étiqueté.
- **Zoom + navigation type TradingView.** Retrait du slider de zoom de la barre des timeframes. À la place, chart interactif : **zoom vertical** par glissement sur l'axe des prix (`.price-axis-zoom`, `priceZoom`) ; **zoom horizontal** à la molette sur le graphe (`hZoom`, nombre de bougies visibles) ; **pan 2D** par glissement sur la zone du graphe — vertical (`priceOffset`, fraction du range) **et** horizontal (`hOffset`, décalage en bougies vers le passé). `renderChart` applique le zoom puis l'offset vertical ; `visibleChartCandles` découpe la fenêtre horizontale (`visibleCount` bougies + `hOffset`). **Défaut = 72 % des bougies chargées** (`VISIBLE_FRACTION`), réglé au chargement de l'historique → il reste toujours de quoi faire défiler horizontalement dès le départ (le bug « slide horizontal sans effet » venait de l'affichage de *toutes* les bougies). Double-clic = reset ; changement d'actif = vue auto ; molette = zoom horizontal.

**Pourquoi.** Le label faisait croire que le graphique n'était pas réel. Et le zoom souhaité est celui de l'échelle des prix (geste type TradingView sur l'axe), pas une fenêtre horizontale.

**Bugs & fix.** Cf. le label ci-dessus. `typecheck` + `lint` + build web OK, 473 tests ; **vérif navigateur runtime** du geste de drag à finaliser.

---

## 2026-06-30 — F17 : remontée des positions perp au backend (leaderboard complet) [Phase 1/3, chemin produit]

**Quoi.** Le PnL des positions perp (et des limit exécutées) vivait en `localStorage`, invisible au leaderboard/compétitions (qui valorisent les portefeuilles backend) — la **dette 🔴 de F16**. Décision (30/06, avec Armand) : **le faire remonter au backend**. Modèle de position porté au domaine, exposé en HTTP, et le terminal y est branché. **473 tests** (+49), `typecheck` + `lint` + build web OK.
- **Domaine pur** (`@tide/core`, module `position/`) : `Position`/`OpenPositionInput`, `positionPnl(mark)` (long/short), `equityWithPositions(balances, positions, prices, quote)` = soldes spot **+** PnL non réalisé, `reservedMargin`/`availableMargin`, `validateOpenPosition` (erreur typée `InvalidPositionError`, levier borné par `MAX_PAPER_LEVERAGE`). `AccountSnapshot.positions?` + `buildLeaderboard` passe par `equityWithPositions` → le classement inclut les positions.
- **Service + store** (`apps/api`) : `PaperService.openPosition`/`closePosition`/`positionsOf` ; `equityOf`/`portfolioOf` incluent le PnL des positions. `AccountStore` (interface + InMemory + **SQLite table `positions`**) gère les positions atomiquement (frais débités à l'ouverture, PnL crédité à la fermeture). `PositionNotFoundError` (404).
- **HTTP + client** : `POST/GET /accounts/:id/positions`, `POST /accounts/:id/positions/:positionId/close` (validation `parseOpenPosition`). `@tide/client` : `openPosition`/`closePosition`/`positions` (+ DTO `ClosedPosition`).
- **Front** (`DashboardView`, `usePaper`) : `openPaperPosition`/`closePaperPosition` (les **points de passage uniques** : market, limit exécuté, TP/SL) appellent désormais le backend ; `paperPositions` est rechargé via `client.positions`. `usePaper` expose `refresh`.

**Pourquoi.** Le funnel et le track record reposent sur le leaderboard : s'il ignore le perp, il ment sur la performance. La remontée backend en fait la source de vérité unique.

**Cheminement (décisions de compta).** Le **spot** reste en soldes (`placeOrder`, cash dépensé) ; le **perp** est une position : la **marge est réservée** (comptée dans le cash, pas dépensée), seul le **fee** est débité à l'ouverture, le **PnL réalisé** est crédité à la fermeture, **plafonné à -marge** (isolated margin — on ne perd jamais plus que la marge engagée). La fermeture est valorisée au **prix serveur** (autoritatif, anti-triche), pas au prix envoyé par le client. Surface minimale côté front : seuls les deux points de passage changent ; **TP/SL et l'horodatage d'ouverture restent des métadonnées locales** (`positionMeta`, le backend ne modélise que le financier), et les déclencheurs (limit/TP/SL) sont toujours évalués côté front — seule l'exécution remonte. Garde anti-réentrance (`closingPositions`) contre la double-fermeture pendant l'appel réseau.

**Dette résiduelle (tracée).** Déclencheurs limit/TP/SL côté front (un onglet fermé = pas de déclenchement) → à porter serveur si on veut des ordres conditionnels persistants. **Pas de liquidation auto** serveur (plancher -marge appliqué seulement à la fermeture). À l'ouverture, le backend fait confiance à `entry`/`qty` du client (acceptable en paper). Vérifié : tests de bout en bout (inject) + build front ; **reste la vérification navigateur runtime** (ouvrir/fermer une position et la voir au leaderboard).

**Bugs & fix.** `openPaperPosition` passé en async sans le mot-clé `async` → `vue-tsc` (TS2355/TS1308), corrigé.

---

## 2026-06-30 — F16 : terminal dérivés paper (perp/levier/limit/TP-SL, moteur local) [Phase 3, UI] — ⚠️ WIP non commit

**Quoi.** Le terminal Paper, jusqu'ici **spot market-only** (un ordre = `client.placeOrder` vers le backend), gagne une couche de **trading simulé riche**, entièrement côté front (`DashboardView.vue` +1177, `usePaper.ts`, `app.ts`). État au 30/06 : **non commit, non testé au-delà de `typecheck`/`pnpm test` globaux (424 verts).**
- **Produits & ordres** : bascule **spot ↔ perp**, **levier** (×5 par défaut), **marge** + **prix de liquidation** estimé (`liquidationLabel`), ordres **market ↔ limit**, **TP/SL**, distinction **maker/taker** (`PAPER_MAKER_FEE` 0,02 % / `PAPER_TAKER_FEE` 0,06 %).
- **Moteur local persisté** : positions ouvertes, ordres en attente et historique vivent dans `localStorage` (`tide.paperTerminal`). Les ordres limit sont **filés** (`pendingOrders`) puis exécutés quand le prix les touche (`evaluatePaperTriggers` / `limitOrderTouched`) ; TP/SL ferment la position au franchissement (`levelTouchedAfter`). PnL des positions calculé au **mark price** (`positionPnl`).
- **Blotter** 3 onglets (positions / ordres / historique) ; le tableau **positions fusionne** les positions locales **et** les soldes spot du backend (dédoublonnés, cf. `positions` computed).
- **Chart** : **zoom** (molette + slider, 24→10× `visibleChartCandles`), **bougie live** reconstruite depuis le prix temps réel (`updateLiveCandle`), **axe temporel** (`chartTimeLabels`), refresh historique 30 s. `HISTORY_TTL_MS` backend 60 s → **20 s** (voir une bougie clôturée apparaître plus vite).
- **Identité paper anonyme** (`usePaper`) : un `paper:<uuid>` en `localStorage` (`tide.paperUserId`) sert d'identité quand **aucun wallet** n'est connecté ; l'adresse XRPL prend le relais dès qu'un wallet est là. **Réouvre** le commit `586a4e4` (« require xrpl wallet for paper identity ») du 29/06 : le Paper redevient jouable **sans wallet**.

**Pourquoi.** Faire du terminal une vraie surface de démo « pro » (perp, levier, limit, TP/SL, blotter) sans dépendre du backend, qui ne modélise que le spot market. L'identité anonyme retire la friction « connecte un wallet pour jouer » à l'entrée du funnel.

**Cheminement.** Architecture **hybride assumée** : le **spot market** continue de passer par `paper.placeOrder` (backend → soldes SQLite → leaderboard/portfolio restent alimentés) **plus** un log local ; le **perp et les ordres limit** sont **local-only**. Le moteur local évite de toucher le `PaperService` backend (et ses tests) pour une couche de simulation UI.

**Dette & points à trancher (non résolus, tracés).**
- 🔴 **Réouverture d'une décision verrouillée.** Le perp/levier contredit l'entrée du 21/06 (« levier/short écartés, spot-only assumé ») et le « pas de perp » de `CLAUDE.md`. Tension à lever : ce « pas de perp » vise le **perp on-chain** (smart contracts absents du mainnet) — un perp **simulé en paper** ne le viole pas techniquement, mais contredit le **branding** « apprendre, pas pousser au levier ». À assumer explicitement ou retirer.
- ✅ **Source de vérité divergente — RÉSOLU le 30/06 (F17, entrée ci-dessus).** Le PnL perp/limit remonte désormais au backend (positions modélisées au domaine, equity = soldes + PnL) → le leaderboard reflète la perf complète, et le PnL n'est plus « fantôme » (crédité au cash à la fermeture).
- 🟠 Un **spot limit exécuté** crée une position locale mais **ne pousse pas** au backend (alors qu'un spot market le fait) → deux ordres spot identiques, un seul compte au leaderboard.

**Bugs & fix.** Aucun bug bloquant trouvé (`typecheck` + 424 tests verts). Les points ci-dessus sont des **incohérences d'architecture/produit**, pas des défauts de code.

---

## 2026-06-29 — Campagne « honnêteté des surfaces » : carnets + charts depuis des venues réelles [Phase 2/3]

**Quoi.** Après F15 (watchlist top 250 réelle), purge de **toutes les données simulées restantes** des surfaces de marché et secondaires. 14 commits (`d083795`→`0b56baf`), 424 tests.
- **`make UX surfaces honest` (`d083795`)** : retrait des chiffres inventés dans Portfolio, Leaderboard, Landing, Competition(s) (courbes/stats décoratives présentées comme réelles).
- **Carnets d'ordres réels** : le carnet fake est remplacé par de la **profondeur XRPL** (`book-reader` via `book_offers`, `5c92bd8`), puis des carnets **multi-actifs Binance** (`binance-book-feed`, `f3fd014`), avec **refresh** périodique (`f91e6ba`) et **tri vers le spread** (`81af7ce`) ; **HYPE** (absent de Binance) est sourcé depuis **Hyperliquid** (`hyperliquid-book-feed`, `1857aff`).
- **Charts réels** : cascade de replis quand Binance klines manque — **CoinGecko history** (`252ef47`/`3edd7ce`, rendu en **ligne** si prix-seul sans OHLC), **CoinGecko OHLC** + **GeckoTerminal** + **Gate book** pour les actifs « rain » / DEX (`ba8b7fb`), et **Gate candles** en dernier recours (`0b56baf`) à la place des **bougies synthétiques** ; lissage des charts **clairsemés / stablecoins** (`059b72c`).
- **`require xrpl wallet for paper identity` (`586a4e4`)** : l'identité paper devenait l'adresse XRPL connectée (depuis **réouvert** par F16, cf. entrée du 30/06).
- Nouveaux feeds back : `binance-book-feed`, `hyperliquid-book-feed`, `gate-book-feed`, `coingecko-history`, `coingecko-ohlc`, `geckoterminal-history`, `gate-history` — chacun testé.

**Pourquoi.** Cohérence avec la ligne « ne jamais présenter du décor comme une donnée réelle » (cf. `armand-design-craft-no-ai-look`). Un carnet/chart inventé sur une app de trading = mensonge produit ; F15 ayant ouvert les 250 coins, il fallait que **chaque** actif ait un carnet et un chart **réels** (ou un repli honnête, horodaté).

**Cheminement.** Stratégie **multi-venues par actif** plutôt qu'une source unique : Binance couvre le mainstream, Hyperliquid les perp-natifs (HYPE), Gate/GeckoTerminal/CoinGecko les longues traînes et les actifs DEX. Le chart distingue désormais **OHLC** (bougies) de **prix-seul** (ligne) au lieu de fabriquer de fausses mèches.

**Bugs & fix.** `restore markets scroll` (`1527ba3`) : la refonte du carnet avait cassé le scroll de la watchlist. Dette : forte dépendance à des **API externes** (Binance/Hyperliquid/Gate/CoinGecko/GeckoTerminal) — rate-limits, CORS et disponibilité à surveiller ; `HISTORY_TTL_MS` borne les appels OHLC.

---

## 2026-06-29 — F15 : feed « markets » CoinGecko (top 250 coins, watchlist dynamique) [Phase 2, feed]

**Quoi.** La watchlist était limitée à **9 coins codés en dur** (`SYMBOL_TO_ID` + `/simple/price`) et son %24h était mock. Bascule sur **CoinGecko `/coins/markets`** : un seul appel = top N coins par capitalisation avec **prix + %24h réel + nom**, sans mapping manuel.
- **Back** : `feed/coingecko-markets.ts` (`fetchMarkets`, parsing tolérant, **dédoublonnage par symbole** = garde le plus gros market cap). `AppConfig.markets` (+ branche `refreshPrices`), route **`GET /markets`**, export. `main.ts` passe en mode `markets` (`perPage=250`), `SYMBOL_TO_ID`/`SYMBOLS` retirés. L'ancien `/simple/price` (`cex-price-feed`) reste pour les tests/legacy.
- **Client** : type `MarketRow` + `markets()`.
- **Front** : watchlist **dynamique** (`loadMarkets` depuis `/markets`), `livePrices` dérivés (les 250 cotés → ordres Paper + equity OK pour tous), sélection XRP par défaut / conservée ensuite. La recherche (déjà câblée) filtre les 250.

406 tests (+7), typecheck + lint + build OK. **Vérifié en réel** (CoinGecko) : `/markets` = **249 coins** (250 − 1 homonyme dédoublonné), HYPE inclus (Hyperliquid $63.47), XRP présent ; front headless : watchlist 249 lignes, recherche « hype » → HYPE.

**Pourquoi.** « Importer tous les coins » sans mapper chacun à la main, et pouvoir trouver des actifs comme HYPE. `/coins/markets` donne tout en un appel (prix, %24h, nom, ordre par capitalisation).

**Cheminement.** Top 250 (max d'un appel) + recherche locale plutôt que recherche globale (~17k coins, plus lourde) — couvre HYPE (#10) et tout le mainstream. `PriceMap` alimentée par les 250 → cohérence ordres/equity. **Live reste XRP/RLUSD** (cf. F-précédentes : seul actif XRPL réel). **Chart** : Binance klines → un coin absent de Binance (ex. HYPE) retombe sur le repli synthétique (watchlist/prix réels, bougies approximées).

**Bugs & fix.** Aucun (nouvelle surface). Dette : rate-limit CoinGecko free (1 appel/30 s, repli mock transitoire si 429) ; mock `data/markets.ts` reste en fallback pré-chargement (pairs « /USDC » brièvement visibles avant le 1er fetch).

**Suivi — chart des coins hors Binance (ex. HYPE).** Sélectionner un coin absent de Binance (rendu possible par F15) tombait sur le repli synthétique **sans dates** (timestamps absents) et **« trop zoomé »** (échelle Y sans marge). Fix `DashboardView` : le repli est **horodaté** (`TF_MS` : pas de l'intervalle, finissant « maintenant ») → axe des dates affiché ; et l'échelle Y reçoit **+8 % de marge** haut/bas → tracé moins serré (amélioration sur **tous** les charts, réels comme synthétiques). Vérifié headless (HYPE en 1D : dates `…/05 …/06` + bougies centrées).

---

## 2026-06-29 — F14 : refonte UX du terminal — barre de mode Paper↔Live + nettoyage spot [Phase 3, UI]

**Quoi.** Le passage Paper→Live (trading réel) était un micro-toggle noyé au milieu du ticket, sans signal d'« argent réel », et la disposition mélangeait des vestiges « perp ». Refonte du Dashboard :
- **Barre de mode** pleine largeur en tête du terminal (`.main` passe en flex colonne ; les 3 colonnes vont dans `.deck`). Segmented **Paper | Live** + contexte du compte : en Paper « Solde virtuel $… », en Live badge **« ⚡ ARGENT RÉEL »** + chip wallet (adresse raccourcie · Xaman/GemWallet, ou « Connecter le wallet »).
- **Transformation visuelle en Live** : nouveau token `--live` (ambre) ; le segment Live, le badge et une teinte diffuse (icône de paire, focus, raccourcis %) passent en ambre. Les couleurs Buy/Sell du bouton d'ordre restent **sémantiques** (vert/rouge), non teintées.
- **Zéro cul-de-sac** : cliquer « Live » sans wallet **ouvre la connexion** (Xaman/GemWallet) puis bascule automatiquement une fois résolue (`pendingLive` + `watch(walletConnected)`). Segment Live inerte si le serveur n'expose pas de quote (`/config.quoteSymbol === null`).
- **Cohérence spot** : carnet libellé `…/RLUSD` (au lieu de `/USDC`), retrait de « Funding 8h » et des types d'ordre non implémentés (Stop/Limit) → terminal **market-only** honnête. Suppression du CSS/i18n morts (`.otype`, `.lev`, `leverage`/`exposure`/`estLiq`/`orderLimit`/`limitPrice`).

typecheck + lint + build OK. **Vérifié en navigateur headless (Chrome)** : rendu **Paper** (barre + deck 3 colonnes, ticket épuré) ET **Live** (segment ambre, badge ARGENT RÉEL, chip wallet, accent diffusé) — capture via CDP en simulant un wallet connecté puis clic « Live ».

**Pourquoi.** « Comment passer en trading réel / sortir du paper » devait être évident. Le mode est un **contexte global** du terminal (argent virtuel ↔ réel), pas un sous-réglage d'ordre : il mérite une barre proéminente, un changement d'apparence (garde-fou anti-erreur) et une connexion wallet sans friction.

**Cheminement.** Option retenue (sur 3 maquettes proposées) : barre de mode en tête plutôt que switch dans le header global (réservé à l'identité) ou en tête de ticket (trop discret). Le switch vit là où on trade, avec la place pour le wallet/solde et la teinte de mode. Décision validée avec Armand avant implémentation.

**Bugs & fix.** La **barre de recherche** de la watchlist était décorative (`input` sans `v-model` ni filtrage) → câblée (`search` + `filteredMarkets`, filtre symbole/nom insensible à la casse, état vide « Aucun marché »). Vérifié headless : 9 marchés → 1 (« SOL ») en tapant « sol ». Le chart ne s'anime pas toujours en capture headless (connu) ; rendu correct en navigateur réel.

---

## 2026-06-29 — F13 : moteur d'exécution Live spot (best execution + slippage branchés) [Phase 3, chemin critique]

**Quoi.** Le swap Live existait (UI→Xaman/GemWallet→`OfferCreate` taggé) mais l'exécution était **naïve** (le front calculait `gives`/`wants` au prix spot exact, sans slippage → offre qui risque de ne pas remplir) et **bloquée** (`RLUSD_ISSUER` vide en constante front). F13 branche le vrai moteur (`@tide/xrpl` `planExecution`, écrit en F5 mais jamais câblé) et sort l'issuer en config serveur.
- **Back — moteur** : `apps/api/src/exec/plan-live.ts` (`planLiveOffer`) résout les devises (base XRP native / quote configuré), prend le prix de référence du feed et délègue à `planExecution` (compare AMM/carnet, **borne le slippage**, produit l'`OfferCreate` taggé). `LiveExecError`→400. Le contrat de route passe d'un `OfferCreate` brut à une **intention** (`account/base/side/amountBase/slippageTolerance`) ; `sourceTag` + issuer du quote restent **serveur**.
- **Back — routes** : `POST /exec/plan` (renvoie le plan = offer borné + prix, pour signature **GemWallet** côté extension) et `POST /sign/live-offer` (refait le plan puis crée le payload **Xaman**). `/exec/plan` exposé dès qu'un quote est configuré ; `/sign/live-offer` seulement si Xaman l'est aussi. `/config` étendu (`quoteSymbol`). `ExecDeps` dans `app.ts`/`server.ts`.
- **Config** : `TIDE_RLUSD_ISSUER` (`config/env.ts` `readLiveQuote`, validé), assemblé dans `main.ts` (`buildExecDeps`, **fail-loud** si issuer sans `TIDE_SOURCE_TAG`). `.env.example` + log de boot (`live:on/off`).
- **Client `@tide/client`** : `signLiveOffer`/`planLiveOffer` prennent l'intention ; types `ExecSide`/`ApiOfferCreate`/`ExecutionPlanDto` ; `PublicConfig.quoteSymbol`.
- **Front** : `useWallet.signLiveOffer(base, side, amountBase, slippage)` (GemWallet via `planLiveOffer`+`submitTransaction`, plus aucune construction de montant/sourceTag côté front) ; `DashboardView` retire `RLUSD_ISSUER`/`RLUSD_CURRENCY`/`DROPS_PER_XRP`, charge `quoteSymbol` via `/config`, constante `LIVE_SLIPPAGE=1 %`, `placeLiveOrder` envoie l'intention.

399 tests (+10), typecheck (5 packages) + lint clean. **Vérifié au runtime** (serveur réel) : OFF par défaut (`live:off`, `/exec/plan` 404) ; avec `TIDE_RLUSD_ISSUER` → `live:on`, `/config`=`{sourceTag,quoteSymbol:"RLUSD"}`, et `/exec/plan` renvoie un `OfferCreate` réel (prix XRP **live** du feed, `TakerGets` borné +1 %, `TakerPays` = drops exacts, `SourceTag` injecté) ; base non tradable → 400.

**Pourquoi.** « Passer de vrais trades spot » était la demande : la plomberie existait mais l'exécution n'était pas fiable (pas de slippage = offre qui peut rester au carnet sans remplir) ni activable (issuer en dur côté front). Le moteur best-execution dormait depuis F5 ; F13 le met enfin sur le chemin.

**Cheminement.**
- **Intention, pas montants.** Le client n'envoie plus `gives`/`wants` (qu'il calculait au prix sec) mais l'intention ; le serveur borne. Un client ne peut donc ni détourner l'attribution, ni soumettre une offre non protégée.
- **Une planification, deux signatures.** `planLiveOffer` est partagé : `/exec/plan` rend l'offer (GemWallet signe côté extension, le `SourceTag` étant déjà dans l'offer — public, pas un secret) ; `/sign/live-offer` enrobe le même plan dans un payload Xaman. DRY, et GemWallet hérite du même bornage que Xaman.
- **Prix de référence = feed.** Faute de pool on-chain câblé (`ONCHAIN_POOLS` vide), `ammPrice`=`bookPrice`=prix du feed (RLUSD pegué ≈ USD) ; la borne de slippage protège l'exécution réelle. Avec un pool on-chain, ces deux prix divergeraient (et `planExecution` choisirait le meilleur). Documenté dans `plan-live.ts`.
- **Issuer en config serveur.** `TIDE_RLUSD_ISSUER` remplace la constante front : le front ne connaît plus l'issuer (tout l'`OfferCreate` est calculé serveur), il lit juste `quoteSymbol` pour activer le bouton.
- **Code mort retiré.** `createLiveOfferSignRequest` (et `LiveOfferParams`/`LiveOfferRequest`) supprimés : le live-offer passe désormais par `createSignRequest(api, plan.offer)`.

**Frontière de vérification (honnête).** **NON testé en réel** (frontière mainnet/clés/app d'Armand) : la signature Xaman/GemWallet effective et le **remplissage on-chain** de l'`OfferCreate` (le moteur produit une offre correcte et bornée, reste à la voir s'exécuter sur le DEX). **Reste** : tester un swap de bout en bout (1 swap taggé → compteur d'attribution).

**MàJ même-jour.** RLUSD mainnet (`rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De`, vérifié doc Ripple/XRPScan) est désormais le **quote Live par défaut** (`DEFAULT_LIVE_QUOTE`) : le moteur s'active dès que `TIDE_SOURCE_TAG` est défini, sans `TIDE_RLUSD_ISSUER` (qui ne sert plus qu'à surcharger l'émetteur). Garde-fou préservé : issuer surchargé sans SourceTag → lève ; défaut sans SourceTag → Live off (mode off-chain pur). Vérifié au runtime : `/config`=`quoteSymbol:"RLUSD"` et `/exec/plan` produit l'`OfferCreate` taggé avec l'issuer mainnet.

**Bugs & fix.** Aucun (nouvelle surface). Dette : seul XRP↔quote tradable (un seul actif XRPL natif au feed) ; slippage en constante front (à exposer en réglage) ; le prix d'exécution vient du CEX tant que `ONCHAIN_POOLS` est vide.

---

## 2026-06-29 — F12c : chart trading réel (Binance klines, timeframes 15m→1W, axe des dates)

**Quoi.** Le chart utilisait des bougies inventées (RNG), puis un essai CoinGecko OHLC limité (granularité fixe 30min/4h/4j, pas de vrais 15m/1h). Bascule sur **Binance klines** (public, sans clé, sans rate-limit) :
- **Backend** : `feed/klines.ts` (`fetchKlines` + validation d'intervalle), route `GET /history/:symbol?interval=15m&limit=120` (paire dérivée `{SYMBOL}USDT`). Cache 60s conservé. `feed/ohlc.ts` (CoinGecko) supprimé.
- **Front** : timeframes = **vrais intervalles de bougie** `15m / 1H / 4H / 1D / 1W` (et plus de « grosses » plages). Chart branché sur les vraies bougies horodatées ; **axe des dates** en bas (heure pour l'intraday, date sinon). High/Low/variation calculés sur les bougies réelles.

389 tests, typecheck + lint clean. **Vérifié** : les 5 intervalles renvoient des écarts exacts (15/60/240/1440/10080 min) et des prix réels (SOL/XRP cohérents avec le marché).

**Pourquoi.** Pour du trading il faut des petites timeframes exactes (15m, 1h, 4h, 1d, 1w) avec OHLC réel et dates — ce que CoinGecko free ne fournit pas, mais Binance klines oui (intervalle exact en paramètre).

**Bugs & fix.** CoinGecko : pas de 15m/1h réels + rate-limit (429) → Binance. Le feed de prix spot (watchlist) reste sur CoinGecko (peut 429 transitoirement → prix mock le temps d'un cycle).

---

## 2026-06-28 — F12b : activation Live (clés XUMM), GemWallet, correctifs chart/landing [Phase 3]

**Quoi.**
- **Clés XUMM activées** : `dotenv` ajouté à l'API, `apps/api/.env` (gitignoré) charge `XUMM_API_KEY`/`SECRET` + `TIDE_SOURCE_TAG` + `TIDE_PRIZE_POOL_ADDRESS`. `/sign/*` monté (`xaman:on`). **Vérifié** : `POST /sign/connect` renvoie un vrai payload Xaman (uuid/signUrl/qrPng).
- **GemWallet** : second wallet dans « Connect wallet ». `@gemwallet/api` ajouté ; la modale propose **Xaman (QR)** ou **GemWallet (extension)** ; connexion = `getAddress`, swap Live = `submitTransaction`. Endpoint **`GET /config`** (SourceTag public) pour signer côté extension. Session étendue (`walletType` xaman/gem).
- **Chart** : le SOL (et tout actif réel) était cassé — prix réel injecté mais `hi`/`lo` restés mock → échelle absurde. Corrigé : le tracé démarre du **prix réel**, et `loadPrices` recale `hi`/`lo` sur le prix.
- **Timeframes** : 15m/1H/4H/1D/1W étaient inertes → câblés (état `tf` + volatilité/seed par timeframe).
- **Landing** : tags format (Paper/Competition/Rewards) → **navigation** ; bascule **SOUND [OFF]/[ON]** fonctionnelle ; mouvement magnétique des boutons retiré (directive supprimée).

389 tests, typecheck + lint clean. Build OK.

**Pourquoi.** Tour de polish post-test navigateur d'Armand : activer le Live avec ses vraies clés, ajouter le wallet qu'il utilise (GemWallet), et réparer les interactions mortes (timeframes, chart, tags, son).

**Frontière de vérification.** `POST /sign/connect` validé en réel (vrai payload). **NON testés ici** (pas d'app/extension) : signature Xaman/GemWallet réelle et swap on-chain ; rendu des bougies (l'animation ne se déclenche pas en capture headless — OK en vrai navigateur). **Reste** : `RLUSD_ISSUER` (DashboardView) à renseigner pour exécuter les swaps Live.

**Bugs & fix.** Chart : `m.lo` mock vs prix réel → départ du tracé recalé sur `m.p`. **Xaman « Erreur interne » (500)** : le transport front posait `content-type: application/json` même sans body → Fastify rejetait le JSON vide sur les POST sans corps (`/sign/connect`, `/competitions/:id/close`). Double fix : transport ne pose le header que s'il y a un body, ET parser serveur tolérant au body vide. Logos Xaman/GemWallet ajoutés à la modale. Dette : `apps/api/.env` co-localisé (chargé par cwd) ; `RLUSD_ISSUER` en constante front.

---

## 2026-06-28 — F12 : mode Live — connexion de wallet + swap réel signé Xaman [Phase 3]

**Quoi.** « Connect wallet » et le trading réel (mode Live), non-custodial via Xaman.
- **Backend** : `XamanPayloadApi.get(uuid)` (suivi de payload) + `createConnectSignRequest` (SignIn) + `getPayloadStatus`. Routes **`POST /sign/connect`** (connexion wallet) et **`GET /sign/status/:uuid`** (polling résolu/signé + adresse), montées avec le bloc XUMM. 20 tests sign (connect/status couverts).
- **Client `@tide/client`** : `connectWallet()`, `signStatus(uuid)` + type `PayloadStatus`.
- **Front** : `useSession` étendu (`liveAddress` persistant) ; **`useWallet`** (singleton : créer payload → QR → poller jusqu'à résolution, gère connexion ET swap) ; **`SignModal`** global (QR + deeplink Xaman + état). « Connect wallet » (Landing + pastille header) → SignIn → adresse stockée. **Dashboard** : toggle **Paper/Live** ; en Live, l'ordre XRP↔RLUSD construit un `OfferCreate` signé dans Xaman.

389 tests, typecheck + lint clean. Build OK.

**Pourquoi.** Le funnel du produit : paper (sans friction) → conversion en **Live** (volume réel taggé `SourceTag`, l'enjeu nº1 du hackathon). « Connect wallet » était inerte ; il fait maintenant une vraie connexion non-custodiale.

**Cheminement.**
- **Connexion = SignIn.** En XRPL non-custodial il n'y a pas de « session wallet » ; on prouve le contrôle d'une adresse via un payload `SignIn`, puis on récupère l'adresse via le polling du statut. Une seule mécanique (`useWallet.start`) sert connexion ET swap.
- **Live = XRP↔RLUSD uniquement.** Seuls XRP et les tokens émis (RLUSD) sont de vrais actifs XRPL ; les autres marchés du watchlist restent paper. Le bouton Live est désactivé hors XRP.
- **Dégradation honnête.** Sans clés XUMM côté serveur, `/sign/*` répond 404 → la modale affiche « Mode Live non configuré » (jamais d'échec muet).

**Frontière de vérification (honnête).** Le flux **compile, lint, et la mécanique est testée** (routes + fakes). **NON testé en réel** (pas de clés ici) : la signature Xaman réelle et le swap on-chain. **Pour activer** : (1) renseigner `XUMM_API_KEY`/`XUMM_API_SECRET` + `TIDE_SOURCE_TAG` + `TIDE_PRIZE_POOL_ADDRESS` dans `.env` puis redémarrer l'API (monte `/sign/*`) ; (2) pour le **swap Live**, renseigner `RLUSD_ISSUER` (émetteur RLUSD mainnet) dans `DashboardView.vue` — vide par défaut, Live désactivé tant que non fourni.

**Bugs & fix.** Aucun (nouvelle surface). Dette : `RLUSD_ISSUER` en constante front (à sortir en config/endpoint) ; le polling de statut est en `setInterval` (pas de websocket Xaman).

---

## 2026-06-28 — F11b : correctifs d'intégration navigateur (CORS, feed multi-actifs, mocks résiduels) [Phase 2]

**Quoi.** Test dans un vrai navigateur (cross-origin) → l'app paraissait 100 % mock. Causes trouvées et corrigées :
- **CORS (cause racine).** Le front (Vite, port distinct) appelait l'API sans header CORS → le navigateur **bloquait toutes les requêtes** (silencieusement) → repli systématique sur les mocks. Ajout de **`@fastify/cors`** (`origin: true`). C'est ce qui faisait que « rien ne marchait » alors que `curl`/vitest passaient.
- **Feed mono-actif.** Le backend ne cotait que XRP → SOL/BTC/ETH restaient mock et n'étaient pas tradables. Feed CEX étendu à **9 actifs** (XRP, BTC, ETH, SOL, AVAX, LINK, ARB, DOGE, OP → ids CoinGecko).
- **Header (`AppBar`).** `$128,940 / #18 / 0xPilote.eth` étaient **codés en dur** (visibles sur toutes les pages). Branchés sur le compte de session (équité/rang/identité réels, rafraîchis ; « Connect » + « — » hors session).
- **Dashboard.** Positions hardcodées → **avoirs réels** ; available/0xPilote.eth → réels ; auto-connexion d'un compte démo au montage (le terminal « marche » sans étape manuelle) ; **levier retiré** (le produit est spot, cf. SPEC) → ticket honnête (`amount/price`), suffixe `RLUSD`, « Close » = vente réelle.
- **Compétitions / Classement.** Valeurs hero codées en dur branchées sur le live : vedette (`pot`/`participants`), podium top 3 + cagnotte + « ta ligne » du classement. **Bug corrigé** : `START_EQUITY` du rendement était 100 000 au lieu de 10 000 (back). Garde podium creux : on garde le mock peuplé sous 3 entrées réelles.
- **LandingView.** Bloc vitrine entièrement mock + contrôle segmenté **Arena/Leaderboard/Rewards inerte** (l'indicateur bougeait mais aucun contenu ne changeait). Boutons → **navigation** vers les pages réelles ; « TOP TRADERS — LIVE » + le hero « Season leader » branchés sur le vrai classement.
- **Langue** : EN par défaut **strict** (détection navigateur retirée — affichait FR sur un OS FR).
- **Seed de comptes de démo** (`seed/accounts.ts`) : 6 traders préchargés (achats à prix d'entrée variés) → **classement réel et peuplé dès le boot** (équités calculées au prix courant du feed).

387 tests, typecheck + lint clean. **Vérifié dans un navigateur headless (Brave)** : EN, prix réels, header réel (rang #7), podium/table/cagnotte réels, compétitions live, ticket spot.

**Pourquoi.** L'intégration F11 était correcte au niveau contrat (curl/vitest verts) mais **jamais éprouvée dans un navigateur** : CORS la rendait inopérante côté client, et plusieurs hero/valeurs restaient des littéraux de template non branchés. Leçon : valider une intégration front/back **dans le navigateur cible**, pas seulement en curl.

**Bugs & fix.** CORS absent (bloquant) ; `START_EQUITY` 100k→10k ; levier perp sur moteur spot (retiré) ; suffixes `USDC`→`RLUSD`.

---

## 2026-06-28 — F11 : reliage front ↔ back (refonte design mergée + zones mock branchées) [Phase 2]

**Quoi.** La refonte du front (branche `design` d'un coéquipier : « terminal éditorial » bilingue FR/EN) est **mergée dans `dev`** (0 conflit — `dev` n'avait pas touché `apps/web`) puis **reliée au backend**. Les vues qui tournaient sur des mocks consomment désormais l'API réelle.
- **Back — 4 routes ajoutées** : `GET /competitions` (liste), `GET /competitions/:id` (détail), `GET /prices` (instantané du feed), `GET /accounts/:id/portfolio` (soldes valorisés + equity + pnl). Plus `CompetitionStore.list()` (in-memory + SQLite), `CompetitionService.list()/get()` (état live : participants réels, pot, clôture), `PaperService.portfolioOf()` (valorisation par devise réutilisant `equity` du core), et un **seed** de 9 compétitions de démo (`apps/api/src/seed/competitions.ts`, idempotent, ids alignés sur le catalogue front).
- **Client `@tide/client`** étendu : `competitions()`, `competition(id)`, `prices()`, `portfolio(userId)` + types `CompetitionSummary`/`Portfolio`/`Holding`.
- **Front** : `useSession` (identité partagée, userId persistant en `localStorage`) ; `usePaper` branché dessus ; `useCompetitionsLive` (fusion **catalogue de présentation + état live**) ; Dashboard (prix XRP réel, XRP ajouté comme actif tradable par défaut, ordres XRP/RLUSD effectifs) ; CompetitionsView + CompetitionView (pot/participants/statut live, join sur le compte de session, état « inscrit » réel) ; PortfolioView (holdings/equity/pnl/rang + activité = ordres réels).

387 tests (3 ajoutés au contrat client↔serveur), typecheck (5 packages, vue-tsc inclus) + lint clean. Build front OK. Smoke end-to-end vérifié (prix → ordre spot → portfolio cohérent → join → participants live).

**Pourquoi.** Le front refait était autonome (catalogue mock `data/competitions.ts`, prix simulés, portfolio en dur). Objectif : que l'UI reflète l'état RÉEL du backend pour une démo crédible, sans dénaturer le contenu éditorial (descriptifs, visuels, leaders narratifs) qui n'a pas vocation à vivre côté serveur.

**Cheminement.**
- **Séparation présentation / live.** Le modèle `Competition` du core reste **économie pure** (buyIn/rake/poids). Les routes exposent une **vue live** (`CompetitionSummary`) que le front **fusionne par `id`** avec son catalogue : les champs dynamiques (pot, participants, statut) viennent du back, le décor reste front. Migrer le copywriting bilingue au back aurait été disproportionné.
- **Portefeuille DRY.** `portfolioOf` valorise chaque avoir via `equity({[devise]: montant}, …)` et l'équité totale via `equity(soldes, …)` → une seule règle de prix, pas de duplication, cohérent avec le leaderboard.
- **Identité partagée.** Le front éclatait l'identité (userId saisi au terminal, `"0xPilote.eth"` hardcodé en compétition, rien en portfolio). `useSession` unifie : connecter le terminal renseigne l'identité de toute l'app.
- **Ordres Dashboard rendus réels et sûrs.** Ils échouaient silencieusement (quote `USDC` ≠ devise de réf `RLUSD`). Corrigé en `RLUSD` + compte de session. **Garde-fou** : on n'exécute un ordre réel que pour un actif que le backend **sait coter** (sinon l'avoir serait détenu sans prix et **casserait `equity()`**, qui lève sur prix manquant). XRP (seul actif coté) ajouté au watchlist avec son prix live et sélectionné par défaut. Levier laissé **cosmétique** (le moteur paper est spot, sans marge) : l'ordre dépense `amount` en devise de référence.
- **Décor assumé (tracé honnêtement).** Sans historique côté back : courbe d'équité, win-rate / meilleur-pire trade, chart en bougies et carnet d'ordres restent simulés (le prix d'ancrage, lui, est réel).

**Bugs & fix.** Ordres Dashboard inopérants côté serveur (quote `USDC`) → `RLUSD`. `useMarket.ts` identifié comme **code mort** (jamais importé) — laissé en l'état (code d'un coéquipier), à supprimer ou rebrancher au chart plus tard.

---

## 2026-06-23 — F10 : câblage runtime on-chain + exposition HTTP [Phase 1/2, chemin critique]

**Quoi.** Assemblage des briques F1→F9 (jusqu'ici écrites/testées mais **inertes**) dans le runtime, et exposition HTTP. Concrètement :
- **Routes HTTP** (`http/server.ts`) : `POST /sign/buy-in`, `POST /sign/live-offer` (signature Xaman) et `GET /metrics` (attribution), via deps **optionnelles injectées** (`sign`, `metrics`) + parsing au bord (`parseBuyInRequest`/`parseLiveOfferRequest`/`parseAmount`).
- **Frontières lib externe** : `connectXrplClient(url)` dans `@tide/xrpl` (unique point qui instancie `xrpl.js` au-delà de `adaptXrplClient`) et `createXamanApi(key, secret)` dans `apps/api/src/xaman/sdk.ts` (unique point qui instancie `xumm-sdk`, **ajouté en dépendance**).
- **Config env** (`config/env.ts`) : lecture + validation des variables (réutilise `assertValidAddress`/`assertAttributionTag`).
- **`main.ts`** réécrit en **assembleur** : feed on-chain (`AmmOnchainPriceProvider`), indexeur (`AttributionIndexer` + sync périodique) et signature Xaman, **chacun activé par sa config**.
- **Client typé** (`@tide/client`) étendu : `metrics()`, `signBuyIn()`, `signLiveOffer()`.

384 tests, typecheck (5 packages) + lint clean.

**Pourquoi.** Tout F1→F9 existait mais n'était **jamais instancié ni appelable** : le serveur ne servait que le Paper off-chain et le feed CEX. F10 rend le mode on-chain réellement activable **par configuration**, sans rien changer au mode off-chain par défaut.

**Cheminement.**
- **Sécurité (le point dur).** Le `sourceTag` (attribution) et la **destination du prize pool** sont injectés **côté serveur**, jamais dans le corps client : un utilisateur ne peut ni détourner l'attribution, ni rediriger un buy-in. Vérifié par test (le client n'envoie que `account`/`amount`/`competitionId`).
- **Tout optionnel + gated.** Sans config → chaque `buildXxx` retourne `undefined` → mode off-chain pur **inchangé** (garanti par structure, pas par accident). Config **partielle** de Xaman (clés sans `TIDE_SOURCE_TAG`/`TIDE_PRIZE_POOL_ADDRESS`) **lève au boot** : config cassée = bruyante, jamais silencieuse.
- **Frontières isolées.** `connectXrplClient` et `createXamanApi` sont les seuls points touchant les libs ; cast localisé via `unknown` (jamais `any`), **non testés unitairement** (réseau/clés). Toute la logique vit au-dessus, sur des interfaces testables (`XrplConnection`, `XamanPayloadApi`).
- **Ordre de construction.** Le store d'attribution est créé **avant** `createApp` (pour exposer `/metrics`) ; l'indexeur **après** (il a besoin du cache de prix pour normaliser le volume — point unique de normalisation, cf. risque tracé F4).
- **Client découplé.** Les types de contrat (`ApiAmount`, `SignRequest`, `AttributionMetrics`) sont **redéfinis** dans `@tide/client` (miroir de `@tide/xrpl`) pour ne pas tirer `@tide/xrpl`/`ws` dans le bundle front.
- **pnpm.** L'ajout de `xumm-sdk` a tiré les accélérateurs natifs **optionnels** de `ws` (`bufferutil`/`utf-8-validate`/`es5-ext`). Décision de build **explicite** dans `pnpm-workspace.yaml` : on **refuse** ces builds natifs (`ws` fonctionne en JS pur), `esbuild` conservé.

**Frontière de vérification (honnête).** Le code **compile et lint**, les routes sont **testées par `inject()` avec des fakes**, et le boot a été **vérifié empiriquement** (serveur réel) : OFF par défaut (`/metrics` et `/sign/*` absentes → 404), boot résilient au feed CEX down, et config **partielle** (Xaman OU indexeur sans `TIDE_SOURCE_TAG`, ou `=0`) qui **lève au démarrage**. **NON vérifié au runtime** (frontière mainnet/secrets d'Armand) : connexion réelle à un nœud mainnet, payload XUMM réel avec de vraies clés, sync de l'indexeur contre le ledger, et **`ONCHAIN_POOLS` est vide** (à remplir avec les vrais issuers, ex. RLUSD, pour activer le prix on-chain). **Reste à faire** : déclencher la signature depuis le **front** (UI Xaman) et fournir les vraies valeurs (`XRPL_WSS_URL`, `TIDE_SOURCE_TAG` réservé, comptes indexés, clés XUMM).

**Audit (3 sous-agents adversariaux — sécurité / correction / qualité-tests ; aucun 🔴 bloquant).** Points centraux confirmés solides par les trois : `sourceTag` + destination du prize pool **non manipulables par le client** (aucun spread du body), **zéro secret loggé**, gating OFF-par-défaut/FAIL-si-partiel, masquage des 500. Findings traités avant clôture :
- 🟠 **Indexeur fail-loud** : config `XRPL_WSS_URL` + `TIDE_INDEXED_ACCOUNTS` **sans** `TIDE_SOURCE_TAG` restait silencieusement OFF (asymétrie avec Xaman) → désormais **lève** au boot.
- 🟠 **Fuite de message amont** : le handler Fastify ne masquait que les 500 ; un futur message d'erreur Xaman/feed (502) aurait fui au client → **toute la classe 5xx** renvoie un libellé générique (`"Service amont indisponible"` pour 502).
- 🟡 **Borne haute des montants** : `assertValidAmount` (drops) n'avait pas de plafond → ajout de `MAX_XRP_DROPS` (10^17 = réserve totale), une entrée critique du chemin de signature.
- 🟡 **`readPort`** ne traitait pas `PORT=""` comme absent (crash au lieu du défaut) → passé par `optional()`.
- 🟡 **Couverture de tests** : ajout des cas `live-offer` (offre triviale `gives==wants`→400, corps invalide→400, refus Xaman→502) et **réponse Xaman partielle**→502 (+6 tests).
- 🟠→**documenté** : tout volume indexé non-XRP est normalisé à **0** tant que sa devise n'est pas au feed (dette F4) → commentaire explicite liant `SYMBOLS`/`ONCHAIN_POOLS` au volume. Recommandations laissées (hors incrément) : schéma de body strict (rejet des clés inconnues), test du `joinCompetition` (code préexistant).

**Bugs & fix.** Incohérence de nommage env **préexistante** : `.env.example` (`XRPL_WSS_URL`, `PRICE_API_URL`) ne correspondait pas au code (`CEX_BASE_URL`, et aucune URL XRPL n'était lue). Harmonisé : `XRPL_WSS_URL` retenu, `CEX_BASE_URL` conservé (déjà utilisé par le code qui tourne), `.env.example` réécrit avec toutes les variables (intégrations commentées = OFF par défaut). L'ancien `TIDE_SOURCE_TAG=0` aurait fait **lever au boot** (0 rejeté par `assertAttributionTag`) → laissé non défini dans l'exemple.

---

## 2026-06-22 — F9 : moteur de volume taggé, conditionnel + garde-fou [Phase 3, conditionnel]

**Quoi.** `packages/xrpl/src/volume/` : `evaluateVolumeTrade` (edge net d'un round-trip de volume auto-généré) et `planVolumeTrade` (décision avec **garde-fou dur**). 10 tests, typecheck + lint clean. **Décide seulement ; n'exécute pas.**

**Pourquoi.** Le « Most Volume » peut se jouer par du volume self-généré — MAIS uniquement si l'orga le compte, et **jamais à perte** (SPEC §9, garde-fou quant de la roadmap). F9 encode cette décision avec un défaut **OFF**.

**Cheminement.** `evaluateVolumeTrade` modélise les coûts d'un aller-retour : spread (×1, `relativeSpread` = spread complet), frais AMM (×2 jambes), frais réseau (×2 tx), **slippage/impact de marché** (×2). `planVolumeTrade` refuse (`skip`) tant que : moteur non activé, OU orga n'a pas confirmé le self-généré, OU edge net sous la marge.

**Audit (sous-agent) — verdict 🔴 BLOQUANT, corrigé avant commit :**
- 🔴 **Garde-fou contournable** : `minNetEdge` négatif n'était pas validé → `netEdge = -5 < minNetEdge = -10` ⇒ `trade` **à perte**. Une marge négative autorisait explicitement de perdre de l'argent. Fix : `minNetEdge` **doit être fini ≥ 0** (rejeté à la source) → `netEdge ≥ minNetEdge ≥ 0` garanti, perte impossible.
- 🟠 **Slippage ignoré** et JSDoc « conservateur » trompeuse : le slippage est toujours un coût et croît avec la taille → poser 0 fait croire +EV à tort. Fix : `slippageRate` ajouté au modèle (×2 jambes) et exposé dans `VolumeCost`.
- 🟡 Frontière `netEdge === minNetEdge` → trade (inclusif) documentée et testée ; tests ajoutés (marge négative rejetée, slippage négatif rejeté).

**Solidité confirmée (audit) :** ordre des gardes correct, défaut OFF (booléens requis, aucun appelant n'active implicitement), spread compté ×1 correct (ask−bid/mid), validation des entrées propre.

**Statut.** **Conditionnel** : à n'activer que si l'orga confirme que le volume self-généré compte (chemin critique #2) ET après validation de l'edge en petite taille sur mainnet (`quant-mentor`/`strat-audit`). Reste désactivé par défaut.

**Bugs & fix.** Le 🔴 ci-dessus (garde-fou rendu incontournable).

---

## 2026-06-22 — F8 : intégration Xaman (signature non-custodiale) [Phase 0/2, chemin critique]

**Quoi.** `apps/api/src/xaman/sign-request.ts` : `createSignRequest` + `createBuyInSignRequest`/`createLiveOfferSignRequest` créent un payload de signature XUMM (uuid + URL + QR) à partir d'une tx **non signée**, via une API XUMM **injectée**. 6 tests, typecheck + lint clean.

**Pourquoi.** Le mode Live est non-custodial : l'utilisateur signe dans Xaman, Tide ne voit jamais sa clé. F8 relie nos builders de tx taggées (F6/buy-in, offer) à Xaman.

**Cheminement / sécurité.** Les clés API/secret XUMM vivent dans l'instance SDK **injectée** (au runtime depuis l'env), **jamais lues ni manipulées** ici → adaptateur testable sans réseau ni secret. La tx transmise est non signée (juste le `txjson`). Les helpers sont `async` : une entrée invalide lève via le builder **avant** tout appel réseau (prouvé par test).

**Audit (sous-agent) — OK, non-custodial CONFORME (aucun secret/clé touché ou loggé, tx non signée, SDK injecté). 1 finding traité :**
- 🟠 `createSignRequest` accédait à `created.next.always`/`refs.qr_png` **sans garde runtime** → une réponse XUMM partielle non-null crashait en `TypeError` (au lieu de `XamanError`). Fix : garde runtime (uuid/next.always/refs.qr_png) → `XamanError` homogène + test « réponse partielle ».

**Frontière de vérification (honnête).** Adaptateur + tests livrés ; **NON câblé** au runtime (pas d'instance XUMM réelle, `xumm-sdk` pas en dépendance) — l'intégration live (clés XUMM = secrets) et le déclenchement depuis le front restent à faire/valider par Armand. Code « non vérifié » tant que pas testé sur ses clés.

**Bugs & fix.** Aucun (le finding est un durcissement défensif).

---

## 2026-06-22 — F7 : soumission de tx + classification du résultat [Phase 2]

**Quoi.** `packages/xrpl/src/client/submit.ts` : `classifyEngineResult` (préfixe `engine_result` → catégorie), `parseSubmitResult` (parse défensif), `XrplClient.submit(txBlob)`. 6 + 21 tests, typecheck + lint clean.

**Pourquoi.** Soumettre une tx signée et interpréter le résultat **sans avaler l'échec** ni le confondre avec un succès — base de la gestion d'erreurs Live (échec/partial/timeout).

**Cheminement.** Cartographie conforme à la sémantique XRPL (`tes`/`tec`/`ter`/`tem`/`tef`/`tel`), préfixe inconnu → `unknown` (jamais pris pour un succès). Caractère **provisoire** matérialisé dans le type (`provisional: true`) : un appelant ne peut pas traiter `success` comme une finalité sans le voir. Échec applicatif (`tec`/`tem`) **rapporté** (catégorie), pas levé ; panne réseau → `XrplConnectionError`.

**Audit (sous-agent) — OK, aucun bloquant ; risque « échec pris pour succès » : aucun trouvé. Améliorations appliquées :**
- 🟡 `tec` (inclus au ledger, **sequence consommé**, frais prélevés) vs `tef` (jamais inclus) étaient fusionnés sous `failed` → ajout de `includedInLedger` (dérivé) + JSDoc : distinction **critique pour un futur retry** (après `tec` il faut un nouveau sequence).
- 🟡 Remontée de `engineResultCode`, `validatedLedgerIndex` (référence pour confirmer la finalité), `queued` (provisoire ≠ rejet).
- 🟡 Tests ajoutés : gardes `=== true` (accepted/applied non-booléens → false), panne réseau directe sur `submit` → `XrplConnectionError`, `includedInLedger` tec vs tef.

**Sécurité (audit).** Rien de sensible loggé ; le `tx_blob` signé n'apparaît dans aucun message d'erreur.

**Bugs & fix.** Aucun (la cartographie était correcte ; les ajouts sont des enrichissements pour le retry/finalité).

---

## 2026-06-22 — F6 : prize pool multisig + distribution des payouts [Phase 0/2, chemin critique]

**Quoi.** `packages/xrpl/src/tx/` : `buildSignerListSet` (transforme le prize pool en multisig), `allocateLargestRemainder` (conversion drops/unités par **plus grand reste**), `buildPayoutPayments` (un `Payment` taggé `tide/payout` par gagnant). + durcissement de `assertValidAmount` (value IOU stricte). 6 + 8 + 7 + tests amount, typecheck + lint clean.

**Pourquoi.** Le prize pool est custodial le temps du tournoi (cf. SPEC : multisig, pas d'Escrow). F6 fournit la mécanique : configurer le multisig, puis distribuer les gains on-chain sans dérive de montant. Résout la dette tracée « Σ versé = distribuable arrondi » (méthode du plus grand reste).

**Cheminement.** `allocateLargestRemainder` : plancherise chaque part, distribue le reliquat aux plus grandes fractions (départage stable) → conservation exacte. `buildSignerListSet` garde le **quorum atteignable** (Σ poids ≥ quorum) : sinon les fonds seraient bloqués à jamais. Payouts : mapping index→bénéficiaire **avant** filtrage des gains nuls (pas de décalage/double-paiement), chaque montant validé.

**Audit (sous-agent) — OK MVP, solide sur le chemin réaliste (XRP/pools modestes) ; findings traités :**
- 🟠 **Value IOU exponentielle/tronquée** sur gros pools (`1e+21`, ou >15 chiffres → rejet réseau ou troncature silencieuse). Fix : `assertValidAmount` impose désormais une value IOU **décimale stricte** (regex sans exposant + ≤ 15 chiffres significatifs) → échoue **bruyamment** au lieu de produire une tx malformée. Protège aussi F5.
- 🟡 **Garde `MAX_SAFE_INTEGER`** ajoutée dans `allocateLargestRemainder` : au-delà de 2^53, un `number` ne représente plus les unités exactement → on lève (à reprendre avec la migration `number`→BigInt).
- 🟡 **Code mort retiré** : la branche `remainder < 0` était prouvée inatteignable (`round(total) ≥ Σfloors` toujours).
- 🟡 Tests ajoutés : value IOU exponentielle/>15 chiffres rejetée, pool trop grand rejeté, jamais de notation scientifique produite, conservation sur magnitudes mélangées.

**Solidité confirmée par l'audit (sans finding) :** conservation nominale, pas de double-paiement ni mauvaise destination, multisig quorum-atteignable, memo+SourceTag sur chaque payout, gain nul → pas de Payment.

**Dette (tracée, non urgente).** Non-conservation flottante 1 fois sur ~200k sur magnitudes extrêmes (1 drop) → disparaît avec `number`→BigInt au point de règlement. Troncature IOU >1e15 unités bornée par la garde MAX_SAFE.

**Bugs & fix.** Aucun bug de conservation/destination sur le chemin réaliste ; les fixes sont des garde-fous (value IOU, grands montants).

---

## 2026-06-22 — F5 : best execution (planification de swap) [Phase 2]

**Quoi.** `packages/xrpl/src/exec/route.ts` : `planExecution` compare prix AMM et carnet, retient le meilleur, applique une borne de slippage et produit l'`OfferCreate` taggé (via `buildLiveOffer`). 10 tests, typecheck + lint clean.

**Pourquoi.** Donner à l'utilisateur Live un prix attendu et une **protection de slippage** (plafond à l'achat, plancher à la vente) au moment du swap.

**Cheminement / honnêteté.** Sur le DEX natif XRPL, un `OfferCreate` croise **déjà automatiquement** carnet + AMM (XLS-30) au meilleur prix : on ne « route » donc pas l'exécution nous-mêmes. `planExecution` sert au **bornage du slippage** (limites gives/wants) et à l'affichage ; `venue` est juste indicatif. Le code le documente pour ne pas survendre de fausse valeur ajoutée.

**Audit (sous-agent) — cœur financier jugé CORRECT (sens buy/sell, cap/floor, venue), 2 findings de robustesse traités :**
- 🟠 **Montant IOU malformé** : `String(number)` pouvait produire une notation scientifique (`1.23e-10`) ou un résidu binaire 17 chiffres (`0.30000000000000004`) → `OfferCreate` rejetée **après signature** (échec Live silencieux). Fix : `formatIouValue` (arrondi à 15 chiffres significatifs, décimal), et **refus bruyant** d'un exposant plutôt qu'une tx malformée signée.
- 🟠 **Arrondi des drops en défaveur** : `Math.round` pouvait passer le plancher de vente sous la limite. Fix : arrondi **directionnel** — ce qu'on fournit (gives) → vers le bas, ce qu'on exige (wants) → vers le haut ; la borne de slippage reste un vrai plafond/plancher au drop près.
- 🟡 Tests ajoutés : quote = XRP (drops directionnels), résidu flottant nettoyé, base IOU.

**Dette tracée (chemin Live).** `formatIouValue` refuse l'exposant au lieu de l'étendre : des montants extrêmes (≈1e-7) lèveraient — à étendre si des paires à très petites valeurs arrivent. `bookPrice` est supposé toujours coté (pas de sentinelle carnet-vide) : l'appelant gère le cas.

**Bugs & fix.** Aucun bug de sens (confirmé numériquement) ; les fixes ci-dessus sont des garde-fous de robustesse du montant produit.

---

## 2026-06-22 — F4 : indexeur d'attribution on-chain (métrique reine) [Phase 1]

**Quoi.** `packages/xrpl/metrics/observe.ts` (`extractTaggedTxs` : parse défensif `account_tx` → tx taggées **réussies**), `apps/api/indexer/` (`normalizeVolume` = point unique de normalisation du volume ; `AttributionIndexer` = orchestrateur avec fenêtre figée + multi-comptes + dédup), `XrplClient.accountTx`, store idempotent. 10 + 7 + 5 + 17 tests, typecheck + lint clean.

**Pourquoi.** 3 prix sur 4 du hackathon SONT cette métrique on-chain (volume + comptes actifs taggés). C'est ce qui fait gagner ou perdre : une métrique fausse (sur- ou sous-comptée) est éliminatoire.

**Cheminement.** Point unique de normalisation du volume (résout la dette tracée depuis l'agrégateur) : drops/IOU × prix du feed, `Payment`→Amount, `OfferCreate`→TakerGets. Repli conservateur (prix manquant → volume 0 **journalisé**, jamais inventé).

**Audit (sous-agent) — verdict 🔴 BLOQUANT, 3 défauts qui faussaient la métrique sur mainnet réel (masqués par des fixtures idéalisées), TOUS corrigés avant commit :**
- 🔴 **Tx échouées comptées** : `account_tx` renvoie aussi les tx `tec*`/non validées, qui portent notre SourceTag mais n'ont aucun effet → sur-comptage. Fix : ne retenir que `validated === true` ET `meta.TransactionResult === "tesSUCCESS"` ; une tx échouée est ignorée (pas un trou), une tx réussie au statut illisible est comptée `skippedTagged` (trou signalé).
- 🔴 **Fenêtre haute mouvante** : pagination sans `ledger_index_max` → le serveur vise le dernier ledger validé, qui bouge entre les pages (miss/recompte). Fix : borne haute **figée** sur la 1re page, réutilisée sur toutes les pages et tous les comptes, curseur avancé à cette borne.
- 🔴 **Double-comptage au redémarrage** : curseur en mémoire + store sans clé unique → réindexer toute l'histoire à chaque boot multipliait le volume. Fix : **store idempotent** (`tx_hash UNIQUE` + `INSERT OR IGNORE`), `hash` remonté par l'extracteur. Le redémarrage ne double-compte plus.
- 🟠 **Périmètre mono-compte** : les swaps `OfferCreate` se signent côté JOUEUR, pas sur le prize pool → `account_tx(pool)` ne les voit jamais. Fix : indexeur **multi-comptes** (`accounts[]` : pool + comptes joueurs Live connus).
- 🟠 Gardes pagination : marker répété → stop ; `ledgerIndexMax < curseur+1` → warn (nœud à historique partiel).

**Limites d'attribution tracées (à connaître avant tout chiffre présenté) :**
- **Volume conservateur** : prix manquant → 0 (sous-comptage assumé, journalisé). Le `PriceMap` est clé par `currency` SANS issuer → un IOU homonyme (même code, autre issuer) serait valorisé au prix du vrai actif (sur-comptage). À corriger par une clé `currency+issuer` / whitelist d'issuers attribuables avant d'ouvrir le Live à des paires arbitraires.
- **Partial payments** : volume basé sur `Amount`, pas `delivered_amount` (OK tant que Tide n'émet que ses propres Payment full).
- **Curseur non persisté** : au redémarrage l'indexeur rescanne depuis `startLedger` (le store idempotent évite le double-comptage, mais c'est plus lent) → persister le curseur = optimisation future.
- **Couverture swap** : ne mesure le volume de trading que pour les comptes listés ; l'exhaustivité viendra d'un flux de ledgers filtré par SourceTag (v2).
- **`getPrices` vide au boot** → volumes en repli 0 : ne lancer l'indexeur qu'avec un prix XRP/ref valide.

**Bugs & fix.** Cf. les 3 🔴 ci-dessus (corrigés). Les tests reproduisent désormais le réel (statut tx, fenêtre figée, dédup par hash) au lieu de fixtures idéalisées.

---

## 2026-06-22 — F3 : feed de prix double source (CEX + on-chain) [Phase 0/1]

**Quoi.** `apps/api/src/feed/compose-price.ts` : `composePrice` (pur : combine prix CEX + on-chain avec garde de divergence) et `composePriceMap` (orchestration par symbole + repli). `onchain-price.ts` : `AmmOnchainPriceProvider` (spot AMM via `XrplClient`, symbole→paire). Câblé dans `createApp` (source on-chain + options optionnelles). 14 + 4 tests, typecheck + lint clean.

**Pourquoi.** La roadmap demandait un feed à double source (carnet/AMM on-chain + API CEX) avec cache et garde-fou. Le CEX (profond, peu manipulable) reste la référence de valorisation ; l'on-chain ajoute le prix exécutable et un cross-check anti-manipulation.

**Cheminement.** Garde de divergence `|cex−onchain|/min` : au-delà du seuil (5 % défaut), on **lève** plutôt que publier un prix on-chain suspect, et `composePriceMap` retombe sur le CEX (journalisé). Une seule source dispo → on l'utilise ; aucune → symbole omis (jamais de prix faux/0). Sans source on-chain, `composePriceMap` renvoie le CEX restreint aux symboles → **non-régression** prouvée (`app.test` inchangé).

**Audit (sous-agent) — OK, non bloquant ; findings traités :**
- 🟠 `feedLogger` optionnel → replis non journalisés si non câblé (viole « jamais avaler un repli ») → **logger console par défaut** dans `createApp`.
- 🟠 Trou de test : `prefer onchain` + divergence → repli CEX (cas le plus subtil) → test ajouté (+ concordance prefer onchain, + non-fuite de symbole).
- 🟡 Le provider on-chain faisait confiance aveugle au lecteur → valide désormais le prix (`NaN`/0/négatif/∞ → `undefined` = pas de source, message de repli juste).

**Dette tracée (F-1).** La `PriceMap` produite est toujours un prix de **valorisation** (jamais garanti exécutable) : `prefer: "onchain"` n'est qu'une préférence en cas de concordance, et un repli CEX peut donner un prix non exécutable sur le DEX. Le mode Live devra lire le prix exécutable directement (carnet/AMM au moment du swap), pas via ce feed de valorisation.

**Frontière de vérification (honnête).** `composePrice`/`composePriceMap`/provider testés avec faux lecteur. **NON vérifié** : la lecture on-chain réelle (dépend de F1 `adaptXrplClient` sur mainnet + un pool AMM XRP/RLUSD réel) — à brancher et valider par Armand.

**Bugs & fix.** Aucun (la garde de divergence et la non-régression sont confirmées par l'audit).

---

## 2026-06-22 — F2 : lecteur de carnet d'ordres (book_offers) [Phase 2]

**Quoi.** `packages/xrpl/src/price/book-reader.ts` : `readBestAsk`/`readBestBid`/`readBookQuote` (bid, ask, mid, spread d'une paire au DEX natif), client `book_offers` injecté. `XrplClient.bookQuote` câblé (helper `request` factorisé : connexion + parse + wrap réseau, partagé avec `ammSpotPrice`). Parsing défensif `parseBookOffersResult`. 7 + 14 tests, typecheck + lint clean.

**Pourquoi.** Le carnet est la 2e source de prix (avec l'AMM) et la base du best-execution (F5 : router carnet vs pool). Brique réseau testable, comme F1.

**Cheminement.** Prix calculé depuis `TakerGets`/`TakerPays` via `ammSpotPrice` (réutilise `amountToQuantity`, qui gère les drops XRP) **plutôt que le champ `quality`** du protocole, dont l'échelle dépend de la présence de XRP d'un côté (piège de conversion classique évité). Bid = book inverse, exprimé en quote/base comme l'ask → mid/spread cohérents. Carnet croisé (ask < bid) → `InvalidPriceError` (jamais de prix faux).

**Audit (sous-agent) — bid/ask jugés CORRECTS (le risque grave craint était sain), 1 finding traité :**
- 🟠 **Funded partiel** : `offerAmounts` prenait `gets_funded`/`pays_funded` indépendamment → si un seul côté était présent, on mélangeait un montant réduit et un montant plein = **prix faux silencieux**. rippled les émet toujours ensemble, mais le code ne le garantissait pas → garde **tout-ou-rien** au point de calcul (`InvalidPriceError` si un seul côté funded) + test.
- 🟡 **Dette tracée (F2-4)** : ask et bid sont lus en 2 requêtes (ledger courant non figé) → un croisement transitoire sous forte activité peut lever `InvalidPriceError`. C'est une **protection**, pas un bug (le feed retente) ; lecture atomique sur `ledger_index` figé = amélioration future. Documenté dans le code.

**Bugs & fix.** Aucun bug de formule (sens des prix confirmé numériquement) ; le fix funded est un garde-fou de robustesse.

---

## 2026-06-22 — F1 : adaptateur client XRPL live [Phase 0/2, chemin critique]

**Quoi.** `packages/xrpl/src/client/` : la couche réseau qui manquait. Interface `XrplConnection` (connect/disconnect/isConnected/request) **injectée** → toute la couche est testable sans réseau ; `adaptXrplClient(Client)` adapte un vrai `Client` xrpl.js ; classe `XrplClient` (cycle de connexion typé + `ammSpotPrice` qui réutilise le lecteur AMM pur audité) ; parsing défensif `parseAmmInfoResult`. 12 tests, typecheck + lint clean.

**Pourquoi.** Le DEVLOG actait la frontière « code pur fait, adaptateur réseau à écrire ». C'est la fondation de tout l'on-chain (lecture AMM/carnet, indexeur, soumission) : sans elle, rien ne touche le mainnet. Construite injectable d'abord (faux client en test) pour ne pas livrer du code réseau aveugle.

**Cheminement.** Une seule frontière avec xrpl.js (cast `unknown` localisé dans `adaptXrplClient`, jamais `as any`), car sa surcharge `request` est générique. Tout le reste vit sur `XrplConnection` (testable). `ammSpotPrice` ne réimplémente rien : parse défensif → `readAmmSpotPrice` (math auditée). Erreurs typées (`XrplConnectionError` réseau vs `XrplRequestError` donnée incohérente) : aucun prix faux silencieux (tout cas incohérent lève).

**Audit (sous-agent) — findings traités avant commit :**
- 🟠 `amm: null` était traité comme réponse **malformée** au lieu de **pool absent** → tolère `null` comme « pas de pool » (cas géré).
- 🟠 Une panne réseau de la **requête** post-connexion (ws coupé, timeout, rippled tooBusy — le scénario mainnet le plus fréquent) remontait **brute**, hors du contrat d'erreurs → enveloppée en `XrplConnectionError` (la cause est réseau ; les `XrplRequestError` de parsing remontent telles quelles).
- 🟡 Idempotence connect **sûre en concurrence** : promesse de connexion in-flight partagée (N lectures simultanées d'un feed ne connectent qu'une fois).
- 🟡 Tests de bord ajoutés : `result: null` → `XrplRequestError` ; `amm: null` → `InvalidPriceError` ; réserve string non-numérique → `InvalidAmountError` ; panne réseau requête → `XrplConnectionError` ; connexions concurrentes → 1 seule.

**Frontière de vérification (honnête).** Garanti : 12 tests sur `XrplConnection` injectable + typecheck. **NON vérifié ici** : `adaptXrplClient` sur un vrai `Client` mainnet (non testable sans réseau) — petit, typé, à valider lors du branchement mainnet par Armand.

**Bugs & fix.** Aucun (les findings ci-dessus sont des durcissements, pas des bugs de logique).

---

## 2026-06-22 — Front : refonte UI style « Analogue » + hero light-tunnel animé [Phase 1, UI]

**Quoi.** Refonte visuelle complète du front (`apps/web`) dans le langage **Analogue** (cinématique, achromatique strict, thème dark) : design system (tokens, base CSS, substituts libres Inter/VT323), **landing** avec hero **tunnel de lumière animé en canvas** (rayons radiaux, bloom, parallaxe au curseur) + titre révélé mot par mot, refonte des 3 vues (terminal, leaderboard, compétitions), nav pill flottante frostée, routeur par hash (zéro dépendance). Commit `9585712` (mergé dans `main` via PR #1).

**Pourquoi.** Le MVP front précédent était fonctionnel mais brut (HTML quasi nu) ; Armand voulait « un vrai site » à partir d'une référence de design précise.

**Cheminement.** Le 1er essai (hero en `radial-gradient` CSS flou) faisait « AI-generated » → refait en **canvas animé** (centaines de stries radiales, allumage `easeOut`, scintillement), seule la référence visuelle (light-burst bleu-blanc) porte la couleur. Achromatie stricte tenue **même pour le trading** (PnL/sens par signe/caret/nuances de gris, jamais de vert/rouge).

**Vérification (honnête).** typecheck (`vue-tsc`), lint, build OK, 237 tests (logique des composables). **Rendu visuel validé empiriquement** par captures headless (Chrome `--screenshot`/`--print-to-pdf`, `--force-prefers-reduced-motion` pour figer l'anim) — le bloom plein écran colle à la référence. Bug corrigé au passage : canvas noir en `prefers-reduced-motion` (resize effaçait sans repeindre).

**Bugs & fix.** Cf. repaint reduced-motion ci-dessus.

---

## 2026-06-21 — Décision produit : levier/short évalués et écartés (spot-only assumé) [Stratégie]

**Quoi.** Évaluation honnête du doute « le spot sans levier c'est branlant, on peut pas short ». Conclusion : **le spot non-custodial tient debout pour Make Waves** ; le perp custodial est faisable mais déconseillé. Analyse complète dans [`docs/PERP-CEX-FEASIBILITY.md`](PERP-CEX-FEASIBILITY.md).

**Pourquoi.** Conviction du fondateur sur la valeur produit — il faut trancher avant d'investir plus.

**Cheminement (alternatives évaluées) :**
- **Spot sans levier « branlant » ?** Non, à une condition : **classer sur le risk-adjusted (Calmar/Sharpe + drawdown), pas sur le PnL brut** (sinon = casino qui récompense la chance). La métrique de classement EST le curriculum. Le levier n'ajoute pas de skill, il ajoute de la toxicité pour des débutants. Les memecoins XRPL volatils fournissent l'action sans levier.
- **Short ?** Vrai manque : en spot pur on ne vend que ce qu'on détient (pas de profit sur la baisse, seulement passer cash). Vérifié : lending natif **XLS-66 en vote, PAS mainnet**, et de toute façon non-collatéralisé institutionnel → ne donne pas de short retail. Smart contracts toujours hors mainnet.
- **Perp « comme un CEX » (custodial off-chain) ?** Techniquement faisable (mini-BitMEX) MAIS : trades off-chain → **aucun `SourceTag`** → tue 3 prix sur 4 du hackathon ; XRPL devient un rail interchangeable (donc pas un projet XRPL) ; custodial + honeypot ; **régulé** (sérieux pour un projet étudiant) ; on est la maison (risque de contrepartie) ; risk/liquidation engine = cœur dangereux, ni coupable ni sûr en 90j. **Déconseillé.**

**Décision / fork (en attente de la conviction d'Armand).** Soit (1) **Make Waves = spot non-custodial** assumé et rendu bon (scoring risk-adjusted + memecoins) ; soit (2) **produit perp = autre chaîne, autre moment, en DEX** (pas ce hackathon). Pas de troisième voie (le perp-CEX sur XRP = pire des deux mondes).

**Bugs & fix.** Correction d'une affirmation antérieure : j'avais dit « pas de lending du tout » — en réalité XLS-66 arrive (mais en vote, non-collatéralisé, donc sans effet sur le short retail). Sources : [known-amendments](https://xrpl.org/resources/known-amendments), [crypto.news lending XRPL](https://crypto.news/xrpl-lending-protocol-xrp-on-chain-credit/).

---

## 2026-06-21 — Outillage du spike d'attribution mainnet (hand-off Armand) [Phase 0, chemin critique]

**Quoi.** `docs/SPIKE.md` (runbook précis du spike) + script `pnpm --filter @tide/api spike:tx` qui construit une **tx taggée prête à signer** (`Payment` buy-in + `OfferCreate` swap) via les builders `@tide/xrpl` déjà testés.

**Pourquoi.** Décision : Armand fait le **spike mainnet en premier** (dé-risque tout le live). Mon rôle : le rendre exécutable en 2 minutes. Le script ne touche à **aucune clé** (il imprime juste le JSON de la tx) ; Armand signe/soumet via Xaman avec son wallet mainnet et vérifie que le compteur de l'orga monte.

**Cheminement.** Réutilise `buildBuyInPayment`/`buildLiveOffer` (audités). Paramètres via env (`TIDE_ACCOUNT`/`TIDE_DESTINATION`/`TIDE_SOURCE_TAG`). Sortie vérifiée : JSON de tx valide, `SourceTag` posé, Memos hex corrects (`tide/join`, `spike`).

**Frontière / hand-off.** L'intégration **live** (adaptateur xrpl `Client` réel, payloads Xaman avec clés XUMM, indexeur alimentant `SqliteAttributionStore` déjà prêt) sera écrite **après** que le spike a confirmé l'attribution — et testée par Armand sur son mainnet. Je ne livre pas de code live aveugle (règle « ne jamais affirmer fonctionnel sans vérifier »).

**Bugs & fix.** Aucun (sortie du script vérifiée).

---

## 2026-06-21 — Front MVP : composables testés + vues terminal/leaderboard/compétitions [Phase 1, UI]

**Quoi.** Logique du front extraite en **composables testables** (`usePaper`, `useLeaderboard`, `useCompetitions`), et 3 vues minces (`TerminalView`, `LeaderboardView`, `CompetitionsView`) + nav à onglets dans `App.vue`. 237 tests (9 composables ajoutés), typecheck `vue-tsc` + lint clean, **build OK**. Le loop produit complet est démontrable.

**Pourquoi.** Couvrir l'essentiel du produit côté UI (paper trading + leaderboard + compétitions) tout en gardant la **logique testable sans navigateur** : la réactivité Vue (`ref`) marche en node, donc les composables se testent sous vitest (pas de jsdom), et les `.vue` restent des coquilles minces juste build-vérifiées.

**Cheminement.** Composables = injection du `TideClient` → testés avec un transport stub (routes → réponses). Gestion d'erreur centralisée (`errorMessage`), 409 « compte existant » toléré explicitement. Un seul client partagé par les vues (créé dans `App.vue`).

**Frontière de vérification (honnête).** Garanti : build (`vite build` ✓), types (`vue-tsc` ✓), **logique des 3 composables testée** (connexion, 409 toléré, ordre + refresh, erreurs, chargement leaderboard, create/join/close compétitions). NON vérifié ici : le **rendu visuel / l'UX** des `.vue` — à valider de tes yeux (`pnpm --filter @tide/web dev`, avec l'API lancée).

**Bugs & fix.** Aucun.

---

## 2026-06-21 — Front : scaffold Vue 3 + Vite + terminal paper [Phase 1, UI]

**Quoi.** `apps/web` : app **Vue 3 + Vite** (SPA). Transport HTTP `createFetchTransport` (branche `@tide/client` sur `fetch`, injectable). `App.vue` = terminal paper minimal mais fonctionnel : connexion par identifiant, affichage des soldes, formulaire d'ordre, historique. 228 tests, typecheck (`vue-tsc`) + lint clean, **build OK**.

**Pourquoi.** Première vue consommant l'API. Choix Vue 3 + Vite (vs Nuxt de la SPEC) validé par Armand : plus léger, build vérifiable ici.

**Cheminement.** `createFetchTransport` injectable (comme les autres adaptateurs) → testable sans réseau. `.vue` typés par `vue-tsc` (et ignorés par eslint, qui ne les parse pas). Gestion d'erreur propre côté UI : le 409 « compte déjà ouvert » est ignoré explicitement à la connexion, toute autre erreur remonte (pas de catch avale-tout).

**Frontière de vérification (honnête).** Ce que je garantis : le front **compile** (`vite build` ✓), **typecheck** (`vue-tsc` ✓), et la **logique du transport est testée** (2 tests : préfixe URL, sérialisation JSON, GET sans corps). Ce que je NE peux PAS vérifier ici : le **rendu visuel / l'UX réels** — ça reste à valider de tes yeux (`pnpm --filter @tide/web dev`).

**Bugs & fix.** Aucun. Augmentation de `ImportMetaEnv` (`VITE_API_BASE`) ajoutée pour que `vue-tsc` passe.

---

## 2026-06-21 — Client API typé `@tide/client` [Phase 2, vers le front]

**Quoi.** `packages/client` : `TideClient` typé qui couvre toutes les routes (comptes, ordres, leaderboard, compétitions) via un **`ApiTransport` injecté**. Erreurs serveur mappées en `TideApiError` (message extrait du corps). 226 tests (8 unitaires + 3 d'intégration). typecheck + lint clean.

**Pourquoi.** Brique la plus **vérifiable** du front : le pont typé entre l'UI (Nuxt, à venir) et l'API. Le construire et le tester d'abord garantit le contrat avant d'écrire la moindre vue.

**Cheminement.** Transport injecté (comme le feed CEX / le lecteur AMM) → testable sans réseau. Encodage des segments de chemin (`encodeURIComponent`). Les réponses (de notre propre API typée) sont castées vers le type attendu (`as T`, pas `as any`) — choix assumé et commenté (contrat de confiance).

**Vérification (forte, intégration réelle) :**
- 8 tests unitaires : construction correcte des requêtes (méthode/chemin/corps), encodage, mapping d'erreur.
- 3 tests d'**intégration contre le vrai serveur** (transport branché sur `inject()`) : flux complet comptes+ordres+leaderboard, flux compétitions create/join/participants/close, mapping d'une erreur serveur → `TideApiError`. **Prouve que client et serveur s'accordent sur le contrat.**

**Note de jugement.** Pas d'audit sous-agent séparé : le test d'intégration contre le serveur réel est la vérification décisive pour une couche contrat, plus forte qu'une relecture ; la surface est petite et idiomatique.

**Bugs & fix.** Test d'intégration initial faux (pas le code) : `/leaderboard` levait « Prix manquant pour XRP » car le cache de prix n'était pas rafraîchi → corrigé (feed avec prix + `refreshPrices` avant les requêtes). Comportement serveur correct.

---

## 2026-06-21 — Câblage SQLite dans l'app runnable (persistance au redémarrage) [Phase 1]

**Quoi.** Les stores SQLite sont désormais **utilisés par le serveur** : `createApp` accepte des stores optionnels, `main.ts` ouvre une **connexion SQLite partagée** (fichier `tide.db`, via `TIDE_DB_PATH`) et y branche les deux stores. Les constructeurs `Sqlite*Store` acceptent une connexion partagée (`string | DatabaseSync`). 215 tests, typecheck + lint clean.

**Pourquoi.** Sans ce câblage, la persistance existait mais le serveur tournait en mémoire. Maintenant les données **survivent au redémarrage** (essentiel pour un concours de traction 90 j).

**Cheminement.** Une seule connexion `DatabaseSync` partagée par les deux stores (pas deux connexions concurrentes sur le même fichier → pas de verrou). `createApp` reste pur (stores injectés), `main.ts` fait le câblage runtime. Fichiers `*.db` ignorés par git.

**Vérification (empirique, end-to-end) :**
- 2 tests : deux instances de store sur la même connexion voient les mêmes données ; une nouvelle app sur la même base retrouve les comptes (simule un redémarrage).
- **Smoke-test réel de persistance disque** : serveur démarré (fichier), `POST /accounts` + `POST order` → soldes `{RLUSD:9950, XRP:100}`. Process **hard-killé**. Redémarrage sur le **même fichier** → `alice` retrouve ses soldes ET son historique d'ordres. Compte inconnu → 404. C'est la preuve que la persistance disque marche (les writes SQLite sont committés synchronement, donc résistants au kill).

**Note de jugement.** Pas d'audit sous-agent séparé pour ce câblage : la vérification décisive (le vrai cycle redémarrage) est empirique et plus forte qu'une relecture, et les stores sous-jacents étaient déjà audités. Amélioration future possible : handler SIGTERM → `db.close()` (non requis, les données persistent déjà au kill).

**Bugs & fix.** Aucun.

---

## 2026-06-21 — Persistance DB complète : services derrière une abstraction Store [Phase 1]

**Quoi.** Refactor des deux services derrière une abstraction `Store`, avec deux implémentations chacune : `AccountStore`/`CompetitionStore` → `InMemory*` (défaut) + `Sqlite*` (`node:sqlite`, zéro dépendance native). `PaperService` et `CompetitionService` ne contiennent plus que la logique métier ; la persistance est injectée. Helper `openDatabase` factorisé (le store d'attribution migré dessus aussi). 213 tests, typecheck + lint clean.

**Pourquoi.** La roadmap prévoyait de remplacer l'in-memory par une DB (survie au redémarrage, essentiel pour un concours de traction 90 j). L'abstraction permet de basculer in-memory ↔ SQLite sans toucher aux services, et de **prouver l'équivalence** des deux par des tests paramétrés.

**Cheminement.** API publique des services **inchangée** (store injecté avec défaut in-memory) → les anciens tests passent tels quels (non-régression). Schémas SQLite avec requêtes **préparées paramétrées** (anti-injection), `applyOrder` **transactionnel** (BEGIN/COMMIT/ROLLBACK) pour l'atomicité soldes+ordre. Poids de répartition sérialisés en JSON. Tests **paramétrés** : les mêmes assertions tournent contre InMemory ET SQLite (encapsulation, atomicité, ordre, anti-double-paiement, multi-devises).

**Audits (2 sous-agents) — OK à commit :**
- *Comptes* : zéro 🔴/🟠. Atomicité **vérifiée empiriquement** (vrai ROLLBACK après erreur en milieu de transaction → état restauré), équivalence in-memory/SQLite confirmée, garantie d'atomicité de `placeOrder` préservée (validation+solde AVANT mutation), non-régression prouvée.
- *Compétitions* : 1 🟠 corrigé — `JSON.parse` pouvait lever un `SyntaxError` brut (corruption disque) au lieu d'`InvalidCompetitionError` → enveloppé dans try/catch (« transformer, pas avaler »). Anti-double-paiement préservé (`markClosed` après calcul), `closed` INTEGER bien relu en boolean, équivalence confirmée.
- 🟡 laissés (MVP) : FK SQLite (off par défaut dans node:sqlite ; invariants garantis côté service), requête `has()` redondante, fermeture des stores `:memory:` en test.

**Bugs & fix.** Cf. le 🟠 JSON ci-dessus. Aucun bug de comportement (équivalence et non-régression prouvées par tests).

---

## 2026-06-21 — Lecteur de prix AMM on-chain (xrpl/price) [Phase 1/2]

**Quoi.** `readAmmSpotPrice(client, asset, asset2)` : lit le prix spot d'un pool AMM via `amm_info`, avec un **client injecté** (sous-ensemble testable sans réseau). Retourne le prix d'`asset` en `asset2` depuis les réserves. 189 tests, typecheck + lint clean.

**Pourquoi.** Première source de prix **on-chain** (l'AMM est une liquidité native XRPL), complément du feed CEX. Le carnet d'ordres (`book_offers`) est volontairement reporté : sa sémantique `quality` (drops vs unités) est délicate et à valider en mainnet.

**Cheminement.** Formes de réponse **vérifiées contre les types xrpl.js 4.6.0** (`result.amm.amount`/`amount2`). Interfaces minimales (pas d'import de types xrpl fragiles) + client injecté → testable par fixtures.

**Bugs & fix — 🔴 BLOQUANT rattrapé par l'audit (sous-agent, avec vérif doc XRPL) :**
- Première version mappait `amount`→asset et `amount2`→asset2 **par position**. Or la doc XRPL est explicite : `amm_info` renvoie les réserves dans un **ordre canonique interne du protocole, PAS l'ordre de la requête** (« This could be `asset` _or_ `asset2` from the request »). → pour la moitié des paires, le prix aurait été **inversé**. Mon test initial passait à tort (la fixture encodait l'hypothèse fausse).
- **Fix** : apparier chaque réserve à sa **devise** (`reserveMatchesCurrency`), jamais à sa position. Test ajouté du cas **ordre inversé** (aurait attrapé le bug), + pool absent → `InvalidPriceError`, asset introuvable → `InvalidPriceError`, paire token/token.
- 🟠 corrigés aussi : garde-fou pool absent (erreur typée au lieu d'un `TypeError` nu) ; commentaire corrigé (un vrai `Client` xrpl.js n'est PAS directement assignable → **adaptateur requis** au point d'injection mainnet, tracé).

**À valider en mainnet (chemin critique).** Confirmer le sens du prix sur une paire dont le prix attendu est connu (le mapping par devise est correct en théorie, mais l'intégration réelle doit le prouver).

---

## 2026-06-21 — Persistance SQLite des événements d'attribution (apps/api/store) [Phase 1]

**Quoi.** `SqliteAttributionStore` : persiste les transactions d'attribution observées (`ObservedTx`) via le module **builtin `node:sqlite`** (zéro dépendance native). `record()` insère ; `metrics()`/`windowedMetrics()` relisent et agrègent via la logique `@tide/xrpl` déjà auditée. 182 tests (dont 8 ici), typecheck + lint clean.

**Pourquoi.** Premier morceau de persistance réelle (la roadmap prévoit de remplacer l'in-memory). L'indexeur on-chain (à venir, nécessite mainnet) écrira ici chaque tx taggée ; le score du hackathon se calcule en relisant le store. Démontre le pattern DB que le reste suivra.

**Cheminement.** `node:sqlite` choisi pour éviter toute compilation native (better-sqlite3) — important en sandbox/CI. Requêtes **préparées paramétrées** partout (pas d'injection). Validation à l'écriture (volume, sourceTag, ledgerIndex) cohérente avec l'agrégation. Réutilise `aggregateAttribution`/`filterByLedgerRange` (DRY, pas de réimplémentation).

**Audit (sous-agent) — OK à commit, zéro bloquant :** pas d'injection SQL (requêtes préparées), `createRequire` confirmé typé (pas d'`any` qui fuit, `.all()` reste `Record<string, SQLOutputValue>`), `rowToTx` sans `any`, validation cohérente, `close()` libère la connexion. 🟡 (plus tard) : index disque, revérif `isFinite` à la lecture — non nécessaires pour le MVP mono-écrivain.

**Bugs & fix.** `node:sqlite` n'est pas résolu par le bundler de vitest (vite strippe `node:` → cherche un paquet `sqlite` inexistant → « Failed to load url sqlite »). Fix : chargement via `createRequire(import.meta.url)("node:sqlite")` avec `import type` (erased) + cast `as typeof import("node:sqlite")` → typage conservé, hors analyse de vite.

---

## 2026-06-21 — Backend runnable : cache de prix + createApp + entrypoint [Phase 1]

**Quoi.** `PriceCache` (instantané sync + maj async), `createApp(config)` (assemble services + cache + serveur, sans effet de bord, testable) et `main.ts` (entrypoint : `fetch` réel, env, `listen`, refresh périodique). Le backend **tourne** maintenant. 174 tests, typecheck + lint clean.

**Pourquoi.** Rendre le backend démarrable tout en gardant la logique testable. Le `PriceCache` résout proprement le mismatch `getPrices` **sync** (lecture fréquente) vs feed **async** (réseau périodique).

**Cheminement.** `createApp` est pur (pas de `listen`/timer) → testable ; `main.ts` ne fait que le câblage runtime. Résilience : un feed CEX en panne **n'empêche pas le démarrage** (refresh best-effort, erreurs loggées non avalées) ; `setInterval` + `timer.unref()`.

**Vérification (pas seulement des tests) :**
- Test d'intégration : vrai `app.listen({port:0})` + `fetch` réel → `/leaderboard` répond 200.
- **Smoke-test du binaire** `main.ts` lancé pour de vrai (PORT=3999, CEX injoignable) : log « Tide API à l'écoute sur :3999 », `GET /leaderboard` → `[]`, `POST /accounts` → 201, `GET …/balances` → `{"RLUSD":10000}`. Le feed en échec est bien rattrapé. Serveur arrêté ensuite.

**Audit (sous-agent) — OK sans réserve (zéro 🔴/🟠) :** encapsulation cache OK, `getPrices` = closure paresseuse (lit l'état frais), résilience et `unref()` confirmés, isolation des types Node (apps/api seulement). 🟡 borne haute du PORT ajoutée (≤ 65535).

**Bugs & fix (infra importante).** En passant `apps/api` au typecheck, découverte que **`pnpm typecheck` ne couvrait que `packages/*`** (la racine n'incluait pas `apps/`) → `apps/api` n'était jamais typé par `tsc` (seulement esbuild/eslint). Corrigé : typecheck **par-package** (`pnpm -r`), `@types/node` + `types:["node"]` isolés à `apps/api`. Quelques erreurs de typage dans les tests (PriceMap `readonly`, payloads `inject`) corrigées au passage. Les packages purs restent sans types Node (isolation préservée).

---

## 2026-06-21 — Adaptateur feed de prix CEX (apps/api/feed) [Phase 0/1]

**Quoi.** `fetchCexPrices(config, symbols, fetchJson)` : interroge une API CEX (type CoinGecko `/simple/price`) et retourne une `PriceMap`. `fetchJson` est **injecté** → testable sans réseau. 170 tests, typecheck + lint clean.

**Pourquoi.** Première source de prix off-chain réelle (XRP + majors), destinée à câbler le `getPrices` du serveur HTTP (aujourd'hui un fake). Bridge entre le cœur de prix pur (déjà livré) et le monde réel.

**Cheminement.** Le `fetchJson` injecté découple du réseau (test = faux, prod = wrapper de `fetch`). Parsing **défensif** de la réponse upstream non fiable : objet validé, entrée par id présente, prix `number` fini > 0, sinon `PriceFeedError`. Mappé en **502** côté HTTP (échec amont, pas faute client). Encodage défensif des composants d'URL.

**Audit (sous-agent) — OK à commit, zéro bloquant :**
- Parsing d'entrée hostile **solide** : aucune réponse malformée ne produit une PriceMap fausse ni un crash hors `PriceFeedError`. `as Record<string, unknown>` confirmé sûr (narrowing post-guard, pas `as any`).
- Injection d'URL : risque jugé théorique (ids = config de confiance, symboles inconnus filtrés avant l'URL) ; durci quand même via `encodeURIComponent`.
- 🟡 Test ajouté : devise absente de l'entrée (cas prod le plus probable).

**Bugs & fix.** Aucun.

---

## 2026-06-21 — Couche HTTP : serveur Fastify injectable (apps/api) [Phase 1]

**Quoi.** `buildServer(deps)` (Fastify v5) expose les services en HTTP : comptes (`POST /accounts`, `GET …/balances`, `…/orders`), ordres (`POST …/orders`), `GET /leaderboard`, compétitions (`POST /competitions`, `…/join`, `…/close`, `GET …/participants`). + `parse.ts` (validation runtime au bord, sans `any`) et `errors.ts` (mapping erreur typée → code HTTP). 161 tests dont les routes via `inject()`. typecheck + lint clean.

**Pourquoi.** Rend le backend **appelable** tout en restant testable : `buildServer` retourne l'instance, aucune écoute réseau → tests in-process via `inject()` (pas de port, pas de réseau).

**Cheminement.** Dépendances **injectées** (`paper`, `competition`, `getPrices`) → fakes en test, vrai feed plus tard. Erreurs domaine mappées par **nom** (pas `instanceof`, évite le couplage cross-package) : 400 (validation), 404 (absent), 409 (conflit), 500 masqué. Validation au bord (`parseOrder`/`parseCompetition`/`parseUserId`) qui rejette les corps malformés avant le domaine ; narrowing `as Record<string, unknown>` après guard runtime (pas `as any`).

**Audit (sous-agent) — OK à commit, zéro bloquant :**
- Anti-fuite d'info **confirmée** : 500 masqué en « Erreur interne », 4xx n'exposent que des libellés/ids fournis par le client. Mapping `statusForError` **vérifié exhaustif** contre les 4 sources d'erreurs.
- Validation au bord **non contournable** (amount string, pair manquante, poids non-number rejetés). Pas de double-réponse (pattern `reply.code()` + `return` correct en Fastify v5).
- 🟠 Test ajouté : le chemin **500** (verrouille la non-fuite — `getPrices` qui lève → `{error:"Erreur interne"}`, pas le secret). 🟡 + 404 sur close inconnu.

**Bugs & fix.** Test de clôture : mon attente était fausse (2 participants / 3 tiers → seuls tiers 1+2 versés = 16, reliquat 4 ; pas 20). Corrigé — le comportement sous-rempli du domaine était juste.

---

## 2026-06-21 — Couche application : `CompetitionService` in-memory (apps/api) [Phase 1]

**Quoi.** `CompetitionService` : cycle de vie des tournois en mémoire (créer, rejoindre, clôturer). `close()` classe les participants par equity via un `EquityProvider` injecté, calcule payouts + reliquat (moteur `@tide/core`), et marque la compétition clôturée. 148 tests, typecheck + lint clean.

**Pourquoi.** Complète le « moteur de compétitions » de la roadmap côté **état/lifecycle** (le pur calcul était déjà livré). C'est ce qui orchestre buy-in → tournoi → distribution.

**Cheminement.** `EquityProvider` (`(userId) => number`) **découple** la clôture de `PaperService` (le caller câble `(u) => paper.equityOf(u, prices)`) → testable sans monter tout le paper. Anti-double-paiement par conception : `state.closed = true` est positionné **après** tous les calculs ; toute exception (provider qui lève, equity NaN) laisse la compétition **ouverte et réessayable**. L'ancrage on-chain (buy-in `Payment` taggé) reste produit séparément par `@tide/xrpl`.

**Audit (sous-agent) — OK à commit, zéro bloquant :**
- Anti-double-paiement et cohérence d'état **validés empiriquement** par l'audit (sondes) : double-clôture bloquée (`CompetitionClosedError`), état réessayable si `equityOf` lève, `EquityProvider` NaN rattrapé par `assertValidEquity` avant `closed=true`, `participants()` ne fuit pas le `Set` interne.
- 🟡 Tests ajoutés (protègent les garanties paiement) : clôture vide, provider NaN → ouvert/réessayable, `equityOf` qui lève → réessayable, anti-fuite de référence.
- 🟡 Laissé (MVP) : double-compute de `computePayouts` (via `undistributedAmount`) — redondant mais déterministe/cohérent, pas de risque.

**Bugs & fix.** Aucun (l'audit confirme la logique d'état correcte).

---

## 2026-06-21 — Couche application : `PaperService` in-memory (apps/api) [Phase 1]

**Quoi.** Création de `apps/api` (consomme `@tide/core` via workspace). `PaperService` : gère les comptes de paper trading **en mémoire** (ouvrir, placer un ordre, soldes, equity/PnL, leaderboard) en orchestrant les moteurs purs. 132 tests, typecheck + lint clean.

**Pourquoi.** Backbone du backend : le pont entre les moteurs purs et la future couche HTTP/DB. Le construire d'abord en mémoire et testable verrouille les invariants d'état avant d'ajouter l'I/O.

**Cheminement.** État dans une `Map`. `placeOrder` s'appuie sur `applyMarketOrder` (immutable) : il valide et vérifie le solde **avant** de muter, donc pas d'état incohérent (atomicité confirmée par l'audit). Persistance DB = adaptateur ultérieur (l'interface du service ne changera pas).

**Audit (sous-agent) — 2 🟠 prouvés au runtime, corrigés avant commit :**
- 🟠 **Fuite de référence** : `balancesOf`/`ordersOf` retournaient l'état interne (les `readonly` ne protègent qu'à la compilation ; `Object.assign(service.balancesOf(u), …)` corrompait le solde). → **copies défensives** sur les deux getters.
- 🟠 `startingEquity` non validé (`new PaperService(-500)` → solde négatif ; `NaN` se propageait partout). → validation + `InvalidStartingEquityError`.
- 🟡 Tests ajoutés : mutation externe rejetée, solde insuffisant propagé + **état intact après exception**, leaderboard avec prix manquant, capital de départ invalide.

**Bugs & fix.** Cf. les 2 🟠 ci-dessus (fuite de référence = le point sérieux à fermer avant la couche HTTP).

---

## 2026-06-21 — Cœur du feed de prix (xrpl/price) : conversion + prix AMM/carnet [Phase 0/1]

**Quoi.** `packages/xrpl/price` : `amountToQuantity` (montant XRPL → quantité ; drops/1e6 pour XRP, value pour token), `ammSpotPrice(base, quote)` (prix spot d'un pool AMM = ratio des réserves), `midPrice`, `relativeSpread`. 118 tests, typecheck + lint clean.

**Pourquoi.** Le feed de prix alimente la simulation Paper (ordres au prix réel), la valorisation (leaderboard) et plus tard la best-execution. Ce module est la partie **pure** (calcul) ; les adaptateurs réseau (xrpl Client `amm_info`/`book_offers`, API CEX) viendront ensuite, vérifiés contre le mainnet.

**Cheminement.** Postulat clé confirmé par l'audit (contre le type réel xrpl 4.6.0) : sur le type `Amount`, une **string est toujours des drops XRP**, un IOU est toujours un objet `{currency,issuer,value}` — la conversion drops/token n'est jamais ambiguë. `ammSpotPrice = quote/base` (prix de base exprimé en quote). Garde-fou carnet croisé (`ask < bid`) dans `relativeSpread`.

**Audit (sous-agent) — OK à commit, zéro bloquant :**
- Math confirmée juste (cohérence inverse `p1·p2 ≈ 1`), pas de division par zéro (montants validés > 0), erreurs typées.
- 🟡 Tests ajoutés : spread nul (`bid == ask` → 0), grosses réserves (50M XRP → prix juste).
- **Recommandation tracée :** `amountToQuantity` (`Number`) est OK pour un prix indicatif (un ratio), mais **ne jamais l'utiliser pour une valorisation monétaire sommable** (au-delà de ~9 Md XRP en drops, `Number` perd les drops de poids faible). Pour toute somme d'argent → `BigInt` sur les drops. C'est la même dette que côté paper, à respecter au point de règlement.

**Bugs & fix.** Aucun.

---

## 2026-06-21 — Agrégateur d'attribution (xrpl/metrics) : le score du hackathon [Phase 1]

**Quoi.** `packages/xrpl/metrics` : `aggregateAttribution(txs, tideSourceTag)` → `{ totalVolume, activeAccounts (distincts), txCount }`, et `filterByLedgerRange` pour le fenêtrage (leaderboard hebdo). 104 tests, typecheck + lint clean.

**Pourquoi.** 3 prix sur 4 du hackathon sont ces métriques on-chain. C'est notre lecture de position (Most Volume / Most Users / 300 Active). Module pur : il prend des tx déjà observées et normalisées, calcule le score, sans I/O.

**Cheminement.** `Set` pour les comptes distincts, somme du volume, comptage. Pur et fenêtrable (composition `aggregateAttribution(filterByLedgerRange(...))`). Volume 0 explicitement accepté (une tx taggée sans valeur compte quand même comme compte actif — important pour le prix « 300 active »).

**Audit (sous-agent) — OK à commit, traité :**
- 🟠 L'agrégation acceptait `tideSourceTag = 0` (via `assertValidSourceTag`) → bascule sur `assertAttributionTag` qui **rejette 0** : agréger sur 0 compterait toutes les tx non taggées comme nôtres (faux positif sur la métrique reine).
- 🟡 Tests ajoutés : liste vide → `{0,0,0}`, fenêtre vide → `[]`, SourceTag 0 rejeté.
- Choix de **lever** sur volume négatif (plutôt qu'ignorer) validé par l'audit pour le score officiel (échouer bruyamment > publier un classement faux). Pour un affichage live grand public, l'appelant devra wrapper l'appel.

**⚠️ RISQUE À TRACER (le vrai piège du système).** `aggregateAttribution` additionne un `volume` **supposé déjà normalisé** en devise de référence par l'appelant (l'indexeur). Le module pur ne peut pas garantir cette normalisation (drops XRP vs IOU, mélange de devises, timestamp de prix). Une erreur de normalisation amont produirait un `totalVolume` faux qu'il sommerait sans broncher. **Mitigation à imposer quand l'indexeur existera :** un seul point de normalisation partagé (via le feed de prix), couvert par un test d'intégration. À ne pas oublier — c'est ce qui peut nous faire mal lire notre position.

**Bugs & fix.** Aucun (logique de comptage juste, confirmée).

---

## 2026-06-21 — Leaderboard (core) : valorisation + classement + PnL [Phase 1]

**Quoi.** `packages/core/leaderboard` : `buildLeaderboard` valorise chaque portefeuille paper (`equity`), classe (`rankByEquity`) et ajoute le PnL. 92 tests, typecheck + lint clean.

**Pourquoi.** C'est le classement que le front affiche et le moteur d'engagement du produit (le « track record » partageable). Compose les deux moteurs déjà livrés plutôt que de dupliquer la logique.

**Cheminement.** Module mince et pur qui réutilise `equity` (paper) et `rankByEquity` (compétitions) → pas de duplication. Propagation des erreurs de valorisation (prix manquant) intacte : on ne classe jamais à l'aveugle.

**Audit (sous-agent) — OK à commit, traité :**
- 🟠 Capital de départ **commun** à tous (pas par compte) : pas un bug aujourd'hui (départ uniforme), mais limite documentée dans le JSDoc (classement à l'equity absolue = choix produit assumé ; porter le départ dans `AccountSnapshot` quand des départs hétérogènes arriveront).
- 🟡 Test ajouté : PnL égaux pour des ex-aequo.

**Bugs & fix.** Aucun (composition juste, confirmée par l'audit).

---

## 2026-06-21 — Moteur de compétitions (core) : pool, rake, classement, payouts [Phase 1]

**Quoi.** `packages/core/competition` : `prizePool`/`rakeAmount`/`distributable` (économie du tournoi), `rankByEquity` (classement) et `computePayouts` (répartition des gains) + `undistributedAmount`. 87 tests au total, typecheck + lint clean.

**Pourquoi.** Cœur du modèle économique (buy-in poker, cf. SPEC §3) : c'est ce qui transforme les buy-ins en prize pool et calcule qui touche combien à la clôture d'un tournoi.

**Cheminement.** Modèle poker : pool = buy-in × participants, rake (commission) prélevé, reste réparti aux premiers selon des poids sommant à 1. Validation stricte (buy-in > 0, rake dans [0,1[, poids cohérents).

**Audit (sous-agent) — findings traités avant commit :**
- 🟠 **Ex-aequo réglés par l'ordre d'insertion** = inéquitable (deux joueurs à equity égale touchaient des gains différents). Refonte : classement **déterministe** (départage par `userId`), rangs « compétition standard » (ex-aequo = même rang : [300,200,200,100] → [1,2,2,4]), et **split-pot** — les ex-aequo mutualisent les tiers qu'ils occupent (comportement poker correct).
- 🟡 **Reliquat invisible** quand le tournoi est sous-rempli → ajout de `undistributedAmount` pour exposer `distribuable − Σpayouts` (à récupérer en trésorerie).
- 🟡 **Equity NaN/Infinity** corrompait le tri silencieusement → `assertValidEquity` dans `rankByEquity`.
- 🟡 Tests de bord ajoutés : 0/1 participant, split-pot, déterminisme, rake 0, conservation stricte, NaN.

**Dette connue (assumée).** Montants en `number`. Au paiement on-chain (drops XRPL = entiers), la conversion devra utiliser la **méthode du plus grand reste** pour garantir `Σ versé = distribuable arrondi` (sinon écart de quelques drops). Noté dans le JSDoc de `payout.ts`, à implémenter au point de signature des `Payment`.

**Bugs & fix.** Aucun bug de formule (le cas nominal était juste) ; les corrections ci-dessus sont des garde-fous d'équité/robustesse.

---

## 2026-06-21 — Package `@tide/xrpl` : transactions taggées (SourceTag + Memos) [Phase 0, chemin critique]

**Quoi.** Constructeurs de transactions XRPL **non signées** (à passer à Xaman) : `buildBuyInPayment` (inscription tournoi = `Payment` taggé + memo) et `buildLiveOffer` (swap Live = `OfferCreate` taggé). Plus les briques validées : `assertValidAddress`, `assertValidSourceTag`/`assertAttributionTag`, `assertValidAmount`, `encodeMemo`. 60 tests au total, typecheck + lint clean.

**Pourquoi.** L'attribution via `SourceTag` est l'enjeu nº1 du hackathon (3 prix sur 4 sont des compteurs on-chain). Ces builders garantissent que toute tx produite par Tide porte le tag et un memo correct, avec des entrées validées (une tx malformée signée par l'user = fonds ou attribution perdus).

**Cheminement.** Builders **purs** qui produisent du JSON de tx, jamais de signature ni de clé (non-custodial, signature côté Xaman). Nommage `gives`/`wants` au lieu de `TakerGets`/`TakerPays` pour lever l'ambiguïté du sens d'un `OfferCreate`. Memos hex via `convertStringToHex`. Adresses générées via `xrpl.js` pour des tests stables (pas d'adresses mémorisées).

**Audit (sous-agent) — findings traités avant commit :**
- 🟠 `Amount` n'était pas validé (seul champ portant la valeur, non gardé) → `assertValidAmount` + `InvalidAmountError` : drops XRP = entier positif (regex + BigInt), token = value finie > 0 + currency non vide + issuer adresse valide.
- 🟡 SourceTag à 0 = attribution perdue → `assertAttributionTag` (rejette 0) dans les builders, tout en gardant `assertValidSourceTag` générique.
- 🟡 Offre triviale `gives == wants` (no-op) → rejet via `amountsEqual`.
- 🟡 Cap de longueur sur `competitionId` (memos bornés ~1 KB par le protocole).
- 🟡 Tests ajoutés : `MemoType == tide/join`, competitionId vide au niveau builder, SourceTag 0, montants invalides.

**À trancher (Phase 0).** Figer le `TIDE_SOURCE_TAG` réel une fois réservé auprès de l'orga, et le câbler par défaut côté backend (cf. SPEC §10).

**Bugs & fix.** `convertStringToHex` renvoie de l'hex **majuscule** (confirmé empiriquement : `zZ`→`7A5A`) ; assertion de test corrigée en conséquence.

---

## 2026-06-21 — Scaffold monorepo + moteur Paper (core) [Phase 0/1]

**Quoi.** Init du code : monorepo pnpm (TS strict, vitest, eslint avec `no-explicit-any` en erreur) et 1re feature **`packages/core`** — le moteur de paper trading pur, sans I/O : exécution d'ordres marché au prix réel (`applyMarketOrder`, immutable), validation des entrées, valorisation/PnL (`equity`/`pnl`/`pnlRatio`). 25 tests, typecheck + lint clean.

**Pourquoi.** Le moteur Paper est le cœur du mode entraînement (cf. SPEC §5). Le construire pur et testable d'abord = base solide réutilisable par le backend, sans dépendre de XRPL.

**Cheminement.** Structure monorepo (`packages/core|xrpl`, `apps/api|web`) pour paralléliser l'équipe. `moduleResolution: Bundler` (imports sans extension). Modèle d'exécution simple et honnête : ordre marché exécuté instantanément au prix réel fourni, **pas de slippage** en MVP (assumé, cf. SPEC §7). PnL par equity (valeur du portefeuille en devise de référence) plutôt que cost-basis : plus simple, suffisant pour le leaderboard.

**Audit (sous-agent) — findings traités avant commit :**
- 🟠 `equity` acceptait un prix aberrant (0, négatif, NaN, Infinity) → **montant faux sans erreur**. Ajout de `InvalidPriceError` + rejet. C'était le finding prioritaire (viole « ne jamais produire un montant faux silencieusement »).
- 🟠 `validateMarketOrder` acceptait une devise vide dans la paire → ajout du rejet.
- 🟡 `PriceMap` déplacé dans `paper/types.ts` (cohérence : tous les types du domaine au même endroit).
- 🟡 Tests ajoutés : vente sur devise non détenue, equity multi-devises, immutabilité de `equity` et de la vente, prix aberrant.

**Dette connue (assumée).** Montants en `number` JS (flottants binaires) : OK pour le paper (pas d'argent réel), **à reprendre côté mode Live taggé** (drops XRP = entiers, RLUSD = précision fixe). Noté en commentaire dans `account.ts`/`equity.ts`.

**Bugs & fix.** Build esbuild ignoré par pnpm (gate `allowBuilds`) bloquait `vitest` → autorisé dans `pnpm-workspace.yaml`.

---

## 2026-06-21 — Roadmap d'exécution

**Quoi.** Création de `docs/ROADMAP.md` : plan d'exécution détaillé en tâches à cocher, calé sur la capacité réelle (**équipe 2-3, full-time, ~13 semaines** du 22 juin au 21 sept).

**Pourquoi.** Passer de la spec stratégique (SPEC §8) au découpage actionnable, avec chemin critique, jalons de démo et pistes parallèles (équipe).

**Cheminement.** Dé-risquage en tête : le **spike d'attribution** (1 swap taggé en mainnet qui fait monter le compteur orga) est la toute première tâche — si ça ne marche pas, le projet change. Pistes parallélisées : [BC] blockchain/backend (Armand), [FE] front Nuxt, [GROWTH] acquisition. Jalons : (P0) tx taggée mainnet qui compte ; (P1, avant deadline inscription 21 juil) Paper + 1re compète jouable + 1er compte actif ; (P2) funnel paper→live complet + prize pool distribué ; (final) métriques au plus haut + pitch. Buffer final ferme (gel de scope ~5 j avant la fin). Risques de planning explicités (spike qui échoue, réponses orga tardives, conversion paper→live faible, bot à perte, custody multisig).

**Bugs & fix.** Aucun (pas de code).

---

## 2026-06-21 — Check de faisabilité de la spec : correction du prize pool (Escrow → multisig)

**Quoi.** Audit de faisabilité de `docs/SPEC.md`, primitive par primitive. Verdict : la spec **tient sans smart contract**, avec **une vraie correction** appliquée.

**Pourquoi.** Valider la base avant de bâtir la roadmap dessus. Ne pas laisser une hypothèse fausse dans la spec.

**Cheminement / le défaut trouvé.** La spec supposait « prize pool en Escrow natif, distribution par signature opérateur vers les gagnants ». Vérification doc : un `Escrow` XRPL a **une destination UNIQUE fixée à la création** — il ne peut **pas** distribuer aux N gagnants d'un tournoi. Le TokenEscrow existe (tokens) mais exige le flag `Allow Trust Line Locking` côté émetteur (non garanti pour RLUSD). → **Escrow écarté pour le prize pool.** Remplacé par un **compte opérateur multisig** qui détient les buy-ins et paie chaque gagnant via un `Payment` taggé. Conséquence assumée : le pool est **réellement custodial** le temps du tournoi (le multisig borne le risque), à refléter dans l'UX. Corrigé dans SPEC §3, §5, §6.1, §6.3, §7, §9, §10 et CLAUDE.md.

**Autres points vérifiés (OK).** DEX `OfferCreate` (core), AMM XLS-30 (enabled), `SourceTag` (champ commun, sur Payment ET OfferCreate), `Memos` (champ commun), Xaman payloads (acceptent SourceTag/Memos), PriceOracle XLS-47 correctement écarté. Funnel Paper→Live→métriques `SourceTag` cohérent : le SourceTag est un entier choisi par l'app et déclaré à l'orga (Phase 0), pas de brique d'enregistrement manquante.

**Point ajouté aux risques.** Onboarding d'un user neuf : signer un buy-in/trade exige un **compte XRPL activé et financé** (réserve de base + frais). Le Paper n'exige rien ; la friction apparaît au passage Live/buy-in.

**Bugs & fix.** Cf. le défaut Escrow ci-dessus (corrigé dans la spec).

---

## 2026-06-21 — Init du projet : faisabilité validée + spec rédigée

**Quoi.** Création du repo `dev/hackathon/make-waves` avec `docs/SPEC.md`, `CLAUDE.md` et ce DEVLOG. Tide est un produit de paper trading + compétitions on-chain sur XRPL Mainnet, avec passage au trading réel (mode Live). Cible : hackathon Make Waves XRPL (fin 2026-09-21).

**Pourquoi.** Figer une idée validée avant de coder, avec les primitives XRPL réellement disponibles en mainnet (sourcées) et les décisions d'architecture, pour servir de référence pendant les 90 jours.

**Cheminement (alternatives écartées et pourquoi).**
- **Oracle on-chain (XLS-47 / Pyth) → abandonné.** Un oracle on-chain ne sert qu'à un smart contract qui lit le prix ; Tide n'a aucun contrat. Le feed de prix se fait off-chain (carnet + spot AMM via `xrpl.js` + API CEX). Une brique en moins, gratuitement.
- **Fee de 0,5 % sur les swaps → abandonnée.** Impossible proprement en non-custodial sur le L1 : le DEX natif n'a pas de fee en pourcentage et il n'y a pas de smart contract pour intercepter. Constat confirmé par le fait que Sologenic/XPMarket eux-mêmes ne prennent pas de take-rate sur les swaps (ils monétisent par LP/staking). Remplacé par un **buy-in de tournoi** (Payment taggé, rake type poker) : revenu consenti **et** chaque buy-in = une tx taggée = un compte actif pour le hackathon → revenu et métrique convergent.
- **EVM Sidechain → repoussée en v2.** Mainnet depuis le 30 juin 2025, elle débloque les smart contracts (fee programmatique, prize pool trustless, perp). Mais c'est une chaîne séparée : l'activité ne remonte pas au `SourceTag` du L1 (perte des 3 prix-métriques), la liquidité serait à amorcer, et le bridge ajoute de la friction. Inadaptée au hack, gardée pour après.
- **Perp / dérivés → écartés.** Nécessitent des smart contracts (marges, liquidations, funding), absents du mainnet XRPL (XLS-100/101 en devnet, ~2027). De plus, contradiction de branding (« apprendre » vs pousser au levier).
- **Atomicité multi-tx (Batch) → non utilisée.** L'amendment `Batch` a été désactivé (bug), remplacé par `BatchV1_1` à venir. Buy-in et premier trade restent des tx indépendantes.
- **Distribution du prize pool → semi-custodiale assumée.** Sans smart contract, pas de distribution conditionnelle automatique selon le classement. Le pool est verrouillé en Escrow natif et libéré par signature de l'opérateur. Exposition bornée au montant des cagnottes en cours.

**Primitives vérifiées (mainnet, juin 2026, sourcées dans SPEC §3).** DEX natif `OfferCreate` (core), AMM XLS-30 (enabled), `SourceTag` + `Memos` (champs natifs), `Payment` + Escrow natif (core), Xaman/XUMM SDK (payloads non-custodial acceptant `SourceTag`).

**Bugs & fix.** Aucun (pas encore de code).

**Suite.** Phase 0 : inscription au hackathon, réserver le `SourceTag`, poser les questions orga (SPEC §10, notamment la définition d'« active account » et si le volume self-généré compte), puis prototype « hello world » (Xaman + 1 swap taggé en mainnet) pour vérifier que l'attribution monte au compteur.
