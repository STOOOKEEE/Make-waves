# The reply engine — the core growth motion

Replies are how an account with no audience borrows someone else's. This file is the operating manual.
Evidence grades as in `algorithm.md`.

---

## 1. The two rules that decide everything

### Rule 1 — Reply UP, never sideways or down `[CODE]`

X routes replies by the follower count of the parent author / thread root:

- **Above the threshold** → your reply enters **LLM quality ranking** (`reply_ranking_target`). You are
  in a tournament you can win.
- **Both below** → `low_blast_radius`: **the reply is not ranked at all**, only spam-screened.

**Replying to small accounts buys you no *algorithmic* distribution.** Be precise about what that
means, because the absolute version of this rule is over-read: the reply is still **on the thread**,
and §2 notes that reply distribution comes from *the conversation surface* — people reading the
thread — not from For You. So a small-account reply is not invisible to humans; it's invisible to the
ranker. Real people still see it, and those are the people who become mutuals.

→ **Small-account replies are relationship work with a human audience. Just don't book them as reach.**

### Rule 2 — Mutuals are a high-confidence lever in 2026 `[OFFICIAL]`

`mutual_follow_jaccard` (MinHash graph overlap) is dated **2026-07-13**, specifically so that friends
surface in each other's replies. X's head of product said so directly.

⚠️ **Downgraded from `[CODE]` deliberately.** `algorithm.md` §2.3 flags an unresolved date conflict —
that date is two months *after* the repo's stated last commit, so we have X's word that this shipped
but not repo confirmation. Still the best graph-signal evidence available; just don't call it verified.

**So the reply motion has two distinct jobs, and you must not confuse them:**

| Job | Target | Purpose | Measured by |
|---|---|---|---|
| **Reach** | Large accounts | Get seen by their audience | Profile clicks, follows |
| **Graph** | Peers in your niche | Become genuine mutuals → permanent visibility lift | Mutual follows formed |

Do both. Track them separately. The graph work compounds; the reach work does not.

⚠️ **The most successful documented practitioner disagrees with Rule 1 — and he's not wrong.**
`[PRACTITIONER]` Arvid Kahl (400 → 11,000 followers over 2.5 years, reply-led) states his rule as
**"engage everyone, no matter the follower count"** and picks targets by *"having something
interesting to say"*, not by reach. He also warns: **"engage to empower, not to debate"** — avoid
people who thrive on conflict.

That's not a contradiction of the `[CODE]` finding, it's a different objective. He's optimizing the
**graph** column, and over 2.5 years the graph is what compounded. Practical synthesis:

> **Pick targets by conversation quality, then check the tier.** Big account → it's also reach work.
> Small account → it's graph work, and still worth doing. What you must never do is reply to a big
> account you have *nothing to say to* just because it's big — that's the reply-guy motion X's
> Authenticity policy names, and the LLM ranker is specifically trained to catch it.

---

## 2. What the consensus gets wrong (deprioritize these)

**⭐ Replying to your own commenters lifts engagement only +8% on X.** `[STUDY]`
Buffer 2026, 52M posts, **within-account fixed effects** — the strongest methodology in the whole
evidence base. Comparison: Threads +42%, LinkedIn +30%, Instagram +21%, X **+8%**, Bluesky +5%.

X has nearly the *weakest* reply-lift of any platform measured. The universal advice "reply to every
comment because replies weigh 13.5×" is wrong twice over — the weight is dead (`algorithm.md` §0) and
the measured lift is marginal.

**Do it for relationship and community reasons — not as a growth tactic.** Answer real questions,
especially from potential users. Don't grind through every "nice!" reply expecting distribution.

**Your reply competes with the post you replied to.** `[CODE]`
`dedup_conversation_filter` keeps exactly one candidate per conversation, author-agnostic, highest score
wins. Against a viral post you lose. **Reply distribution comes from the conversation surface** (people
reading the thread), not from For You. Optimize replies for *the humans scrolling that thread*, not for
the algorithm.

---

## 3. Target selection

Build and maintain a target list. Refresh it monthly.

**Tier A — Reach targets (~15–25 accounts).** Large accounts in your exact topic whose audience is
your audience. Big enough to clear the reply-ranking threshold; not so big that replies are a stampede
of thousands. **Relevance beats size** — see the conversion collapse in §6.

**Tier B — Graph targets (~30–60 accounts).** Peers, adjacent builders, people who might become genuine
mutuals. Similar or somewhat larger size than you. This is where compounding happens.

**Tier C — Watchlist.** Accounts whose posts signal topic movement (announcements, debates) — useful for
timing, not necessarily for replying.

**Selection filters:** Do they actually engage with replies? Is their audience *your* buyer? Do they post
often enough to give you shots? Off-topic-but-huge accounts are traps — `topic_ids_filter` hard-drops
off-topic candidates and out-of-niche reach converts terribly.

