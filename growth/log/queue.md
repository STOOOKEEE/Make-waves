# Queue — approved and proposed, not yet posted

**`APPROVED` = may ship. `PROPOSED` = waiting on Eli. Nothing ships without APPROVED.**

Format: status · series · the post · notes.
When it ships, move the whole block to [`posted.md`](posted.md) with the date. **URLs are no longer
collected** — see the policy note at the top of `posted.md`.

---

**Rien de programmé.** Les batchs du 30/07, 31/07, 01/08 et 02/08 ont tous été postés et basculés dans
[`posted.md`](posted.md). **15 posts au total depuis le 21/07.**

⚠️ **The Invitation est brûlée pour la semaine** (postée le 02/08, plafond 1×/semaine). Prochaine
fenêtre : **à partir du 09/08**. Aucun autre post ne porte de lien d'ici là.

⭐ **Before the next batch, read the replies under the Ask The Void post** ("what's the position
you're still not over"). That's the whole point of the format: the answers are next week's posts, and
`04-content-engine.md` § "the comments are the brief" says the daily engine starts there, not here.

---

## Alternates — unscheduled, approved-in-principle pool

### PROPOSED · Trading-is-absurd · ⚠️ **Monday only** (next: 2026-08-03)
> sunday you're a portfolio manager
>
> monday you're just clicking

*Écrit le 21/07 pour un lundi, mis en queue un mardi par erreur, jamais joué. La vanne a une durée de
vie de 24h et elle est bonne le bon jour. (La version d'origine disait « just a guy clicking » — coupé
pour le genre, au prix d'un peu de rythme.)*

### PROPOSED · Humans vs Bots (qualitatif, sans données)
> your agent will try to argue its way past the limit you set
>
> the server doesn't read

*Notre angle le plus ownable, et traçable à `context/05-facts.md` (mandat, limites appliquées serveur,
pas de bypass) sans aucun chiffre ni log. Suppose que le lecteur sait qu'on peut brancher un agent :
sous-performe sur une timeline générale, bon dans notre niche.*

### PROPOSED · Fake Money Real Pain
> you'll hold a losing paper position for three days rather than be wrong in a game with no money in it

### PROPOSED · Trading-is-absurd
> nobody has a high risk tolerance. some people just haven't had a red day yet

### PROPOSED · The Invitation (1×/sem max, le seul post où un lien a sa place) · **jamais joué**
> $10,000 in fake money, real prices, and a leaderboard with other people and their bots on it. no deposit, no kyc, nothing to lose except a rank. tidetrade.xyz

*Chaque chiffre vient de `context/05-facts.md`. « nothing to lose except a rank » est délibérément pas
« risk-free », qui est prohibé-adjacent. **Le compte tourne depuis le 21/07 sans jamais poster
d'invitation** : à un moment, les gens qui rient doivent savoir où aller.*

---

## Blocked — written, cannot ship

Shapes we have but can't fill without real product data. Listed so the work isn't lost.

### BLOCKED · Bot Diary — needs a real agent action log
> *"capped it at [X]. it spent [N] tool calls looking for a way around it, found nothing, opened
> exactly [X]"*

### BLOCKED · Humans vs Bots — needs weekend standings split human/agent
> *"the bots went [X–Y] against humans over the weekend"*

**To unblock — now scoped, see [`data-access.md`](data-access.md):** the leaderboard split
(Humans-vs-Bots) is **already live** at `/admin/overview` behind `TIDE_ADMIN_TOKEN`; the agent log
(Bot Diary) is one ~15-line admin route from data that's already persisted. Not a project — an
afternoon. This is the highest-value unblock available (`context/04-content-engine.md`).

---

## Killed drafts

Rejected posts, with the reason. Knowing what we turned down is as useful as knowing what we ran.

### 2026-07-21 · Warm · KILLED — states a permission instead of noticing something
> ~~you're allowed to be bad at this for way longer than you think~~

**Why:** « un poster dans une salle d'attente de thérapeute » (verdict adversarial du 21/07). Notre
propre queue l'avait qualifié de plus faible du fichier et il a été mis en file quand même : échec de
process, pas d'écriture. Remplacé par « you're not bad at this, you're new at this, and those look
identical from the inside » (posté le 31/07), qui observe au lieu d'autoriser.

### 2026-07-21 · whole batch · KILLED — wrong person
> ~~"wrote down my plan for the week on sunday night. three rules, very reasonable, i was proud of it /
> broke rule two at 9:14am"~~

**Why:** written in first person. This is the app's account, not a person's — "i" from a product handle
reads as an intern and the reader clocks it instantly. Also 35 words to deliver a joke that lands in
the last four. Rule now in `context/02-voice.md` § Person.
