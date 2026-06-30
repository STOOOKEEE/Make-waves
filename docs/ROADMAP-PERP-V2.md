# Tide — Roadmap perp on-chain (piste v2) — XRPL EVM Sidechain

> Cible interne : **démo testnet ~2026-07-28** · Reste : ~4 semaines · Capacité : équipe 2-3 full-time · Mis à jour : 2026-06-30
> **Piste v2 / différenciation, PARALLÈLE au hackathon** (deadline hack 2026-09-21). Ne consomme pas le chemin critique L1 taggé.
> Contexte & faisabilité : voir l'analyse du 30/06 (mémoire `perp-xrpl-evm-sidechain-v2`) et `docs/DEVLOG.md`. Roadmap hackathon principale inchangée : `docs/ROADMAP.md`.

**Architecture = perp HYBRIDE.** On-chain mince (`MarginVault.sol` : collatéral RLUSD + settlement signé par Safe multisig opérateur) ; **matching / funding / PnL / liquidation OFF-CHAIN** via le moteur `@tide/core` `position/` existant (F16/F17) ; **mark price = feed CEX existant**. Band oracle = référence/dispute seulement. Semi-custodial assumé (même posture que le prize pool). On réutilise le perp Paper déjà construit, en le passant à collatéral réel.

**Convention tâches :** `[env]` = exige l'environnement d'Armand (wallet/clés/réseau, non faisable ici) · `[code]` = codable sans clés · `[∥]` = parallélisable.

---

## Chemin critique (à sécuriser en priorité)
*Le plus incertain et bloquant d'abord — un échec ici change l'approche.*

1. **[env] Spike oracle Band** : lire un prix sur le testnet (`StdReferenceProxy`) **et mesurer sa cadence réelle** (inconnue dure, non documentée). → confirme qu'on garde le mark price off-chain et que Band ne sert qu'à la dispute. **GO/NO-GO.**
2. **[env] Toolchain on-chain** : déployer un contrat `solc 0.8.24` (EVM Paris) sur le testnet `1449000` + vérif Blockscout. Valide Foundry ↔ chaîne.
3. **[env] Financement** : bridger du XRP (gas, via Squid/Axelar) + obtenir du **RLUSD testnet** pour collatéral.
4. **[code] `MarginVault.sol`** : deposit/withdraw RLUSD + settlement signé par l'opérateur (le cœur on-chain), avec invariant de conservation du collatéral testé.
5. **[code] Service settlement off-chain** : le moteur Tide signe une instruction et l'applique au vault (le pont chaîne ↔ moteur de position).

---

## Phase 0 — Dé-risquage & setup · 2026-06-30 → 2026-07-02
**Jalon démo :** *un prix Band lu sur testnet (avec sa fréquence mesurée), un contrat trivial déployé + vérifié sur Blockscout, un wallet financé en XRP + RLUSD testnet. Décision GO/NO-GO tracée.*

- [ ] [env] Ajouter le réseau **testnet XRPL EVM** (`chainId 1449000`, RPC testnet) à MetaMask
- [ ] [env] Bridger un peu de XRP vers le testnet (gas) via Squid/Axelar
- [ ] [env] Récupérer du **RLUSD testnet** (faucet/bridge) pour le collatéral
- [ ] [env][∥] Déployer un contrat trivial `solc 0.8.24` via Foundry sur le testnet + **vérif Blockscout** (valide la toolchain)
- [ ] [env][∥] **Lire un prix Band** (`StdReferenceProxy` testnet) et **mesurer sa cadence réelle** (timestamps successifs)
- [ ] [code] Initialiser le package **`packages/contracts/`** (Foundry : `forge init`, `foundry.toml` épinglé `solc = 0.8.24`, EVM `paris`, remappings OZ)
- [ ] **GO/NO-GO** : noter le verdict (cadence Band, liquidité RLUSD, toolchain) dans `docs/DEVLOG.md`

## Phase 1 — `MarginVault.sol` + tests (le cœur on-chain) · 2026-07-03 → 2026-07-09
**Jalon démo :** *vault testnet : un compte dépose du RLUSD, l'opérateur règle un PnL signé, le compte retire son solde libre. Tests Foundry verts.*

- [ ] [code] `MarginVault.sol` (0.8.24, OZ `Ownable`/`Pausable`/`ReentrancyGuard`) : `deposit`/`withdraw` RLUSD, soldes par compte, events
- [ ] [code] Rôle **opérateur** (clé du Safe multisig) : `settle(account, pnlSigné)` — crédite/débite le solde, **PnL plafonné à -marge** (isolated, logique déjà au domaine)
- [ ] [code] Garde-fous : pas de retrait au-delà du **solde libre** (collatéral − marge réservée), pause d'urgence, validation des entrées
- [ ] [code] Tests Foundry : **invariant `Σ collatéral` conservé**, accès opérateur seul, retrait borné, reentrancy, fuzz sur montants
- [ ] [code] Script de déploiement Foundry (`script/`) paramétré (adresse RLUSD, opérateur)
- [ ] [env] Déployer sur testnet + vérif Blockscout ; smoke test deposit→settle→withdraw

