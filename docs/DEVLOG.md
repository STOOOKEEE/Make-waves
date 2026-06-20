# DEVLOG — Tide

Historique daté, append-only. Format par entrée : **Quoi / Pourquoi / Cheminement / Bugs & fix**.

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
