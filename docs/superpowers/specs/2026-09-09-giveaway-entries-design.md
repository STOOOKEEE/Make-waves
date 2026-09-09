# Design — Système d'entrées de la tombola (backend)

**Date** : 2026-09-09
**Statut** : design validé. Le front est livré ; ce document décrit la moitié serveur qui reste.
**Branche source** : `feat/giveaway-airpods-max` (page `#/giveaway`, front only).
**Branche cible** : à créer depuis `main` une fois la page fusionnée.

## 1. Où on en est

La page tombola est **en ligne et complète côté front**. Sur les trois règles d'entrée annoncées,
deux sont **déjà réelles** parce qu'elles se dérivent de données que le produit possède :

| Règle | Poids | Source aujourd'hui | Reste à faire |
|---|---|---|---|
| Wallet XRPL connecté | +1 | `session.walletConnected` (Xaman ou GemWallet signé) | rien pour l'affichage ; le tirage a besoin de la liste |
| Premier trade paper | +3 | `client.badges(userId)` → `first_trade.earned` | idem |
| Parrainer un ami | +2 / ami | **rien** | tout : code, lien, attribution, comptage |

La troisième est affichée avec l'état `pending` (« bientôt / opening soon ») et **n'est pas comptée**.
C'est le seul manque fonctionnel de la page.

Il manque aussi, pour **tirer** le gagnant : une liste d'entrées interrogeable côté serveur. Le
front ne montre qu'un total personnel, jamais un total global (`growth/context/05-facts.md` interdit
de publier nos chiffres de traction) — mais l'organisateur, lui, doit pouvoir tirer.

## 2. La couture déjà posée

`apps/web/src/composables/useGiveaway.ts` est le **seul** point par lequel la page lit ses données.
La vue ne parle jamais au client. Le contrat à respecter :

```ts
export type GiveawayRuleId = "account" | "first_trade" | "referral";

export interface GiveawayRule {
  readonly id: GiveawayRuleId;
  readonly weight: number;   // entrées rapportées
  readonly done: boolean;    // règle remplie par ce visiteur
  readonly pending: boolean; // affichée mais pas comptabilisable
}
```

**Basculer sur le backend = remplacer la source dans ce fichier.** `GiveawayView.vue` ne bouge pas,
et ses tests (`apps/web/test/giveaway-view.test.ts`) valent toujours : ils montent la vue avec un
faux client et pilotent les états, pas l'implémentation.

Concrètement : `client.badges()` disparaît au profit de `client.giveawayStatus(userId)`, et la règle
`referral` cesse d'être codée `pending: true`.

## 3. Décisions verrouillées

| Axe | Décision | Raison |
|---|---|---|
| Identité | Dédup sur l'**adresse XRPL signée**. Sur Tide, un compte EST un wallet : il n'y a ni e-mail ni mot de passe | une session `paper:<uuid>` est un localStorage, elle se refabrique en un clic et ne prouve rien ; une adresse signée engage une clé |
| Coût du sybil | La **réserve de base d'1 XRP** par compte XRPL est le seul frein natif | elle ne rend pas la fraude impossible, elle la rend payante ; c'est à croiser avec la règle de parrainage ci-dessous, pas à considérer comme suffisant |
| Déclencheur du parrainage | Les +2 tombent **quand le filleul fait son premier trade paper**, pas à la connexion du wallet | rend une ferme de comptes coûteuse, et transforme la mécanique en activation plutôt qu'en collecte d'adresses |
| Idempotence | Clé primaire `(user_id, rule)` sur les entrées | une règle ne peut rapporter qu'une fois, quel que soit le nombre d'appels |
| Un seul parrain | Clé primaire sur le **filleul** dans `referrals` | on ne peut pas se faire parrainer deux fois, structurellement |
| Activation | Routes montées seulement si le store est fourni (`if (deps.giveaway !== undefined)`) | même câblage « activé par config » que les badges et la console admin |
| Total public | **Jamais exposé** par une route publique | règle de copie `05-facts.md` ; le total ne sort que par `/admin` |
| Conditions X | Ni stockées ni vérifiées par le serveur | décision produit : on vérifie follow et repost **à la main sur le seul gagnant tiré**, via son wallet puis son pseudo X. Pas d'API X payante, pas d'OAuth X. |
| Condition suspensive | Le lot n'est dû **que si Tide remporte le grand prix Make Waves** (règlement, art. 3) | décision produit du 09/09. Elle est affichée sur la face de la page, pas dans les petites lignes : un lot conditionnel annoncé sans sa condition est une pratique commerciale trompeuse. |
| Acceptation | À **enregistrer côté serveur** avec la version du règlement et un horodatage | la case cochée vit en `localStorage` : elle bloque la participation mais ne prouve rien. Avec une condition suspensive, cette preuve est précisément la pièce à produire en cas de contestation. |

