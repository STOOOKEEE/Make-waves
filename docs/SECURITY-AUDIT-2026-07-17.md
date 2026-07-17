# Audit sécurité — 17 juillet 2026

## Résultat exécutif

- Aucun secret détecté dans 184 commits par Gitleaks.
- `pnpm audit` : aucune vulnérabilité connue après mise à jour de Vite/Vitest et
  verrouillage de `ws` 8.21.0.
- 954 tests, typecheck 8/8, lint 0 et build de production verts.
- La console admin est absente du bundle public et désactivée dans l'API de
  production. Elle reste un outil local en lecture seule.
- Le provisioning wallet/NFT est OFF en production : zéro wallet dans
  `paper_wallets` et aucune variable `TIDE_PAPER_WALLET_*` dans le conteneur.

## Funder Testnet historique

Le funder du spike a été retrouvé hors repo dans
`/Users/armandsechon/dev/hackathon/tide-fleet/.env`, variable
`SPIKE_FUNDER_SEED`. Le fichier est en mode `0600` et ignoré par Git.

- Adresse publique : `rN8yzASKPEfM4Wx3pGAAoJW1s6zbqi1p96`
- Solde vérifié : 203,49997 Test XRP
- La seed n'est ni copiée dans ce document, ni journalisée, ni envoyée au site.
- À 1,25 XRP par wallet, ce solde ne couvre qu'environ 162 wallets avant frais ;
  la cible de 300 nécessite au moins 375 Test XRP plus les frais/objets issuer.

## Stockage des wallets Paper

Le code chiffre chaque seed avec AES-256-GCM et un IV aléatoire avant insertion
dans SQLite. La clé maître reste dans l'environnement et n'est pas stockée dans
la DB. Les routes HTTP ne renvoient que l'adresse, le statut et les hashes de
transactions. Aucun endpoint HTTP d'export ou de destruction de seed n'existe.

Durcissements appliqués :

- conteneur API exécuté avec l'utilisateur non privilégié `node` ;
- umask `077`, volume `/data` en `0700`, DB destinée à `0600` ;
- fichier `deploy/api.env` en `0600` ;
- CORS production fermé sur `tidetrade.xyz` et `www.tidetrade.xyz` ;
- isolation inter-utilisateurs vérifiée : une session Paper B reçoit 403 sur le
  compte de la session A ;
- le runtime wallet possède sa propre configuration Testnet et refuse Mainnet.

## Session et persistance Paper

Les soldes, ordres et positions sont transactionnels dans SQLite. Un ordre spot
apparaît dans l'historique et les soldes, pas dans `Positions`. Seul un ordre
perp ouvre une ligne dans `Positions`.

L'identité Paper et son JWT sont conservés dans `localStorage` sous
`tide.paperUserId` et `tide.paperSessionToken`. Un refresh normal réutilise les
deux valeurs ; un test couvre la reconstruction complète de l'app. L'interface
affiche maintenant une empreinte courte « Session Paper » pour détecter
immédiatement un changement de profil navigateur ou un effacement du stockage.

Observation production pendant l'audit : une position perp est bien persistée
sous une ancienne identité Paper, tandis qu'une identité plus récente est vide.
Sans le token du profil navigateur d'origine, rattacher automatiquement les deux
identités serait une prise de contrôle de compte ; aucune fusion non authentifiée
n'est donc réalisée.

## Console locale

La console locale liste les comptes, agents, mandats et wallets. Elle inclut
désormais les wallets Paper avec adresse publique, userId et statut de funding,
mais jamais `encrypted_seed` ni la clé maître. Elle reste en lecture seule et ne
permet ni export de seed, ni paiement, ni destruction.

Limite assumée : cette console locale ne se connecte pas directement à la DB de
production. Pour superviser la production, utiliser une copie DB en lecture
seule ou un tunnel SSH vers un service admin séparé lié à localhost ; ne jamais
réactiver `/admin` sur le domaine public.

## Points restant avant activation des 300 wallets

1. créer un issuer Testnet séparé du funder ;
2. pinner réellement le visuel First Trade sur IPFS ;
3. réalimenter le funder au-delà de 375 Test XRP ;
4. ajouter un plafond global de 300 créations et une alerte de solde ;
5. décider d'une procédure authentifiée de récupération de session longue durée ;
6. sauvegarder la clé maître séparément de la DB et tester la restauration.
