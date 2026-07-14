# Admin Dashboard — console opérateur de supervision des comptes

**Date** : 2026-07-14
**Branche** : `feat/roadmap-lots`
**Statut** : design validé, en attente de plan d'implémentation

## Problème

Aucune vue d'ensemble de la population de comptes n'existe. À l'approche de la démo mainnet, Armand doit pouvoir répondre à froid : « combien d'utilisateurs ? et parmi eux, quelle part sont mes comptes de test, quelle part sont des visiteurs organiques du front, quelle part sont pilotés par un agent IA ? ». Aujourd'hui il faudrait interroger la base SQLite à la main.

## Objectif

Une **console opérateur en lecture seule** qui liste tous les comptes créés (users paper + agents IA + wallets XRPL Live) avec, en tête, un **résumé segmenté** de la population d'utilisateurs. Protégée par un token opérateur. Aucune mutation.

Non-objectifs (YAGNI, à ajouter si demandé) : actions (kill/pause agent, révoquer mandat, créditer/reset un compte), pagination, auth multi-utilisateur, fetch systématique des soldes on-chain.

## Modèle des comptes (état vérifié dans le code)

- **Users paper** (`account-store`) : un enregistrement par `userId` (soldes + positions). `snapshots()` liste déjà tout le monde.
- **Agents IA** (`agent-store`) : entités séparées, chacune rattachée à un `userId` **owner**. Un agent **trade sur le compte paper de son owner** (le `userId` est passé par le front à `/api/agent-chat/stream`), il n'a **pas** de compte paper dédié.
- **Wallets XRPL Live** : dérivés des agents `hasLiveAccount === true` (adresse dans `agent-xrpl-keys-store`) + le compte prize pool multisig (adresse issue de la config).

## Segmentation des utilisateurs

Chaque compte paper est classé par son `userId` selon une précédence **stricte** (le premier qui matche gagne) :

1. **operator** (« à moi ») — `userId` présent dans l'allowlist `TIDE_OPERATOR_USER_IDS` (env, CSV). Précédence maximale : un compte à moi reste à moi même s'il fait tourner un agent.
2. **agent** — `userId` est l'owner d'au moins un agent (présent dans `agents.list()`).
3. **frontend** — tout le reste (visiteur anonyme organique via `tide.paperUserId`).

`TIDE_OPERATOR_USER_IDS` vide → segment `operator` à 0, tout le non-agent tombe en `frontend`. Armand peuple l'allowlist quand il veut isoler ses comptes de test ; aucun blocage si absent.

## Architecture

### Garde token (`/admin/*`)

`preHandler` Fastify sur les routes admin : compare le header `x-admin-token` à `TIDE_ADMIN_TOKEN` (env).

