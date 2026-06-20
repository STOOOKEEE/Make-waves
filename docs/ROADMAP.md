# Tide — Roadmap d'exécution

> Deadline finale : 2026-09-21 · Reste : ~13 semaines (depuis 2026-06-21) · Capacité : équipe 2-3, full-time (40h+/sem) · Mis à jour : 2026-06-21
> Spec : [`docs/SPEC.md`](SPEC.md) · Deadline inscription : **2026-07-21** (le MVP doit tourner avant)

Cocher au fil du dev (`[x]` fait · `[~]` partiel · `[ ]` à faire). 3 prix sur 4 sont des **métriques on-chain** (`SourceTag`) : l'objectif n'est pas « livrer du code » mais **faire monter les compteurs**. Tout est calé là-dessus.

**Pistes parallèles** (équipe) :
- **[BC]** Blockchain / backend XRPL — *Armand* (xrpl.js, Xaman, SourceTag, multisig, indexeur de métriques).
- **[FE]** Front / UX Nuxt — terminal de trading, leaderboard, compétitions, flow Xaman.
- **[GROWTH]** Produit / acquisition — orga, compétitions étudiantes, pitch (fusionne dans [BC]/[FE] si on est 2).

---

## Chemin critique (à sécuriser en priorité)

Tâches bloquantes ou incertaines — si l'une casse, le projet change de forme. À traiter **avant** de construire le reste.

1. **[BC] Spike d'attribution** : 1 swap `OfferCreate` + 1 `Payment` taggés `SourceTag` en **mainnet**, et vérifier que le compteur d'attribution du hackathon monte. *Tant que ce n'est pas prouvé, rien d'autre n'a de sens.*
2. **[GROWTH] Questions orga tranchées** : définition « active account », volume self-généré compté ?, `SourceTag` seul moyen d'attribution ? → décide si le buy-in est le bon véhicule d'activation et si le bot de volume est jouable.
3. **[BC] SourceTag déclaré/réservé** auprès de l'orga, et figé comme constante unique partagée par toutes les tx de l'app.
4. **[BC] Mécanique multisig du prize pool** : créer un compte multisig (`SignerListSet`), encaisser un buy-in, payer 2 gagnants par `Payment`. Prouver la boucle custody bornée.
5. **[FE+BC] Vertical slice** : connexion Xaman → 1 ordre Paper → rejoindre 1 compète (buy-in taggé) → voir le compte actif monter. La boucle de bout en bout, même moche, avant d'enrichir.

---

## Phase 0 — Setup & dé-risquage · 22 juin → 5 juil (sem 1-2)
**Jalon démo :** un swap taggé en mainnet qui fait monter le compteur d'attribution, + le squelette d'app (Xaman connect) qui tourne en local.
**Definition of done :** je peux montrer une tx mainnet avec notre `SourceTag` et pointer le compteur orga qui s'incrémente.

