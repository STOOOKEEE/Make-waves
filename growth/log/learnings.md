# Learnings — what this account has actually figured out

One line per thing. Dated. **When something here contradicts `context/`, this wins** — it's evidence
from our own account, and everything in `context/` is inference from someone else's.

When a learning is solid enough to be a rule, move it into the relevant `context/` file and note the
date here.

---

## Voice

**2026-07-21 — first person doesn't work for a product handle.** "i closed it at 3am" from @tide reads
as an intern, not as the arena. Second person is also shorter and it turns an anecdote into an
accusation the reader recognises. → written into `context/02-voice.md` § Person.

**2026-07-21 — our default failure is the well-written little essay.** Three lines, complete thought,
gentle landing. Reads fine, does nothing: nobody quotes it, nobody argues with it. Fix is length,
stance, and not finishing the thought for the reader. → `context/02-voice.md` § "Why your draft is too
long and too nice".

**2026-07-30 — deux règles d'Eli, après la reply @Remzztrades.** (1) **Jamais d'em dash (—)**, nulle
part : c'est le tell le plus fiable qu'une machine ou un copywriter a écrit la ligne. (2) **Les replies
doivent être plus courtes** : deux lignes de plafond, une suffit souvent. La reply envoyée faisait
trois lignes et le deuxième paragraphe n'ajoutait rien que de l'admiration pour le premier.
→ ✅ **Promu** dans `context/02-voice.md` § Mechanics.

---

## Process

**2026-07-21 — check the actual weekday before scheduling.** A batch was written against "today is a
Monday" when 2026-07-21 is a Tuesday. It cost one post (a Monday-specific joke, dead on arrival on a
Tuesday) and produced a paragraph of reasoning about substituting a slot that wasn't today's. Cheap to
prevent: confirm the date, don't infer it. Day-specific jokes are the only content where this matters,
which is exactly why it slipped through.

**2026-08-01 — la question des URL est tranchée : on arrête de les courir.** Trois batchs de suite
(30/07, 31/07, 01/08) sont partis sans qu'aucune URL ne soit capturée, parce qu'Eli poste directement
depuis X. C'est le workflow réel, pas un oubli. → `posted.md` enregistre désormais **date + série +
texte intégral**, point. **Le coût est plus faible qu'il n'y paraît** : l'écran analytics de X liste
les posts avec leurs chiffres, et le texte intégral suffit à apparier une ligne à une entrée. La
section « what performs » reste donc remplissable, en lisant l'analytics au lieu de suivre un lien.
Corollaire : le texte intégral dans l'archive n'est plus du confort, c'est **la clé d'appariement**.

**2026-08-01 — première continuité réelle du compte.** Le mème « it's a long term hold now » (01/08)
rejoue le point 1 de « four ways to hold a loser » (30/07) dans une autre forme. C'est le premier post
qui suppose un post précédent. **À surveiller précisément** : est-ce qu'un post-callback convertit
mieux en follows qu'un post isolé ? Hypothèse posée le 24/07 (§ Content), jamais testée jusqu'ici.

**2026-08-01 — le compte a 12 posts et zéro invitation.** Depuis le 21/07 on a fait rire sans jamais
dire où aller. The Invitation est plafonné à 1×/semaine et n'a **jamais** tourné. Ce n'est pas de la
prudence, c'est un trou dans l'entonnoir : les follows ne se transforment pas tout seuls en joueurs.

**2026-07-21 — two posts shipped without passing through the queue.** Not a problem in itself, but
their **URLs were never captured** and now have to be retrieved by hand. The archive only works if
links go in at post time. If posting straight from X is the normal workflow, the queue's job shrinks
to drafting and `posted.md` becomes a same-day backfill — that's fine, just decide it deliberately.

**2026-07-21 — dans un thread saturé, la vanne évidente est un zéro.** Trois replies envoyées ce soir
(@nexocooker, @vainxyz, @Stocktwits). Sur les trois, la blague que tout le monde faisait déjà était
disponible et écartée : « ton setup coûte plus cher que ton portefeuille », « inverse Cramer ». Arriver
36ème avec la même vanne, c'est exactement le motif qu'un classifieur apprend à reconnaître. **Règle :
lire les replies existantes avant d'écrire, et écrire ce que personne n'a dit** — souvent une
observation plutôt qu'une vanne. À valider : est-ce que ces replies-là convertissent mieux ?
→ ✅ **Promu** dans `references/replies.md` §4 (règle, gradée PRACTITIONER).

**2026-07-21 — les captures d'écran sont le seul canal de lecture X qu'on ait.** WebFetch renvoie 402
sur x.com, l'extension Chrome n'a pas répondu. Donc toute reply passe par une capture posée sur le
bureau. C'est lent mais fiable ; ça vaut le coup de le savoir plutôt que de re-tenter les outils à
chaque fois. **Conséquence : les métriques visibles sur la capture sont notre seule mesure de taille de
cible** — d'où les colonnes chiffrées dans `targets.md`.

**2026-07-21 — un plan de growth généré ailleurs proposait de pitcher Tide en reply.** Template proposé :
*« avec des agents IA comme les miens sur [ton app], on pourrait backtester ça… +X% winrate »*. Trois
violations d'un coup : promotion en reply (interdit nommément par la policy Authenticity de X), chiffre
inventé, implication qu'on fait gagner de l'argent. Écarté. Le même plan recommandait une bio avec
« cash prizes » et « trade & gagne » — l'économie des tournois est hors-story et « gagne » est sur la
liste never-say. **À retenir : les conseils growth génériques optimisent le volume et poussent
naturellement vers le pitch ; notre contrainte est l'inverse.**

