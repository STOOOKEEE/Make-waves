# Connexion Tide par email et Google

Tide utilise Supabase Auth comme fournisseur d'identité. Le backend Tide garde
sa propre session et relie une identité externe au compte Paper déjà créé. Le
`paper:*`, ses trades et son wallet custodial restent donc inchangés après un
rafraîchissement, un changement de navigateur ou une connexion sur un autre
appareil.

## Principe de liaison

1. Tide crée la session Paper et son compte comme aujourd'hui.
2. L'utilisateur choisit **Email** ou **Google** dans la fenêtre de connexion.
3. Au premier login, le backend lie l'identité Supabase au `paper:*` courant.
4. Aux logins suivants, cette identité retrouve toujours ce même `paper:*`.
5. Le wallet XRPL reste custodial : aucune seed ni clé privée n'est exposée au
   navigateur ou à Supabase.

La DB privée Tide ne conserve que l'identifiant Supabase, le fournisseur et
l'email normalisé. Elle ne conserve aucun access token Supabase/Google.

## Configuration Supabase

1. Créer un projet Supabase dédié à Tide.
2. Activer **Email** avec magic links dans Authentication > Providers.
3. Activer **Google** dans Authentication > Sign In / Providers.
4. Dans Google Auth Platform > Clients, créer un client **Web application**.
   Ajouter `https://tidetrade.xyz` aux origines JavaScript autorisées et l'URL
   `https://<project-ref>.supabase.co/auth/v1/callback` aux URI de redirection
   autorisés. Copier ensuite son Client ID et son Client Secret dans Supabase.
5. Dans Supabase Authentication > URL Configuration, définir le Site URL sur
   `https://tidetrade.xyz` et autoriser au minimum :
   - `https://tidetrade.xyz/**`
   - `http://127.0.0.1:5173/**` pour le développement local

## Variables de production

Build du frontend (`apps/web/.env.production` ou variables injectées au build) :

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Backend (`deploy/api.env` sur le serveur) :

```dotenv
TIDE_AUTH_SUPABASE_URL=https://<project-ref>.supabase.co
TIDE_AUTH_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Ces quatre valeurs sont publiques. Ne jamais utiliser ni exposer la clé
`service_role`. Après modification, reconstruire le frontend et redémarrer
l'API pour activer la route d'échange de session.

## Contrôles de sécurité

- Le backend vérifie chaque access token directement auprès de Supabase Auth.
- La première liaison exige une session Paper Tide valide.
- Une identité externe déjà liée gagne toujours sur la session locale courante :
  elle ne peut pas être déplacée vers le compte Paper d'un autre navigateur.
- La route est absente fonctionnellement (`501`) sans configuration complète.
- Les secrets des wallets financés restent chiffrés uniquement dans la DB privée
  existante et ne transitent jamais par ce parcours d'authentification.
