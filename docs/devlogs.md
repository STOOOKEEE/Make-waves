# TideTrade — handoff de conversation

> État au 27 août 2026. Ce fichier sert de point de reprise rapide pour une
> future conversation. Le journal historique exhaustif du projet reste
> [`DEVLOG.md`](DEVLOG.md).

## Demande produit

Le dashboard propose un point d'entrée unique **Connect wallet** avec deux parcours :

1. **Créer un wallet Paper** : Tide génère et finance le wallet 1 avec 2,22 XRP,
   puis l'utilisateur trade en Paper.
2. **Connecter un wallet existant** : Xaman ou GemWallet devient l'identité
   Paper active ; l'utilisateur trade sous sa propre adresse XRPL.
3. Le premier trade Paper suffit à débloquer l'option de claim du NFT
   `First Trade` ; le claim reste volontaire et le wallet personnel signe
   lui-même l'acceptation.
4. En parcours custodial, Tide crée le wallet 2, lui envoie 1,21 XRP depuis le
   wallet 1, lui remet le NFT, puis clôture le wallet 1 par `AccountDelete`
   (coût spécial actuel : 0,2 XRP) en envoyant le reliquat au wallet 2.
5. Une même session Paper ne peut pas réinitialiser la récompense en changeant
   de wallet : les liaisons sont immuables et un plafond quotidien borne les
   claims externes.

Le backend garde le parcours idempotent et gèle les opérations en cas de
résultat XRPL ambigu, afin d'éviter les doubles financements et doubles mints.

## Implémentation du parcours

Les principales routes sont :

- `GET /accounts/:userId/paper-wallet` : état public et non sensible du
  parcours ;
- `POST /accounts/:userId/paper-wallet/claim` : création et financement du
  wallet 1 ;
- `POST /accounts/:userId/paper-wallet/reward/claim` : création du wallet 2,
  financement wallet 1 → wallet 2 et remise du NFT.

Les ordres spot et perp Paper restent refusés tant que le wallet starter
custodial n'est pas financé ; une adresse XRPL authentifiée suit le parcours
externe et peut trader directement. Le premier fill ne déclenche aucune
transaction XRPL automatique : il ne fait que débloquer la seconde étape. Le
claim `first_trade` vers un wallet connecté est autorisé sous garde anti-farming
et l'acceptation est signée par l'utilisateur. Aucun `OfferCreate` artificiel
n'est généré pour fabriquer du volume ; un swap Live doit rester réel et signé
par le joueur.

La migration SQLite ajoute le stockage des wallets reward Mainnet. La console
admin, le script de récupération et les calculs d'inventaire NFT connaissent
désormais les deux wallets. Le script CLI accepte
`--wallet=starter|reward`.

## Déconnexion du compte

Une option de déconnexion a été ajoutée au menu de compte du front :

- identité du compte visible depuis l'`AppBar` ;
- modal `AccountModal.vue` ;
- bouton bilingue de déconnexion ;
- confirmation renforcée pour une session Paper anonyme, car elle peut ne pas
  être récupérable ;
- suppression des tokens Paper/wallet et de l'adresse wallet locale ;
- retour vers la landing page ;
- protection contre la réhydratation tardive d'une ancienne session après la
  déconnexion.

Le bundle actuellement en production contient bien les libellés
`Se déconnecter` et `Se déconnecter quand même`.

## Garantie de non-exposition des seeds

Le navigateur ne reçoit jamais une seed XRPL, même chiffrée :

- les wallets sont générés uniquement par le backend ;
- les seeds sont chiffrées en AES-256-GCM avant persistance SQLite ;
- les seeds des wallets 1 et 2 vivent dans des stockages distincts ;
- le déchiffrement n'a lieu qu'en mémoire côté serveur au moment de signer une
  transaction XRPL ;
- après un `AccountDelete` confirmé, le champ `encrypted_seed` est effacé ; la
  ligne minimale reste comme tombstone pour conserver l'adresse, le statut et
  les hashes sans permettre une nouvelle signature ;
- les DTO du client ne contiennent que l'adresse, le statut et les éventuels
  hashes de transaction utiles ;
- les trois routes Paper wallet ont maintenant un schéma de réponse Fastify
  en liste blanche avec `additionalProperties: false` ;
- ce schéma interdit qu'un futur objet interne fasse fuiter accidentellement
  `seed`, `encryptedSeed`, `encrypted_seed`, `masterKeyId` ou un autre champ
  non déclaré ;
- les routes contrôlent que le `userId` demandé appartient à la session
  authentifiée.

Les tests HTTP utilisent volontairement des seeds connues côté test, puis
vérifient que ni leur version brute, ni leur version chiffrée, ni les noms de
champs sensibles n'apparaissent dans les réponses.

Limite de confiance importante : ce système est custodial. Le serveur Tide
peut techniquement déchiffrer les seeds puisqu'il doit signer les transactions.
La garantie concerne le visiteur, le code frontend, la console navigateur et
les paquets réseau ; elle ne protège pas contre un opérateur serveur ou une
compromission complète du backend possédant également la clé maître.

## Validation locale

État validé avant déploiement :

- `pnpm test` : **1040 tests passés dans 134 fichiers** ;
- `pnpm typecheck` : **8/8 workspaces passés** ;
- `pnpm lint` : **aucune erreur** ;
- build web production avec
  `VITE_API_BASE=https://api.tidetrade.xyz` : réussi ;
