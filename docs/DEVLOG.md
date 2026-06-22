# DEVLOG — Tide

Historique daté, append-only. Format par entrée : **Quoi / Pourquoi / Cheminement / Bugs & fix**.

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