**[BC] Dé-risquage & socle**
- [ ] Spike d'attribution : swap `OfferCreate` taggé en mainnet (chemin critique #1).
- [ ] Idem `Payment` taggé + `Memos` (le futur buy-in).
- [ ] Réserver/déclarer le `SourceTag`, le figer en constante partagée (chemin critique #3).
- [ ] Spike multisig prize pool : `SignerListSet` + encaissement + payout 2 gagnants (chemin critique #4).
- [x] Init repo code (monorepo pnpm), TS strict, lint, `.env` hors repo, structure modulaire. *(fait)*
- [ ] Brancher le feed de prix off-chain : lecture carnet + spot AMM (`xrpl.js`) + API CEX (CoinGecko/Binance), avec cache et double source.

**[FE] Socle UI**
- [ ] Design « un terminal, deux modes » (Paper/Live partagent feed/UI/leaderboard) — maquette.
- [ ] Connexion Xaman (XUMM SDK), affichage du wallet, état connecté.
- [ ] Squelette du terminal de trading (lecture du feed de prix, pas encore d'ordres).

**[GROWTH] Orga & prep**
- [ ] Inscription équipe au hackathon.
- [ ] Poser les questions orga (chemin critique #2) et logger les réponses dans le DEVLOG.
- [ ] Repérer 2-3 paires liquides cibles (dont RLUSD) via xrpl.to / XPMarket.
- [ ] Lister les premiers canaux étudiants (ESILV, DVB) pour la 1re compète.

---

## Phase 1 — MVP Paper + compétitions · 6 juil → 20 juil (sem 3-4)
**⚠️ Doit tourner avant la deadline inscription du 21 juil.**
**Jalon démo :** un user se connecte, trade en Paper sur de vrais prix, rejoint une compétition (buy-in taggé) et devient **1er compte actif** visible dans nos métriques.
**Definition of done :** la boucle Paper + 1 compète jouable est en ligne, et le compteur de comptes actifs taggés s'incrémente pour de vrai.

**[BC] Backend Paper & on-chain**
- [ ] Modèle de données (User, PaperWallet, PaperOrder, Competition, Entry, LeaderboardSnapshot, MetricEvent) — cf. SPEC §5.
- [x] Moteur Paper : portefeuille virtuel, ordres simulés au prix réel, calcul PnL. *(cœur pur `packages/core/paper`)*
- [~] Moteur de compétitions : créer/rejoindre un tournoi, fenêtre, état, règles. *(calcul pool/rake/classement/payouts livré `packages/core/competition` ; création/état tournoi = backend, à faire)*
- [~] Ancrage on-chain : rejoindre = payload `Payment` buy-in taggé (`SourceTag` + `Memo` id tournoi) vers le compte prize pool multisig. *(builder `buildBuyInPayment` livré `packages/xrpl` ; déclenchement Xaman = backend/front)*
- [~] Indexeur de métriques : observer les tx taggées en mainnet → `MetricEvent` (volume, comptes actifs **distincts**). *(agrégation `aggregateAttribution` livrée `packages/xrpl/metrics` ; lecture ledger temps réel = backend)*
- [x] Validation stricte des entrées (montants, adresses, devises, params tx) avant tout payload. *(dans tous les moteurs/builders)*

**[FE] UI Paper & compétitions**
- [ ] Terminal Paper jouable (passer un ordre, voir PnL, historique).
- [~] Leaderboard (classement PnL Paper). *(calcul `buildLeaderboard` livré `packages/core/leaderboard` ; UI à faire)*
- [ ] Liste / page compétitions : rejoindre → déclenche le payload Xaman du buy-in.
- [ ] Onboarding zéro friction (Xaman only, pas de signup email).

**[GROWTH]**
- [ ] Préparer la 1re compétition étudiante (format, buy-in faible, dates, petit prize pool d'amorçage).
- [ ] Texte produit honnête sur le Paper (engagement/apprentissage, ne pas survendre la perf).

---

## Phase 2 — Mode Live + funnel complet · 21 juil → 10 août (sem 5-7)
**Jalon démo :** le funnel entier — un top joueur Paper clique « passer en Live », exécute un **swap spot réel taggé**, et à la clôture d'un tournoi le **prize pool est distribué** aux gagnants (multisig → `Payment`).
**Definition of done :** funnel paper→live démontrable de bout en bout + 1 prize pool réellement payé + le volume taggé monte.

**[BC] Live & best execution**
- [ ] Mode Live : construire `OfferCreate` taggé, signé Xaman, non-custodial.
- [ ] Best execution basique : router carnet d'ordres vs pool AMM (XLS-30) sur 2-3 paires (dont RLUSD).
- [ ] Clôture de tournoi : calcul classement off-chain → payouts `Payment` taggés multisig vers les N gagnants, moins le rake.
- [ ] Suivi du volume Live taggé dans l'indexeur (vers Most Volume).
- [ ] Gestion d'erreurs tx (échec, partial, timeout) sans avaler l'erreur.

**[FE] Bascule Live**
- [ ] Bouton « passer en Live » (même UI, settlement réel).
- [ ] Affichage de la réserve de compte / friction onboarding au moment du Live ou du buy-in (cf. SPEC §9).
- [ ] Page résultats de tournoi + distribution visible.
- [ ] Track record vérifiable (lien vers les tx on-chain).

**[GROWTH]**
- [ ] Lancer la **1re compétition publique** (test acquisition réel).
- [ ] Mesurer le taux de conversion paper→live observé (input du risque central).

---

## Phase 3 — Acquisition & volume · 11 août → 31 août (sem 8-10)
**Jalon démo :** les compteurs montent — comptes actifs vers l'objectif 300, et du volume Live qui s'accumule.
**Definition of done :** au moins 1 compétition étudiante de 100+ inscrits passée, funnel optimisé, courbe de métriques orientée à la hausse.

**[GROWTH] Users (Most Users + 300 Active)**
- [ ] Compétitions étudiantes ESILV / DVB / écoles partenaires (viser 150-300 inscrits par tournoi).
- [ ] Referral (invite = bonus) et partage du track record (viralité du classement).
- [ ] Proposer les compètes aux communautés crypto XRPL (holders memecoins, Telegram/Discord).

**[BC] Volume (Most Volume) — conditionnel**
- [ ] Funnel paper→live ciblé top joueurs (rebates/incentives sur trades Live taggés).
- [ ] **Si** self-généré compté (réponse orga) **et** edge validé : bot arb/MM taggé en arrière-plan, base Diaso adaptée XRPL.
- [ ] ⚠️ Garde-fou quant : valider l'edge en petite taille (`quant-mentor`/`strat-audit`) — **ne pas wash-trader à perte** (cf. SPEC §9).
- [ ] Intégrer RLUSD dans le routing (le gros du volume).

**[FE]**
- [ ] Optimiser le funnel (réduire les frictions mesurées en Phase 2).
- [ ] Tuiles de stats publiques (leaderboard, volume) pour la viralité.

---

## Phase finale — Scaling, polish & pitch · 1 sept → 21 sept (sem 11-13)
*Buffer obligatoire. Ne pas le sacrifier pour caser une feature.*
**Jalon final :** app stable, métriques au plus haut, pitch jury prêt.

- [ ] Pousser users (referral, derniers tournois) et volume (whales, RLUSD).
- [ ] Stabiliser / corriger les bugs bloquants (priorité aux flux tx et payouts).
- [ ] Durcir la sécurité du multisig prize pool (revue des signataires, montants).
- [ ] Préparer la démo (funnel paper→live en live) et le pitch jury (impact / innovation / exécution / honnêteté — cf. doc d'idée §9).
- [ ] Vérifier les compteurs finaux d'attribution au 21 sept.
- [ ] Geler le scope ~5 jours avant la fin : plus de features, que du polish.

---

## Hors-scope (coupé du MVP)
Perp/dérivés · oracle on-chain (XLS-47) · EVM sidechain · smart contracts · backtest engine · multi-chain · fiat on-ramp · mobile natif · design léché · atomicité multi-tx (Batch) · Escrow pour le prize pool (remplacé par multisig, cf. SPEC §3).

---

## Risques de planning

| Risque | Signe d'alerte | Plan B |
|---|---|---|
| Le spike d'attribution échoue / le `SourceTag` ne suffit pas | Compteur orga ne bouge pas après une tx taggée | Demander à l'orga le mécanisme exact d'attribution avant de coder le reste ; pivoter le véhicule d'activation |
| Réponses orga tardives (active account / self-généré) | Pas de réponse avant fin Phase 0 | Coder l'activation par buy-in **avec valeur** (hypothèse safe) ; ne pas miser sur le bot de volume tant que non confirmé |
| Retard Phase 1 (MVP pas prêt au 21 juil) | Paper non jouable mi-juillet | Couper le moteur de compétitions multi-tournois → 1 seul tournoi hardcodé pour la démo d'inscription |
| Conversion paper→live trop faible | Peu de top joueurs passent en Live (Phase 2) | Renforcer les rebates, cibler quelques whales ; ne pas dépendre du volume retail diffus |
| Bot de volume à perte | Spread + frais AMM mangent le capital | Couper le bot ; jouer Most Volume uniquement par users réels + RLUSD |
| Custody multisig = point sensible | Cagnottes qui grossissent | Garder les buy-ins faibles, clôtures rapides, quorum multisig strict |
| Buffer final grignoté | Features encore ouvertes au 10 sept | Gel de scope ferme ; tout ce qui n'est pas stable passe hors-scope |
