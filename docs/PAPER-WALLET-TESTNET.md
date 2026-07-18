# Wallet Paper + NFT First Trade — XRPL Testnet

Ce document décrit le profil de test end-to-end **strictement Testnet**. Le
runtime produit possède désormais un profil Mainnet séparé et explicitement
protégé, documenté dans [`PAPER-WALLET-MAINNET.md`](PAPER-WALLET-MAINNET.md).
Les tables et secrets des deux réseaux ne sont jamais partagés.

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

Pour créer automatiquement un funder et un issuer via le faucet Testnet, ainsi
qu'une clé maître et un token admin locaux :

```bash
pnpm --filter @tide/api testnet:bootstrap-wallets
```

La commande écrit `apps/api/.env.paper-wallet-testnet` en permissions `0600`,
sans afficher les seeds ni le token. Elle refuse d'écraser un fichier existant.
Lancer ensuite l'API et le dashboard local :

```bash
DOTENV_CONFIG_PATH=.env.paper-wallet-testnet pnpm --filter @tide/api start
VITE_API_BASE=http://127.0.0.1:3100 pnpm --filter @tide/web dev
```

Le token à saisir dans `http://127.0.0.1:5173/#/admin` est la valeur locale de
`TIDE_ADMIN_TOKEN` dans ce fichier.

## Production TideTrade, ledger Testnet

Le runtime wallet peut tourner dans l'API de production tout en ciblant
exclusivement XRPL Testnet. À chaque premier ordre Paper sur `tidetrade.xyz`,
l'API crée le wallet associé au `userId` authentifié, chiffre sa seed dans la
SQLite privée du serveur, le finance puis remet le NFT First Trade. Le mode Live
de Tide peut rester Mainnet : les variables `TIDE_PAPER_WALLET_*` forcent et
valident séparément `testnet`.

La console n'est jamais montée sur `api.tidetrade.xyz`. En production elle
écoute sur le port conteneur `3101`, publié par Docker uniquement sur
`127.0.0.1:3101` de l'hôte. Depuis le Mac :

```bash
ssh -N -L 3101:127.0.0.1:3101 <user>@<serveur-tailscale>
VITE_API_BASE=https://api.tidetrade.xyz \
VITE_ADMIN_API_BASE=http://127.0.0.1:3101 \
pnpm --filter @tide/web dev
```

Le tunnel doit rester ouvert pendant l'utilisation de `#/admin`. Une requête
publique vers `https://api.tidetrade.xyz/admin/overview` reste donc en `404`,
même si le serveur possède un `TIDE_ADMIN_TOKEN`.

Configuration manuelle équivalente :

```bash
TIDE_PAPER_WALLET_NETWORK=testnet
TIDE_PAPER_WALLET_WSS_URL=wss://s.altnet.rippletest.net:51233
TIDE_PAPER_WALLET_SOURCE_TAG=123
TIDE_PAPER_WALLET_ISSUER_SEED=s...
TIDE_PAPER_WALLET_FUNDER_SEED=s...
TIDE_PAPER_WALLET_KEY_MASTER=<64 hex>
TIDE_PAPER_WALLET_KEY_ID=paper-v1
# Optionnel pour remplacer l'image locale dans les métadonnées NFT :
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

### Depuis la console locale

La route `#/admin`, absente du build de production, permet aussi de créer et
financer séquentiellement de 1 à 10 wallets techniques. Chaque wallet reçoit un
identifiant `wallet:testnet:<uuid>`, est
exclu des métriques utilisateur et du leaderboard, et sa seed est chiffrée dans
SQLite avant le premier Payment. L'endpoint correspondant est :

```http
POST /admin/wallets/provision
x-admin-token: <token-admin>
Content-Type: application/json

{"count": 1}
```

Les wallets apparaissent ensuite dans la table **Wallets Paper Testnet**, où il
est possible d'envoyer un NFT individuellement ou de lancer
**Supprimer + sweep**. Le funding est volontairement séquentiel pour conserver
une Sequence XRPL correcte sur le compte funder.

### Depuis la ligne de commande

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