- Env **absent** → routes admin **non montées** (404). Rien n'est exposé en prod tant que le token n'est pas configuré (même patron OFF-par-défaut que l'issuer NFT).
- Header manquant ou différent → **401**.

### Backend

- **Store** : ajout `AgentStore.list(): Promise<Agent[]>` (le seul manque). Implémenté dans `InMemoryAgentStore` et `SqliteAgentStore`.
- **Service** `AdminService` (nouveau) : une méthode `overview()` qui assemble :
  - **totals** : `{ users: number, bySegment: { operator, frontend, agent }, agents: { total, active, paused, stopped }, wallets: number }`.
  - **users[]** : pour chaque `snapshots()` → `{ userId, segment, equity, pnl, orders: number, positions: number, rank }`. Equity/pnl/rang réutilisent le calcul leaderboard existant (pas de duplication).
  - **agents[]** : `agents.list()` → `{ id, name, type, status, ownerUserId, hasLiveAccount, mandate: {active?, capitalMax, maxLeverage, validUntil} | null, lastAction: {toolName, executedAt} | null, createdAt }`. Mandat actif via `mandate-store.getActive`, dernière action via `agent-actions-store`.
  - **wallets[]** : agents `hasLiveAccount` → `{ address, kind: "agent", agentId, live: true }` ; + prize pool → `{ address, kind: "prize_pool", live: true }`. Solde on-chain **non fetché** en v1 (adresse + flag seulement). *ponytail : ajouter le solde on-chain quand `XRPL_WSS_URL` est câblé et que le besoin apparaît.*
- **Route** `GET /admin/overview` (derrière la garde) → renvoie l'objet `overview()`.
- **Client** `@tide/client` : `adminOverview(token: string)` (passe le header).

### Frontend

- **Vue** `AdminView.vue`, route `/admin`, **hors navigation publique** (aucun lien dans `AppBar`/footer).
- **Écran token** : champ token → persisté en `sessionStorage`. 401 → efface + redemande.
- **Résumé en tête** : cartes de totaux — total users + barre/segments (operator / frontend / agent avec compte et %), total agents (par statut), total wallets.
- **3 sections filtrables** (onglets ou filtre unique) :
  - **Users** : userId, segment (pastille colorée), equity, pnl, #ordres, #positions, rang.
  - **Agents** : nom, type, statut, owner, mandat (résumé), dernière action, badge Live.
  - **Wallets** : adresse, kind (agent / prize pool), Live.
- **Recherche** (userId/adresse/nom) + **tri** sur colonnes clés. Tokens design de `docs/DESIGN.md`, **zéro nouvelle dépendance**.
- **Lecture seule** : aucun bouton de mutation.

## Données & flux

```
AdminView (/admin, token en sessionStorage)
   └── GET /admin/overview   [header x-admin-token]
         └── preHandler garde (TIDE_ADMIN_TOKEN)
               └── AdminService.overview()
                     ├── accounts.snapshots() + leaderboard calc  → users[]
                     ├── agents.list() + getActive + lastAction    → agents[]
                     ├── agents(hasLiveAccount) + config prizePool  → wallets[]
                     └── segmentation (allowlist + owners d'agents) → totals
```

## Gestion des erreurs

- Env `TIDE_ADMIN_TOKEN` absent → route non montée (404). Le front affiche « console désactivée (token non configuré) ».
- Token invalide → 401 → le front efface le token stocké et réaffiche l'écran de saisie.
- Compte sans agent / sans mandat → champs `null` (pas d'erreur).
- Le `overview()` ne doit jamais planter sur un compte partiel (soldes vides, positions vides) : valeurs par défaut.

## Tests

- **Unitaire `AdminService`** : segmentation (les 3 buckets + précédence operator > agent > frontend), totaux cohérents (somme des segments = total users), agents avec/sans mandat, wallets dérivés.
- **`AgentStore.list()`** : InMemory + SQLite renvoient tous les agents.
- **Route** : 404 sans env, 401 sans/mauvais token, 200 + forme du payload avec bon token.
- Le test service est le garde-fou minimal exigé (chemin de comptage/segmentation = logique non triviale).

## Sécurité

- Token comparé côté serveur ; jamais loggé. Env hors repo (`.env`, cf. `.env.example` à documenter).
- Lecture seule : aucune surface de mutation, aucune clé privée exposée (les wallets ne renvoient que l'adresse publique, jamais `encryptedPrivateKey`).
- Route non montée par défaut → pas d'exposition accidentelle en prod.

## Config (nouvelles variables env)

| Variable | Rôle | Défaut |
|---|---|---|
| `TIDE_ADMIN_TOKEN` | Active + protège la console. Absent = désactivée. | (absent) |
| `TIDE_OPERATOR_USER_IDS` | CSV des userId « à moi » pour le segment operator. | (vide) |

## Ce qui est délibérément écarté

- Actions opérateur (kill/pause/mandat/crédit/reset) — lecture seule assumée.
- Pagination — l'échelle hackathon tient en un payload ; passer à des endpoints par type (`/admin/users|agents|wallets`) si ça grossit.
- Soldes on-chain des wallets — adresse + flag seulement en v1.
