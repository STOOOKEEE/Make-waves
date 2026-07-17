# Wallet Paper + NFT First Trade — XRPL Testnet

Ce parcours est un test end-to-end, **strictement Testnet**. Le serveur refuse
de démarrer si le provisioning est configuré avec
`TIDE_PAPER_WALLET_NETWORK=mainnet`.
Il ne doit pas être présenté comme une population Mainnet réelle.

## Parcours

1. Le navigateur demande `POST /auth/paper`.
2. L'API génère une identité opaque `paper:<uuid>` et un JWT signé.
3. Le compte Paper reçoit 10 000 RLUSD virtuels et peut trader sans wallet tiers.
4. Au premier fill, l'API génère un wallet XRPL Testnet et chiffre sa seed en
   AES-256-GCM avant insertion dans `paper_wallets`.
5. Le funder dédié envoie **1,25 Test XRP** au nouveau wallet.
6. L'issuer dédié mint le XLS-20 `First Trade`, crée une offre à 0 réservée au
   wallet, puis le backend accepte cette offre avec la seed déchiffrée en mémoire.
7. Le front ne reçoit que l'adresse publique et les statuts/tx hashes. La seed,
   même chiffrée, n'est jamais renvoyée par HTTP.

Le montant 1,25 XRP correspond aux réserves actuelles vérifiées sur Testnet le
17/07/2026 : 1 XRP de réserve de compte + 0,2 XRP pour la première
`NFTokenPage` + 0,05 XRP de marge de frais. Les réserves doivent être revérifiées
avant une campagne, car elles peuvent changer :
<https://xrpl.org/docs/concepts/accounts/reserves>.

## Configuration locale/Testnet

```bash
TIDE_PAPER_WALLET_NETWORK=testnet
TIDE_PAPER_WALLET_WSS_URL=wss://s.altnet.rippletest.net:51233
TIDE_PAPER_WALLET_SOURCE_TAG=123
TIDE_PAPER_WALLET_ISSUER_SEED=s...
TIDE_PAPER_WALLET_FUNDER_SEED=s...
TIDE_PAPER_WALLET_KEY_MASTER=<64 hex>
TIDE_PAPER_WALLET_KEY_ID=paper-v1
TIDE_FIRST_TRADE_IMAGE_URI=ipfs://bafy...
TIDE_PUBLIC_BASE_URL=https://api.example.test
```

Générer la clé maître hors repo :

```bash
openssl rand -hex 32
```

Le funder et l'issuer doivent être deux comptes Testnet dédiés. Ce bloc de
configuration est volontairement indépendant de `TIDE_XRPL_NETWORK` et
`XRPL_WSS_URL` : le Live peut rester sur Mainnet sans que le programme de
récompense puisse y envoyer des fonds. Ne jamais réutiliser une seed Mainnet ni
la clé maître des agents. La base SQLite peut être dans un volume privé ; la clé
maître doit rester séparée, dans le gestionnaire de secrets de l'environnement.

## Visuel et IPFS

Le visuel original est servi par `GET /badges/first_trade.svg`. Pour le pinner
sur un nœud Kubo/IPFS ou un provider compatible avec l'API RPC :

```bash
TIDE_IPFS_API_URL=http://127.0.0.1:5001 \
pnpm --filter @tide/api nft:pin-first-trade
```

Si le provider exige une authentification, poser `TIDE_IPFS_API_AUTH` dans
l'environnement. La commande affiche uniquement :

```text
TIDE_FIRST_TRADE_IMAGE_URI=ipfs://<CID-réel>
```

Cette valeur est ensuite copiée dans l'environnement de l'API. Aucun faux CID
ou gateway HTTP mutable n'est accepté par la configuration.

## Récupération des Test XRP

La commande opérateur est locale et refuse Mainnet :

```bash
pnpm --filter @tide/api paper-wallet:reclaim -- \
  --user-id=paper:<uuid>
```

Elle :

1. déchiffre la seed en mémoire et vérifie qu'elle correspond à l'adresse DB ;
2. brûle tous les NFT encore détenus par le wallet ;
3. refuse la suppression tant qu'un objet XRPL subsiste ;
4. attend la maturité obligatoire de 255 ledgers ;
5. soumet `AccountDelete` avec `fail_hard`, vers le compte funder ;
6. marque le wallet `reclaimed` dans la DB.

Il faut généralement lancer la commande une première fois pour brûler les NFT,
puis une seconde fois après le ledger indiqué. Avec 1,25 XRP et un coût
`AccountDelete` actuel de 0,2 XRP, la récupération théorique est proche de
1,05 XRP, soit environ **84 %**, hors frais ordinaires. Voir :
<https://xrpl.org/docs/references/protocol/transactions/types/accountdelete> et
<https://xrpl.org/docs/concepts/accounts/deleting-accounts>.

## Garde-fous

- configuration OFF par défaut ;
- refus systématique hors Testnet ;
- funder dédié et plafonné ;
- seeds chiffrées AES-256-GCM, clé maître hors DB ;
- intention de funding persistée avant soumission pour éviter un double paiement ;
- mint First Trade idempotent, état `minting` gelé en cas de résultat ambigu ;
- profils de simulation exclus du provisioning ;
- aucun endpoint HTTP de destruction de wallet.