### Building the list from zero — a 30-minute job, do it before anything else

This is the pack's #1 open dependency and the reason a reply strategy stays theoretical. **No list is
shipped here on purpose** — any hardcoded handles would be stale within months and wrong with
confidence. But "build a list" is not a plan, so here's the actual procedure:

1. **Search X for the *conversations*, not the accounts.** Queries that surface our people:
   `"paper trading"` · `"blew up my account"` · `"is trading gambling"` · `"prop firm"` ·
   `"trading challenge"` · `"my bot"` + `trading` · `"backtest"` · `"funded account"`.
   Sort by Top, look at **who wrote the replies people liked**, not just the OP.
2. **Weight toward finance-adjacent *meme* accounts over trading-education accounts.** The audience for
   "trading is absurd" is far larger than the audience for trading, and it's audience #1 in
   `growth/context/03-audience.md`. Education accounts have the wrong audience *and* compete with us.
3. **Tier by conversation quality first, size second** (Kahl's rule, §1). Ask: does this person reply
   to replies? Is the comment section full of real people arguing, or a wall of "🔥"? A mid-size
   account with a live comment section beats a huge one with a dead one.
4. **Add the adjacent lanes:** AI-agent builders, prop-firm/challenge communities, and 2–3 competitor
   accounts (watch what works for them; never dunk on them).
5. **Date the list and re-check it monthly.** Accounts go quiet, change topic, or turn hostile. A
   six-month-old target list is worse than none because it feels done.

**Ship a dated list of 15 Tier A and 30 Tier B before day one — write it into `growth/log/targets.md`.** It doesn't need to be right — it
needs to exist, so weeks 1–4 (`growth/context/07-growth-system.md` §2) are execution rather than research.

---

## 4. Writing a reply that wins the LLM tournament

The rubric is withheld `[CODE]`, so **there is no template to game** — and templated replies are exactly
what a classifier learns to catch. The only durable strategy: **write something a smart human reader
would judge as a genuine contribution.**

**What a strong reply does — pick ONE:**
- Adds a fact, number, or source the post lacks
- Adds first-hand experience ("we ran this; here's what broke")
- Respectfully sharpens or complicates the claim
- Answers a question the author actually asked
- Supplies the concrete example the abstract post needed
- **Is genuinely funny about the thing being discussed** — a joke that adds something is a
  contribution, and it's the one that gets a profile click. Being the funniest reply in a thread is a
  legitimate strategy; being the most agreeable one is not.

Write it in voice (`growth/context/02-voice.md`). A reply that reads like a brand account's community manager
is worse than no reply — it's the thing people mute.

> **⭐ Read the existing replies first, then write what nobody said.** `[PRACTITIONER — our own log,
> 2026-07-21]` In a saturated thread the *obvious* joke is already sitting there fifteen times. Arriving
> 36th with "your setup costs more than your portfolio" or "inverse Cramer" is exactly the templated,
> everyone-already-said-it pattern the LLM ranker is trained to catch — it scores zero and it's
> indistinguishable from spam. The winning move is usually **an observation, not a punchline**: the
> true thing the pile-on missed. If the funny take is taken, go sideways to the insightful one.

**Structural notes:**
- **Substance over speed.** The old "reply in the first 5 minutes" advice assumes an early-velocity term
  that **does not exist in the published pipeline** `[FOLKLORE]`. Being early helps you sit higher in a
  thread humans read — a real but modest effect. Never trade quality for speed.
- **Length:** enough to carry one real idea. One-to-five-word replies ("this", "🔥", "based") contribute
  nothing and read as spam to both humans and the classifier.
- **Stand alone.** A good reply makes sense to someone who hasn't read the parent — that's what makes a
  lurker click your profile.
- **No links in replies to others' posts.** It reads as hijacking and suppresses engagement.
- **Don't @-pile** other accounts to summon them.

**Hard prohibitions** `[OFFICIAL]` — X's [Authenticity policy](https://help.x.com/en/rules-and-policies/platform-manipulation)
bans the standard reply-growth playbook by name. **This is the highest-probability risk in the whole skill.**

- **Never solicit engagement.** "Follow me for more", "like if you agree", "reply and I'll follow back"
  → 3+ occurrences = removal from the revenue program + referral for suspension.
- **Never reply with content irrelevant to the parent post.** X prohibits *"promoting content by replying
  with content that is irrelevant to the topic of the original post"* — the classic reply-guy motion.
  **Relevance is not just quality advice here; it's the compliance line.**
- **Never send bulk/aggressive/high-volume replies.** Prohibited verbatim. A second, independent reason
  for 10–30/day.
- **No engagement pods, no paid amplification, no coordinated raids.** *"Coordinating to exchange
  engagement"* and *"compensating others to conduct account metric inflation"* are both named.
- **No unattended automation.** *"You are ultimately responsible for third-party applications you authorize."*
- Never copy someone else's reply or repost content as your own — plagiarism enforcement is live
  (1.5M posts flagged, ~4,000 accounts removed from rev-share in one day).

⚠️ **Enforcement includes URL denylisting** — X can blacklist your *domain*, which **survives account
recreation**. That is the one mistake you cannot undo by starting over. See `guardrails.md` §2.

---

## 5. Volume and cadence

**Recommended: 10–30 substantive replies/day.** Rationale, not vibes:
- `author_diversity_scorer` decays your Nth item **exponentially within one feed response** `[CODE]` —
  volume does not buy linear reach.
- Free-tier cap is ~**200 replies/day** — but the cap is not the target.
- The reply-spam classifier explicitly buckets by follower tier of replier and root `[CODE]`. A tiny
  account firing hundreds of replies is the exact modeled pattern.

**A sustainable daily rhythm (~45–60 min):**
1. **Scan** (10 min) — Tier A + B timelines for posts you can genuinely add to.
2. **Reply** (30 min) — 10–30 substantive replies. Quality gate: *would I upvote this reply if a stranger
   wrote it?* If no, don't post it.
3. **Tend the graph** (10 min) — follow back, answer real questions, DM someone who engaged genuinely
   (`share_via_dm` is a positive head; private conversation feeds public reach).

**Do not** batch 50 replies in one burst. Spread across the day; you're aiming to appear in different
feed renders, and consecutive items cannibalize.

---

## 6. The conversion trap — read before chasing reach

**Reach and conversion move in opposite directions.** `[PRACTITIONER]`

Tony Dinh's viral tweet: ~1,500 signups, peak 689/day. His normal signup→subscribe rate is **4%**; this
cohort converted at **0.6%** — a **6.7× collapse**. His diagnosis: it *"reached a much wider audience
outside of my bubble."*

Same founder, in-niche: 76K followers, launch tweet → **$22.7K in 7 days**, *"99% from my Twitter reach."*

**X converts extremely well inside your niche and terribly outside it.** A viral hit with the wrong
audience is a vanity event that can actively mislead your metrics. **Optimize for the right 5,000
people, not for the biggest number.** This is why Tier A selection weights relevance over follower count.

---

## 7. Metrics that matter

Track weekly, not daily:

| Metric | Why | Rough reference `[PRACTITIONER]` |
|---|---|---|
| **Impressions → profile visits** | The real reply KPI — did anyone want to know who you are? | Self-reported **1.1% – 5.9%** |
| **Profile visits → follows** | Is your profile converting? If low, fix bio/pinned, not replies | — |
| **Follows → people actually playing** | The only one that means anything | One documented micro-funnel: 16,828 impressions → 524 profile visits → ~150 follows → 7 signups (**0.04%** impressions→signup) |
| **Mutuals formed / week** | The compounding asset | — |

⚠️ **Benchmarks are self-reported and from different studies — never compare figures across sources.**
Use them to sanity-check your own trend, not as targets.

### The planning model (use it, then replace it with our own data)

Two unrelated practitioners converged on the same order of magnitude — the strongest signal available
on this funnel, and the reason to trust it more than any vendor benchmark:

| Step | Rate |
|---|---|
| reply impression → profile click | **0.05–0.15%** |
| profile visit → follow | **~8%** |
| ⇒ reply impression → follow | **~1,000–10,000 impressions per follower** |

One documented data point at each end: a single reply producing **12,000 impressions → 7 profile
visits**; another producing **8,000 impressions → 9 follows**. That spread is real — most replies do
nothing and occasionally one lands.

**At 10–30 replies/day, expect 2–15 follows/day once consistent.** Both sources also report **near-zero
growth for the first 2–3 weeks**. That's the normal shape, not a failure. Full context:
`growth/context/07-growth-system.md` §1.

⚠️ **Measurement warning** `[PRACTITIONER]`: one founder measured ~2% signup→paid and assumed a product
problem; the real cause was bot list-bombing inflating the denominator. After a targeted captcha: **8.5%**.
**If your conversion looks inexplicably bad, audit your denominator for bots before you rewrite the product.**

---

## 8. Reply quality checklist

Before sending, confirm:
- [ ] Parent account is large enough to clear reply ranking (Tier A) **or** this is deliberate graph work (Tier B)
- [ ] I'm adding ONE concrete thing (fact / experience / sharpening / example / a real joke)
- [ ] It stands alone to someone who hasn't read the parent
- [ ] No engagement solicitation, no link, no @-pile
- [ ] It's on-topic for my account's established topic
- [ ] **It sounds like a person, not a brand** (`growth/context/02-voice.md`)
- [ ] A stranger reading this would think "who is this person?" — and click