## 4. Modèle de données

Migration datée `apps/api/src/store/migrations/2026-09-XX-giveaway.ts` (patron :
`2026-08-27-wallet-links.ts`), appelée dans `apps/api/src/main.ts` (~l. 300) avec les autres.

```sql
-- `operation_id` dès la première migration : en cas d'échec de la condition
-- suspensive, les entrées sont REPORTÉES sur une opération suivante (règlement,
-- art. 17). Sans cette colonne, le report obligerait à réécrire la table.
CREATE TABLE IF NOT EXISTS giveaway_entries (
  operation_id TEXT  NOT NULL DEFAULT 'airpods-max-2026',
  user_id    TEXT    NOT NULL,   -- adresse XRPL signée
  rule       TEXT    NOT NULL,   -- 'wallet' | 'first_trade' | 'referral'
  weight     INTEGER NOT NULL,
  awarded_at INTEGER NOT NULL,
  PRIMARY KEY (operation_id, user_id, rule)
);

-- Preuve d'acceptation du règlement, écrite en même temps que la première entrée.
CREATE TABLE IF NOT EXISTS giveaway_consent (
  operation_id  TEXT    NOT NULL,
  user_id       TEXT    NOT NULL,
  terms_version TEXT    NOT NULL,
  accepted_at   INTEGER NOT NULL,
  PRIMARY KEY (operation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_giveaway_entries_user ON giveaway_entries(user_id);

CREATE TABLE IF NOT EXISTS giveaway_referral_codes (
  code       TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS giveaway_referrals (
  referred_user_id TEXT PRIMARY KEY,          -- un filleul, un parrain, définitif
  referrer_user_id TEXT NOT NULL,
  claimed_at       INTEGER NOT NULL,          -- lien cliqué
  qualified_at     INTEGER                    -- premier trade du filleul ; NULL = pas encore compté
);
CREATE INDEX IF NOT EXISTS idx_giveaway_referrals_referrer ON giveaway_referrals(referrer_user_id);
```

Le parrainage est la seule règle **répétable** : `giveaway_entries` porte alors `weight` =
`2 × nombre de filleuls qualifiés`, recalculé à chaque qualification. Les deux autres règles gardent
un poids fixe.

## 5. Chemin de code

Un fichier par ligne, dans l'ordre où les toucher.

| Concern | Fichier |
|---|---|
| Table | `apps/api/src/store/migrations/2026-09-XX-giveaway.ts` + appel dans `main.ts` (~l. 300) |
| Store | `apps/api/src/store/giveaway-store.ts` (interface + `InMemoryGiveawayStore`) et `apps/api/src/store/sqlite-giveaway-store.ts` (patron : `wallet-link-store.ts` / `sqlite-wallet-link-store.ts`) |
| Service | `apps/api/src/services/giveaway-service.ts` (classe à `deps` unique, erreurs typées) |
| Routes | `apps/api/src/http/server.ts`, dans `buildServer`, derrière `if (deps.giveaway !== undefined)` + champ dans `ServerDeps` (l. 113) |
| Validation | `apps/api/src/http/parse.ts` (`parseRedeemReferral`) |
| **Codes d'erreur** | `apps/api/src/http/errors.ts`, table `STATUS_BY_ERROR_NAME` — **sans quoi toute nouvelle erreur sort en 500** |
| Autorisation | `apps/api/src/auth/guard.ts` (règle `body.userId === me` pour la route POST) |
| Câblage | `apps/api/src/app.ts` (`AppConfig` + `createApp`), `apps/api/src/main.ts` |
| Client typé | `packages/client/src/client.ts` (DTO + méthode via `path()` / `this.call`) |
| Front | `apps/web/src/composables/useGiveaway.ts` — remplacement de source, rien d'autre |

### Points d'accroche existants (ne rien réinventer)

