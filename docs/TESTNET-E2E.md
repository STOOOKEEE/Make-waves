# Parcours E2E Testnet — agent LLM, wallet et NFT

Ce document décrit le parcours de vérification **manuel** qui exerce les
composants Tide de bout en bout, sans utiliser de fonds ni de credentials
Mainnet.

## Ce qui est vérifié

Pour chaque profil configuré, le runner exécute la séquence suivante :

1. Le faucet XRPL Testnet crée et finance un wallet de test.
2. Tide crée un agent intégré Paper avec un mandat très limité.
3. Le LLM reçoit l'instruction de placer un unique ordre `BUY XRP` Paper via
   les outils MCP habituels.
4. Le runner vérifie que l'ordre a réellement été enregistré dans `PaperService`.
5. Le trade qualifie le profil pour la récompense hebdomadaire.
6. L'issuer dédié minte le NFT, crée une offre à destination du wallet Testnet,
   puis le wallet accepte l'offre.

Un run échoue explicitement si le LLM ne produit pas l'ordre attendu ou si le
claim NFT ne finit pas au statut `claimed`.

Les profils portent le préfixe `e2e:testnet:`. Ils sont exclus du leaderboard
public, des totaux d'utilisateurs et des autres surfaces humaines. Ils ne sont
donc pas des métriques d'acquisition.

## Garde-fous

- Le runner est désactivé sans `TIDE_E2E_TESTNET_USERS`.
- Il refuse de démarrer si `TIDE_XRPL_NETWORK` n'est pas exactement `testnet`.
- L'action est manuelle, protégée par le token admin : aucun wallet, appel LLM
  ou mint n'est lancé au boot.
- Les wallets receveurs sont éphémères : leurs seeds restent uniquement en
  mémoire du processus et ne sont jamais écrites dans SQLite.
- L'issuer est un compte **Testnet dédié**. Ne jamais employer un seed Mainnet
  ou réutiliser un credential Testnet sur Mainnet.
- La cohorte est volontairement bornée à 10 profils par run ; commencer avec 1.

## Prérequis

1. Un serveur Tide avec la console admin activée (`TIDE_ADMIN_TOKEN`) et une
   clé LLM valide (`TIDE_LLM_API_KEY`).
2. Un compte issuer **Testnet** distinct, créé et financé au faucet Testnet.
   Conserver son seed uniquement dans l'environnement du serveur.
3. Une API publique joignable pour servir les métadonnées NFT, par exemple
   `https://api.example.test` via `TIDE_PUBLIC_BASE_URL`.

Le faucet est fourni par `xrpl.js` pour les réseaux de test ; il ne fournit pas
de fonds Mainnet. Les réseaux de test peuvent être réinitialisés : cela est
normal et impose alors de recréer l'issuer et les profils. Voir la
[référence `Client.fundWallet`](https://js.xrpl.org/classes/Client.html) et les
[faucets XRPL](https://xrpl.org/resources/dev-tools/xrp-faucets).

## Configuration

Ajouter les valeurs suivantes au fichier d'environnement du serveur de test :

```env
# Prérequis serveur existants
TIDE_ADMIN_TOKEN=<token-admin>
TIDE_LLM_API_KEY=<clé-provider>
TIDE_LLM_BASE_URL=https://api.deepseek.com/anthropic
TIDE_LLM_MODEL=deepseek-v4-flash
TIDE_PUBLIC_BASE_URL=https://api.example.test

# Le runner refuse tout autre réseau.
TIDE_XRPL_NETWORK=testnet
TIDE_E2E_TESTNET_USERS=1
TIDE_E2E_TESTNET_ISSUER_SEED=s...
TIDE_E2E_TESTNET_SOURCE_TAG=123
TIDE_E2E_TESTNET_WSS_URL=wss://s.altnet.rippletest.net:51233
```

`TIDE_E2E_TESTNET_SOURCE_TAG` doit être un entier non nul. Il est attaché aux
transactions NFT du test afin de les retrouver facilement dans l'explorateur.
Il peut être différent du SourceTag réservé au produit Mainnet.

Redémarrer l'API après la modification. Si la configuration n'est pas complète,
le serveur échoue au boot plutôt que de dégrader silencieusement le parcours.

## Lancer et contrôler un run

1. Lancer le front local avec `pnpm --filter @tide/web dev`, ouvrir
   `http://localhost:5173/#/admin` et saisir le token admin. La console et ses
   routes sont volontairement absentes des builds et runtimes de production.
2. Vérifier que la carte **Parcours E2E Testnet** indique `idle` et le nombre
   de profils configurés.
3. Cliquer sur **Lancer le parcours Testnet**.
4. Attendre l'état `succeeded` et `N / N profils terminés`.

## Custody locale des wallets

La même console locale permet ensuite :

- de créer et financer manuellement 1 à 10 wallets persistants et chiffrés ;
- de choisir un wallet financé et de lui distribuer individuellement un badge
  du catalogue ;
- de supprimer un wallet précis après confirmation de son `userId` ;
- de lancer une récupération globale après saisie exacte de
  `DELETE ALL TESTNET WALLETS`.

La récupération est asynchrone. Pour chaque wallet, Tide brûle d'abord les NFT
détenus, attend automatiquement le délai XRPL de 256 ledgers, vérifie qu'aucun
objet ne bloque la suppression, puis soumet `AccountDelete` avec `fail_hard`.
Le coût spécial courant est l'owner reserve (0,2 XRP) ; le reste est envoyé à
l'adresse dérivée de `TIDE_PAPER_WALLET_ISSUER_SEED`. La console affiche la
progression et n'expose jamais les seeds déchiffrées.

L'endpoint équivalent, utile pour l'automatisation d'un environnement de test,
est :

```http
POST /admin/testnet-e2e/run
x-admin-token: <token-admin>
```

Les états possibles sont `idle`, `running`, `succeeded` et `failed`. En cas
d'échec, la console affiche l'erreur de la dernière étape. Une nouvelle
exécution crée de nouveaux profils et wallets Testnet pour ne pas mélanger un
claim hebdomadaire déjà consommé avec le test suivant.

## Interpréter le résultat

Un succès prouve le chemin **LLM → MCP → ordre Paper → récompense → NFT XLS-20
accepté**. Il ne prouve pas un swap DEX Live : celui-ci reste une vérification
séparée, avec son propre wallet et sa propre procédure de signature.

Les transactions NFT peuvent être recherchées dans l'explorateur Testnet avec
le SourceTag de test et les adresses de l'issuer ou des profils affichées dans
les logs opérateur.

## Passage futur au Mainnet

Le runner Testnet ne doit pas être basculé en changeant simplement une URL. Le
passage Mainnet demande une procédure distincte : compte issuer dédié et
plafonné, financement budgété, clés chiffrées et sauvegardées, SourceTag
réservé, validation des transactions dans l'explorateur et accord opérateur
avant chaque campagne. Aucun des secrets Testnet ne doit être réutilisé.