## Phase 2 — Brancher le moteur Tide off-chain + settlement · 2026-07-10 → 2026-07-18
**Jalon démo :** *ouvrir/fermer une position depuis le backend adossée au collatéral on-chain ; le PnL réalisé est réglé on-chain via une instruction signée par l'opérateur.*

- [ ] [code] Identité = **adresse EVM** (le collatéral on-chain plafonne le notional) ; réutiliser le moteur `position/` (mark price = feed CEX)
- [ ] [code] **Service settlement** (`apps/api`) : calcule le PnL réalisé à la fermeture, produit l'instruction, la fait signer par le multisig, appelle `vault.settle` (viem)
- [ ] [code] Lecture du collatéral on-chain (solde vault) → exposé à l'API (plafond de marge réel)
- [ ] [code] **Liquidation off-chain** : le backend surveille mark vs marge, déclenche un settlement de liquidation (plancher -marge)
- [ ] [code] Anti-rejeu / idempotence des settlements (nonce par instruction), gestion d'erreur réseau (pas d'avalement)
- [ ] [code] Tests bout en bout (inject) du flux deposit → open → close → settle → withdraw
- [ ] [env] Vérif sur testnet avec le vault réel (un règlement signé qui passe)

## Phase 3 — Front : mode « Perp on-chain » · 2026-07-14 → 2026-07-21
**Jalon démo :** *dans le terminal, connecter MetaMask, déposer du RLUSD, ouvrir/fermer un perp adossé au collatéral on-chain, retirer.* `[∥]` avec la fin de P2.

- [ ] [code] Connexion EVM (**wagmi/viem** + MetaMask) à côté de Xaman/GemWallet existants ; réseau XRPL EVM
- [ ] [code] UI **deposit/withdraw RLUSD** vers le vault + affichage du **collatéral on-chain** et de la marge libre
- [ ] [code] Nouveau mode **« Perp on-chain »** dans le terminal dérivés (à côté de Paper / Live spot) ; le blotter F16 pilote l'affichage
- [ ] [code] i18n FR/EN, états de transaction (pending/confirmé/échec), garde-fous UX (réseau non connecté, collatéral insuffisant)
- [ ] [env] Vérif navigateur runtime sur testnet (deposit → trade → settle → withdraw visibles)

## Phase finale — Durcissement, démo & décision mainnet · 2026-07-22 → 2026-07-28
*Buffer obligatoire. Ne pas le sacrifier pour caser une feature.*

- [ ] [code] **Slither** sur les contrats + corrections ; cap de notional global ; **insurance fund** minimal
- [ ] [code] Stabiliser / corriger les bugs bloquants ; tests e2e testnet complets
- [ ] [code] Doc d'archi (`docs/PERP-SIDECHAIN.md`) : contrat, flux settlement, frontières de confiance, dette
- [ ] [code] Préparer la démo (scénario testnet) + mettre à jour `CLAUDE.md` (état courant) et `docs/DEVLOG.md`
- [ ] [env] **Décision mainnet** (`1440000`) : déployer seulement si la démo testnet tient, et avec **capital symbolique** (pas d'audit complet en temps de hack)

---

## Hors-scope (coupé de ce MVP v2)
- Perp **entièrement on-chain** (orderbook/vAMM, marge, funding, liquidations on-chain) — c'est l'inverse du choix hybride.
- **Liquidations trustless** on-chain (gérées off-chain par l'opérateur ; semi-custodial assumé).
- **Audit de sécurité complet** (hors temps de hack → mainnet à capital symbolique seulement).
- Oracle **basse latence** on-chain (Band trop lent → mark price off-chain).
- Multi-collatéral (RLUSD uniquement) ; multi-actifs perp au-delà du strict nécessaire à la démo.
- Toute brique qui **viserait le `SourceTag` L1** : assumé hors prix hackathon (piste v2).

## Risques de planning
| Risque | Signe d'alerte | Plan B |
|---|---|---|
| **Cadence Band** inexploitable / oracle figé | Phase 0 : timestamps Band qui ne bougent pas | Aucun blocage : mark price reste off-chain (feed CEV), Band réduit à un check de dispute optionnel |
| **Toolchain `solc 0.8.24`** : lib qui exige Cancun/transient storage | échec de compilation Foundry en Phase 0/1 | Garder les contrats simples (OZ only), pas de dépendance post-Shanghai |
| **Liquidité RLUSD testnet/mainnet** trop faible | deposit/withdraw impossibles, slippage | Rester testnet ; mainnet à capital symbolique ; envisager USDC bridgé en secours |
| **Bridge Axelar / PoA** indispo ou lent | gas/collatéral bloqués au pont | Repli testnet ; documenter l'hypothèse de confiance dans la démo |
| **Settlement signé** : complexité multisig | retard Phase 2 | MVP avec une clé opérateur unique (single-sig) puis migrer vers Safe |
| **Glissement de scope** (vers du full on-chain) | on commence à coder funding/liquidation on-chain | Recadrer sur l'hybride : la chaîne ne fait que custodier + régler |
| **SourceTag non gagné** | confusion avec les prix hackathon | Assumé : piste v2 séparée, ne touche pas au funnel L1 taggé |