- `git diff --check` : propre ;
- test spécifique de la modal de compte et de la déconnexion : passé ;
- test HTTP complet du funnel à deux wallets et des réponses anti-fuite :
  passé.

Les assets construits lors de ce déploiement sont :

- JavaScript principal : `index-DopVMARq.js` ;
- JavaScript secondaire : `index-CT1ejl4M.js` ;
- CSS : `index-BH9HY6md.css`.

## Déploiement en production

Le code a été déployé sur :

- frontend : <https://tidetrade.xyz> ;
- API : <https://api.tidetrade.xyz>.

État observé après déploiement :

- `tide-api` utilise l'image `tide-api:prod` et est `healthy` ;
- `tide-web` utilise `nginx:alpine` et sert le nouveau build ;
- le tunnel Cloudflare est resté actif ;
- le HTML public référence bien `/assets/index-DopVMARq.js` ;
- le hash du JavaScript téléchargé publiquement correspond exactement au
  fichier installé sur le serveur ;
- le site public répond `200` ;
- `/config` répond `200` ;
- une route Paper wallet sans authentification répond `401` ;
- `/admin/overview` depuis le domaine public répond `404` ;
- l'API annonce le réseau Paper wallet `mainnet` ;
- une nouvelle session anonyme testée retourne le statut wallet
  `not_created`, sans déclencher de claim.

Le bundle public et les logs de l'API ont été comparés silencieusement aux
valeurs réelles des secrets de production. Aucun secret réel n'a été trouvé.
La source envoyée sur le serveur avait également été scannée avant le build :
aucun fichier `.env`, aucune base SQLite et aucun secret de production
n'étaient présents dans l'archive.

Les secrets restent dans le fichier ignoré
`/home/armand/tide-app/deploy/api.env`. Sa valeur n'a pas été copiée dans le
repo et son hash est resté identique pendant le déploiement. Ne jamais copier
son contenu dans un ticket, un log ou une future conversation.

## Sauvegardes et rollback

Avant le remplacement, les sauvegardes suivantes ont été créées sur le
serveur :

- source : `/home/armand/tide-source-backup-20260826-2237.tgz` ;
- base SQLite : `/data/tide-predeploy-20260827.db` dans le volume Docker ;
- ancienne image API : `tide-api:rollback-20260827` ;
- ancien build web :
  `/home/armand/tide-app/deploy/dist.rollback-20260827`.

Le conteneur de prévalidation `tide-api-preflight-20260827` a été supprimé à
la fin. Aucun conteneur de preflight ne reste actif.

## Ce qui n'a volontairement pas été exécuté

Aucun appel aux routes de claim n'a été lancé en production pendant la
validation, car cela aurait dépensé de vrais XRP Mainnet. La validation a
couvert le démarrage réel, les réponses publiques, l'authentification, les
assets et l'absence de fuite, sans création de wallet ni transaction on-chain.

Le prochain test fonctionnel manuel pertinent est donc un parcours contrôlé
avec un utilisateur de test :

1. réclamer le wallet 1 ;
2. confirmer son financement on-chain ;
3. passer un premier trade Paper ;
4. vérifier le déblocage du CTA caché ;
5. réclamer le wallet 2 ;
6. vérifier sur XRPL que le paiement vient bien du wallet 1 ;
7. vérifier la possession du NFT par le wallet 2 ;
8. tester la déconnexion puis la reconnexion/récupération du compte.

Ce test doit être fait avec un budget XRP explicitement accepté et en
surveillant les hashes de transaction, sans jamais afficher les seeds.

## État Git et reprise

Le déploiement a été fait depuis la branche `feat/api-security-f1` et depuis
l'état courant du working tree. De nombreux changements étaient déjà non
commit avant cette intervention. **Aucun commit ni push n'a été créé pendant
ce travail**, afin de ne pas mélanger ou attribuer automatiquement les
changements existants de l'utilisateur.

Pour reprendre :

1. lire ce fichier puis la section la plus récente de [`DEVLOG.md`](DEVLOG.md) ;
2. exécuter `git status --short` sans nettoyer le working tree ;
3. préserver tous les changements existants ;
4. relancer tests, typecheck et lint avant un éventuel commit ;
5. séparer si possible le funnel wallet, la sécurité HTTP, la déconnexion et
   les autres travaux déjà présents en commits cohérents ;
6. ne jamais committer les `.env`, seeds, clés maîtres, tokens admin ou bases
   SQLite.

## Fichiers particulièrement concernés

- `apps/api/src/services/paper-wallet-service.ts`
- `apps/api/src/http/server.ts`
- `apps/api/src/store/paper-wallet-store.ts`
- `apps/api/src/store/sqlite-paper-reward-wallet-store.ts`
- `apps/api/test/paper-wallet-flow-routes.test.ts`
- `packages/xrpl/src/custody/wallet-gateway.ts`
- `packages/client/src/client.ts`
- `apps/web/src/views/DashboardView.vue`
- `apps/web/src/components/AccountModal.vue`
- `apps/web/src/components/AppBar.vue`
- `apps/web/src/composables/useSession.ts`
- `apps/web/src/composables/useWallet.ts`
- `.env.example`
- `deploy/api.env.example`
- `deploy/Dockerfile.api`
