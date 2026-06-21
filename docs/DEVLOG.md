# DEVLOG — Tide

Historique daté, append-only. Format par entrée : **Quoi / Pourquoi / Cheminement / Bugs & fix**.

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