- **Premier trade** : `registerPaperTrade`, `apps/api/src/http/server.ts:387-407`. Déjà appelé après
  chaque fill spot **et** perp, déjà best-effort (n'échoue jamais un trade) et déjà idempotent côté
  store. C'est là que se branchent : l'entrée `first_trade` du trader, **et** la qualification de son
  parrainage s'il en a un.
- **Création de compte** : `POST /accounts/ensure` renvoie `{ userId, created }` — `created` est
  exactement le signal du +1. Attention : il faut le croiser avec l'identité Supabase, pas l'accorder
  à une session `paper:*` anonyme.
- **Recalcul sans événement** : `PaperService.tradeCountOf(userId)`
  (`apps/api/src/services/paper-service.ts:225`) permet de reconstruire l'état si un hook a été raté.
- **Anti-farming déjà en place** : `wallet_paper_links` et `external_identities` donnent de quoi
  repérer les doublons au moment du tirage.

## 6. Routes

| Route | Rôle | Auth |
|---|---|---|
| `GET /accounts/:userId/giveaway` | État des règles + total personnel + code de parrainage du user | propriétaire (règle par défaut du guard sur `:userId`) |
| `POST /giveaway/consent` | `{ userId, termsVersion }` — enregistre l'acceptation du règlement, idempotent | `body.userId === me` |
| `POST /giveaway/referral/redeem` | `{ userId, code }` — enregistre le parrainage. Refuse l'auto-parrainage (`ReferralSelfError`, 400) et le second parrainage (`ReferralAlreadySetError`, 409) | `body.userId === me` |
| `GET /admin/giveaway` | Liste des participants + entrées, pour le tirage | header `x-admin-token`, comme `GET /admin/overview` |

Le lien de parrainage est `https://tidetrade.xyz/#/giveaway?ref=<code>`. Le front stocke le `ref`
entrant en localStorage et appelle `redeem` **une fois le compte lié** — avant, il n'y a pas de
`userId` à rattacher.

## 7. Tirage

`GET /admin/giveaway` renvoie, par participant : adresse XRPL, version du règlement acceptée et sa
date, total d'entrées, détail des règles. Le tirage lui-même reste **manuel** (une ligne de script, un `random` sur la liste
pondérée) : automatiser un tirage qu'on ne fera qu'une fois n'a aucun intérêt, et laisser un humain
regarder la liste avant de tirer est précisément ce qui permet d'écarter les doublons évidents.

**Le tirage ne peut pas avoir lieu tant que les résultats Make Waves ne sont pas publiés**, et il
n'a lieu que si Tide remporte le grand prix. Le règlement fixe un délai relatif de 7 jours après
cette publication, sans date fixe, l'Organisateur ne maîtrisant pas ce calendrier. `/admin/giveaway`
doit donc rester interrogeable bien après la clôture des participations.

Une fois le gagnant tiré : on le joint via son wallet, on lui demande son pseudo X, on vérifie
l'abonnement et le repost. Sans réponse sous sept jours, on retire, c'est écrit dans le règlement
affiché sur la page.

## 8. Tests attendus

- `apps/api/test/giveaway-store.test.ts` — contrat joué sur `InMemory` **et** `Sqlite` (patron exact
  de `badge-store.test.ts`) : idempotence de `(user_id, rule)`, un seul parrain par filleul,
  qualification qui recalcule le poids.
- `apps/api/test/giveaway-routes.test.ts` — via `app.inject()` : 404 quand le store n'est pas fourni,
  auto-parrainage refusé, second parrainage refusé, total correct après qualification.
- `apps/api/test/giveaway-first-trade.test.ts` — un fill déclenche l'entrée `first_trade` **et** la
  qualification du parrainage, sans jamais faire échouer l'ordre si le store tombe.
- Front : les tests existants passent sans modification. En ajouter un sur `useGiveaway` une fois la
  règle `referral` sortie de `pending`.

## 9. Hors périmètre, volontairement

- **Vérification automatique des follows/reposts.** Il faudrait l'API X payante (~200 $/mois au
  palier utile) et un OAuth X. On vérifie le gagnant à la main.
- **Stockage du `@handle` X.** On le demande par e-mail au moment de gagner. Le collecter en amont
  serait une donnée personnelle de plus à garder pour rien.
- **Total public d'entrées.** Interdit par `growth/context/05-facts.md` (« specific traction
  numbers »). Le chiffre existe côté admin, pas côté page.
