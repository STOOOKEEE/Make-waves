# Wallet custodial Paper — XRPL Mainnet

Ce runtime couvre deux parcours XRPL distincts : le wallet custodial Paper (option A) et le wallet personnel connecté (option B).

1. `POST /accounts/ensure` ouvre seulement l'identité Paper off-chain. Depuis le dashboard, le bouton **Connect wallet** propose soit de créer un wallet Paper financé, soit de connecter Xaman/GemWallet.
2. En option A, `POST /accounts/:userId/paper-wallet/claim` génère le **wallet 1**, chiffre sa seed AES-256-GCM, puis le funder dédié lui envoie **2,22 XRP**. Ce montant garde la réserve de base du wallet 1 pendant le paiement de 1,21 XRP vers le wallet 2, avec une petite marge de frais. Le backend refuse les ordres spot/perp Paper tant que ce wallet n'est pas financé.
3. Le premier fill Paper ne soumet aucune transaction XRPL : il rend le NFT `First Trade` éligible. Au second claim (`POST /accounts/:userId/paper-wallet/reward/claim`), Tide génère le **wallet 2** et déchiffre la seed du wallet 1 uniquement en mémoire. Le wallet 1 signe un `Payment` taggé de **1,21 XRP** vers le wallet 2.
4. L'issuer dédié mint le NFT XLS-20 `First Trade`, crée une offre à 0 XRP réservée au wallet 2, puis le wallet 2 accepte l'offre. Une fois le NFT accepté, Tide clôture le wallet 1 par `AccountDelete` taggé : le coût spécial actuel est **0,2 XRP** et le solde restant est envoyé au wallet 2 par défaut. Le statut `deleted` permet une reprise contrôlée si le réseau a interrompu cette dernière étape.
5. En option B, l'utilisateur connecte Xaman ou GemWallet avant de trader. Le Paper trading est comptabilisé sous son adresse XRPL ; après le premier fill, le claim `first_trade` mint l'offre vers **son wallet**, et il signe lui-même `NFTokenAcceptOffer` dans Xaman/GemWallet.
6. Chaque transaction Tide pertinente porte le `SourceTag`. La réception d'un NFT ne constitue pas à elle seule un volume de trading ; aucun `OfferCreate` artificiel n'est généré automatiquement, car ce serait du volume auto-généré/wash trading sans confirmation de l'organisateur. Un vrai swap Live reste signé par l'utilisateur.

Les deux options sont idempotentes et protégées contre le farming : une adresse ne peut pas être reliée à plusieurs sessions Paper, les wallets reliés à une même session partagent leur historique de récompense, et un plafond quotidien de claims externes est appliqué.

Le runtime est Mainnet-only et utilise exclusivement les tables SQLite `paper_wallets_mainnet`, `paper_reward_wallets_mainnet`, `weekly_rewards_mainnet` et `paper_badge_rewards_mainnet`.

## Variables obligatoires

```dotenv
TIDE_PAPER_WALLET_WSS_URL=wss://xrplcluster.com
TIDE_PAPER_WALLET_SOURCE_TAG=100
TIDE_PAPER_WALLET_ISSUER_SEED=s...
TIDE_PAPER_WALLET_FUNDER_SEED=s...
TIDE_PAPER_WALLET_KEY_MASTER=<64 caractères hexadécimaux>
TIDE_PAPER_WALLET_KEY_ID=paper-prod-mainnet-v1
TIDE_PAPER_WALLET_MAINNET_ACK=I_UNDERSTAND_THIS_SPENDS_REAL_XRP
TIDE_PAPER_WALLET_RECOVERY_ADDRESS=r...
TIDE_PAPER_WALLET_MAX_WALLETS=300
TIDE_PAPER_WALLET_MAX_DAILY=25
TIDE_PUBLIC_BASE_URL=https://api.tidetrade.xyz
TIDE_FIRST_TRADE_IMAGE_URI=ipfs://bafy.../first-trade.png
```

Le serveur refuse de démarrer si l'acknowledgement, l'adresse de récupération ou les deux plafonds manquent. Il refuse aussi tout endpoint Testnet/Devnet. Le plafond total et le plafond UTC quotidien sont relus depuis SQLite avant chaque Payment et les soumissions du funder sont sérialisées.

## Séparation des secrets

- Le funder est un hot wallet dédié. Il ne reçoit que le budget de campagne prévu.
- L'issuer NFT est un second compte dédié.
- `TIDE_PAPER_WALLET_RECOVERY_ADDRESS` est une adresse froide différente du funder et de l'issuer.
- `TIDE_PAPER_WALLET_KEY_MASTER` chiffre les seeds des wallets utilisateurs. Elle doit être sauvegardée hors serveur ; sa perte rend la récupération impossible.
- Après un `AccountDelete` XRPL confirmé, la seed chiffrée du wallet supprimé est effacée du champ `encrypted_seed`. La ligne reste comme tombstone (adresse, statut, hashes) pour l'audit et l'anti-farming ; elle ne peut plus signer.
- Aucun de ces secrets n'est inclus dans le build web, les DTO ou la console admin.

## Récupération CLI

Le script cible le wallet initial par défaut. Pour le compte NFT secondaire :

```bash
pnpm --filter @tide/api paper-wallet:reclaim -- --user-id=paper:... --wallet=reward
pnpm --filter @tide/api paper-wallet:reclaim -- --user-id=paper:... --wallet=starter
```

La récupération CLI envoie le reliquat vers `TIDE_PAPER_WALLET_RECOVERY_ADDRESS`,
l'adresse froide de réserve — jamais vers le hot funder. Le dashboard admin utilise
la même destination. Toujours tester un seul wallet et vérifier sa transaction
validée avant une récupération globale.

Pour un pilote, utiliser `MAX_WALLETS=10` et `MAX_DAILY=5`, vérifier les transactions et le sweep, puis augmenter progressivement jusqu'à 300.