**2026-07-24 — première cible écartée pour la règle du villain.** @legen_eth : « Down almost $200k this
month. How to cure depression? » + screenshot de courtier réel. Perte **réelle** + mention de dépression.
Skip décidé : (1) on ne dunk jamais une perte réelle et un compte de marque qui réplique sous un post
« depression » lit comme du reach-harvesting, même en étant gentil ; (2) c'est un whale real-money, **pas
notre audience** (débutants fake-money) → conversion nulle de toute façon. **Règle : perte réelle +
détresse = silence pour le handle produit.** Le bon signal, c'est quand taste ET growth pointent au même
endroit. (Voie perso humaine OK, jamais depuis @tidetradexyz.)
→ ✅ **Promu** dans `context/02-voice.md` § Hard limits (« Real loss + real distress = silence »).

**2026-07-24 — l'autre côté de la frontière : vulnérable ≠ intouchable.** @DiegoBTrades : « 3 ans de
trading, I'll never master the mental part, this might not be for me. » Pas une perte catastrophique
chiffrée, pas de détresse aiguë — un burnout de métier qui reçoit déjà des replies de pairs. → **reply
warm appropriée** (reframe honnête, valider que quitter est OK), là où legen = silence. La ligne :
**perte réelle + détresse aiguë = silence ; découragement/burnout ordinaire = registre warm, budget
blague zéro, zéro pitch.** Le fil était plein de guru motivationnel (« replace I'll never with I will »)
→ être la reply honnête et non-poster EST le différenciateur. Premier vrai test du warm en reply.

---

## ⭐ The diagnosis (2026-07-21)

An adversarial read — someone with no stake, asked to react as a real user — found the thing three
rounds of voice edits kept missing. **It isn't a writing problem.**

Every post so far is the **same object**: a timeless, second-person aphorism about trading psychology.
8–25 words, no proper nouns, no numbers, no date, no enemy, no image. That genre *is* the professional
thing — it's what a good agency produces optimising for taste. Which is why the tone kept getting
better and the verdict kept being "still not cool enough."

Verdict on the first six posts, unvarnished: **two good, one dead, three competent.** Would stop
scrolling; **would not learn the handle.**

- *"leverage: the same trade, you just find out sooner"* — the best line. But it says nothing about
  **who posted it**, so there's no reason to follow. Full value delivered in the timeline.
- *"dollar cost averaging: being wrong on a schedule"* — best **growth** post, because it's the only
  one with an enemy. Someone will argue. That's the game.
- *"you're allowed to be bad at this…"* — *"a poster in a therapist's waiting room."* Our own queue
  called it the weakest thing in the file **and it got queued anyway** — a process failure, not a
  writing one.
- *"nobody has a high risk tolerance…"* — trading-twitter public domain. Reads like a **quote**, not a
  person.
- *"you don't have a strategy, you have three rules and a bad mood"* — the most *written* one. You can
  see the craft, which means the craft failed.

**Root cause:** `02-voice.md` says specificity is the engine; `05-facts.md` correctly forbids inventing
data; four of nine series need real standings and logs nobody has wired up. **So the account has been
running the substitute formats as the strategy.** The aphorism machine is what you build when you have
nothing to report.

**Highest-impact change, above everything else in this folder:** get read access to the leaderboard
split and the agent logs, and make the default post *a real, specific thing that happened in the
product in the last 24 hours.* Nobody else can post it, it can't be sanded flat by review, and it
comes with a character and a sequel built in.

**2026-07-24 — scoped it in the codebase, and it's mostly already built.** The human-vs-bot
leaderboard split is a live route (`/admin/overview`, admin-token) and the agent action log is
persisted in `agent_actions` with a read route one thin admin wrapper away. Full spec + curls in
[`data-access.md`](data-access.md). The blocker was never "build the data" — it's "hand the writer the
admin token and add one 15-line route." That reframes the #1 dependency from a project to an afternoon.

→ Written into `02-voice.md` (the same-object failure mode) and `04-content-engine.md` (today-quota,
enemy-quota, continuity).

---

## Content

**2026-07-24 — the self-screenshot callback is our missing continuity engine.** The account's
structural weakness is that nothing connects to anything (`02-voice.md` § same-object). Cheapest fix
that needs no product data: QT our own past tweet and react to it ("it did not bounce"). Builds a
running joke, reads as a person. Added to `memes.md` §8 as format E, ranked top alongside
which-one-are-you. **Watch whether callbacks actually lift follows** — the theory is they convert
scrollers into followers by making the next post feel connected to this one.

---

## What performs

*Empty — needs real numbers. Fill from `posted.md` once posts have been up long enough to read.*

The things worth watching first, since the pack is uncertain about all three:
- **Do images cost us reach?** The source study's two cuts disagree by a lot. Our own analytics settle
  it faster than any further research.
- **Reply → profile visit rate.** Planning estimate is 0.05–0.15%, from two individuals with small
  samples. Replace with ours within four weeks.
- **Which series people actually come back for.** The evidence that recurring series drive growth on X
  is *nonexistent* — we run them for production efficiency. If one earns nothing, kill it.

---

## What we've stopped doing

*Empty.*

---

## Open questions the account will answer

- **Can you reset a blown-up account?** No reset mechanism found in the codebase (searched 2026-07-21).
  This will get asked in replies almost immediately. Honest answer until someone confirms: *we don't
  currently know of one, we'll find out.* Don't improvise a "just start over".
- **Does the warm register convert?** It shouldn't distribute — the research says reflection doesn't
  travel — but it should convert laughs into follows. Watch whether warm posts precede follow spikes.
- **Does the observer voice land?** "there are people on this leaderboard right now…" is a register
  only we can use. Untested.
