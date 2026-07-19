# Analytics Tide avec Plausible

Le front charge Plausible uniquement si `VITE_PLAUSIBLE_DOMAIN` et
`VITE_PLAUSIBLE_SCRIPT_URL` sont définis au moment du build. Le script reste
désactivé en développement et ne reçoit ni seed, ni adresse XRPL, ni `userId`
Tide, ni token admin.

Plausible fournit des statistiques agrégées : visiteurs, visites, pages et
routes hash (`#/dashboard`, `#/portfolio`…), referrers, campagnes UTM,
appareils, pays/régions et durée d'engagement. Il ne sert pas à savoir qui est
une personne donnée : pas de cookies ni d'IP persistante.

## Plausible Cloud

1. Créer le site `tidetrade.xyz` dans Plausible.
2. Copier les valeurs de [`apps/web/.env.example`](../apps/web/.env.example)
   dans un fichier local non commité `apps/web/.env.production.local`.
3. Lancer le build avec les variables :

```bash
pnpm --filter @tide/web build
```

Le dashboard Plausible doit ensuite avoir les objectifs optionnels activés pour
les liens sortants et téléchargements. Tide active aussi le suivi des routes en
hash afin que les vues SPA soient distinctes.

## Instance auto-hébergée

Plausible Community Edition demande PostgreSQL, ClickHouse, des sauvegardes,
des mises à jour de sécurité et un hostname HTTPS dédié, par exemple
`analytics.tidetrade.xyz`. Une fois l'instance déployée et la route Cloudflare
créée, remplacer les deux URLs dans le fichier local :

```dotenv
VITE_PLAUSIBLE_DOMAIN=tidetrade.xyz
VITE_PLAUSIBLE_SCRIPT_URL=https://analytics.tidetrade.xyz/js/script.js
VITE_PLAUSIBLE_ENDPOINT=https://analytics.tidetrade.xyz/api/event
```

Puis rebuilder le front et remplacer `deploy/dist/` sur le serveur. Le serveur
Plausible lui-même ne doit jamais partager le réseau ni les secrets des wallets
custodiaux Tide.
