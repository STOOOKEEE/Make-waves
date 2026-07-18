# Wallet custodial Paper — XRPL Mainnet

Ce runtime associe un wallet XRPL custodial à chaque compte Tide Paper :

1. `POST /accounts/ensure` génère une adresse et chiffre sa seed AES-256-GCM dans la DB privée. Aucun XRP n'est envoyé à ce stade et le compte n'existe pas encore sur le ledger.
2. Le premier fill Paper appelle le provisionnement idempotent. Le funder dédié envoie exactement 1,25 XRP.
3. L'issuer dédié mint le NFT XLS-20 `First Trade`, crée une offre à 0 XRP réservée au wallet, puis l'API l'accepte avec la seed déchiffrée uniquement en mémoire.
4. La console admin privée permet de mint/mettre un NFT individuel, de brûler les NFT, puis d'exécuter `AccountDelete` vers une adresse de récupération séparée.

Le runtime est Mainnet-only et utilise exclusivement les tables SQLite `paper_wallets_mainnet`, `weekly_rewards_mainnet` et `paper_badge_rewards_mainnet`.

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
- Aucun de ces secrets n'est inclus dans le build web, les DTO ou la console admin.

Pour un pilote, utiliser `MAX_WALLETS=10` et `MAX_DAILY=5`, vérifier les transactions et le sweep, puis augmenter progressivement jusqu'à 300.
