---
name: x-growth
description: "Operational X/Twitter growth system for Tide's account — a Gen Z, meme-forward account for a paper-trading arena where humans and AI agents compete. Use when writing X/Twitter posts, threads, replies or memes; reacting to market/crypto news; planning a launch; setting up or auditing the account (bio, pinned, pillars); building a reply target list; picking what to post; or analyzing X metrics. Built on the code-verified 2026 ranking algorithm: what the Grok-based ranker actually rewards, reply-led growth (the core motion), post and meme formats, news reaction, account management, and crypto/AI niche specifics. Every claim evidence-graded — it corrects the widely-circulated advice that is provably wrong. Voice and product truth come from growth/context/; the post queue, archive, reply targets and learnings live in growth/log/."
---

# X Growth — operational system

> ## Mission #1: grow the account and get people playing.
> Everything in this skill serves that. When two tactics conflict, pick the one that puts Tide in
> front of more of the right people.

Three layers, and they're separable:

- **Who we are** → `growth/context/`. **Authoritative on voice and facts.**
- **What we actually did** → `growth/log/`. Queue, archive, reply targets, learnings.
  **Authoritative on what happened** — if `log/learnings.md` contradicts `context/`, the log wins.
- **How X actually works** → this skill. Authoritative on tactics.

**Before writing anything Tide-related, load `growth/context/02-voice.md` and `growth/context/05-facts.md`.** Non-negotiable.
The voice is the product's whole differentiation on a platform full of identical trading accounts, and
`05-facts.md` is the only source of claims. If it's not in there, it doesn't ship.

**The one-line product truth:** Tide is a **paper-trading arena** — fake money, real prices, a
leaderboard where humans and AI agents compete. **There is no real trading, no swaps, no wallets, no
money.** Never mention them; see the never-say list in `growth/context/05-facts.md`.

## Evidence grades — use them, and preserve them

`[CODE]` verified in the published `xai-org/x-algorithm` source · `[OFFICIAL]` X product statement ·
`[STUDY]` large-N with stated methodology · `[PRACTITIONER]` named person, own data ·
`[FOLKLORE]` circulating but unsourced — **never build on it**

**When you advise the user, carry the grade.** "Reply to large accounts `[CODE]`" is useful; "reply to
large accounts" is indistinguishable from the slop that fills this space. If you don't know the grade,
say you don't know.

---

## 1. Load what the task needs

Read `references/algorithm.md` **first, always** — every other file assumes its mechanisms.

| Task | Load |
|---|---|
| **Anything Tide-facing** | `growth/context/02-voice.md` + `growth/context/05-facts.md` — every time, no exceptions |
| Write/critique a **reply**, build a target list | `algorithm` + `replies` + **`growth/log/targets.md`** |
| Write a **post**, pick a format, write a hook | `algorithm` + `posts` + `growth/context/04-content-engine.md` + **`growth/log/posted.md`** |
| Make a **meme** or shitpost | `memes` + `growth/context/06-visual.md` |
| React to **market/crypto news** | `newsjacking` |
| **Plan growth**: targets, cadence, cold start, measurement | **`growth/context/07-growth-system.md`** |
| **Account** setup/audit: bio, pinned, pillars | `algorithm` + `accounts` + `growth/context/03-audience.md` |
| **Metrics**, conversion, "why isn't this working" | `growth/context/07-growth-system.md` §6 + `replies` §6–7 |
| **Launch** planning | `algorithm` + `launch` + `posts` |
| Anything **crypto / AI-agent** | `niche-crypto-ai` |
| Not getting the account **banned** | `guardrails` |

---

## 2. What leads, and what doesn't

Two research findings that should shape every piece of positioning:

1. **The AI-agent *token* narrative is dead** (ai16z −99.98%, Clanker fees −92% in a month), but the
   **arena format is validated** (Nof1's Alpha Arena went viral, twice). → **Lead with arena,
   competition, leaderboard, and the jokes. Let "AI agent" be *how it works*, not *what it is*.**
2. **MCP is table stakes, not a differentiator** (~9,400 servers; X ships its own). One clause in a
   bio, never a headline.

**What actually differentiates us**, in order of how much X cares:
1. It's genuinely funny and nothing else in this category is.
2. **Humans and bots on one leaderboard.** Alpha Arena is bots-only. Nobody else runs ours.
3. **Nothing is real** — no deposit, no wallet, no money. In a bear market full of scams, that's the
   strongest trust signal available, and it's free because it's just true.

⚠️ **Two corrections a confident writer would get wrong:**

- **"Unhinged brand voice" is a losing bet in 2026.** `[STUDY]` Sprout Social: 50% of consumers say
  the boldest brands are the **honest** ones; only **23%** find unhinged brands bold, and 29%
  actively dislike it. Taco Bell's Head of Social calls it *"really overplayed"*; **Duolingo itself
  pivoted away in April 2026.** It's not dead, it's *unpriced* — downside without upside. **Honest,
  specific and current is what reads as young.** `growth/context/02-voice.md`.
- **We are not first at paper trading.** `[C]` The prop-firm industry is essentially paid paper
  trading at scale with a young audience, and it already solved acquisition with free-entry
  competitions. Never claim a first. Copy the proven template. `niche-crypto-ai.md` §4b.

See `niche-crypto-ai.md`, and **read `niche-crypto-ai.md` §4b before writing any meme campaign** — the
exact playbook we're using was written up in May 2026 as *"Gen Z's Joe Camel moment."*

---

## 3. The three corrections (state these when the user repeats the myths)

1. **The weight table is dead.** `[CODE]` "Reply ×13.5, retweet ×20, author-reply-back ×75" describes
   the **March 2023** system. X deleted its heuristics in Oct 2025; the 2026 ranker is a Grok
   transformer and **its weights are not published**. Any playbook quoting multipliers is reasoning
   from a dead codebase.
2. **Replying to your own commenters barely helps on X.** `[STUDY]` +8% (Buffer 2026, 52M posts,
   within-account fixed effects) — vs +42% on Threads. Do it for relationships, not for reach.
3. **Premium does not buy For You reach.** `[CODE]` `[OFFICIAL]` Zero `verified` references in the
   ranking repo. It buys reply prioritization and rate-cap escape. Nothing more.

---

## 4. The core loop

Growth here is **reply-led**. Posts build the reason to follow; replies find the people who will.

**Daily (~60–90 min total: the ~45–60 min reply block from `replies.md` §5, plus posts and the news
loop on top)**
1. **Read our own comments first** — replies and QTs from the last 24h. That's the brief for today's
   post (`growth/context/04-content-engine.md`).
2. **Scan** Tier-A (reach) and Tier-B (graph) accounts for posts you can genuinely add to.
3. **10–30 substantive replies**, in 2–3 sittings — never batched.
4. **~10 min on the news loop** (`newsjacking.md`) — react only if we have an angle.
5. **1–3 posts**, pulled from the series in `growth/context/04-content-engine.md`.

**Weekly**: fill in performance on `growth/log/posted.md`, refresh `growth/log/targets.md`, and write
anything you learned into `growth/log/learnings.md`. Check whether a series has gone stale — the
archive is the only way to see that from the inside.

**Why these numbers:** `author_diversity_scorer` decays your Nth item exponentially *within a single
feed render* `[CODE]` — volume does not buy linear reach. But `[STUDY]` posting **more** does raise
weekly totals even as per-post reach falls, and **skipping weeks actively hurts**. Optimize weekly
totals; never optimize per-post averages.

**Full targets, funnel math, 90-day sequence and measurement: `growth/context/07-growth-system.md`.** Short
version: expect **500–2,000 followers in 90 days**, roughly **1,000–10,000 reply impressions per
follower**, and near-zero growth for the first 2–3 weeks. Anyone promising more is selling something.

---

## 5. Non-negotiable rules

**The highest-probability way to kill this account is X enforcement, not anything else.** X's
Authenticity policy bans the standard crypto growth playbook by name, and enforcement includes **URL
denylisting that survives account recreation**. Read `guardrails.md` before running any growth motion.

- **Never solicit engagement.** "follow for more", "like if you agree", "reply and I'll follow back".
  3+ occurrences → removal from the revenue program + **referral for suspension** `[OFFICIAL]`.
- **Never repost others' content as your own.** Plagiarism enforcement is live (~4,000 accounts removed
  from rev-share in one day). Being the **original uploader** is the protection. Applies to memes —
  use templates, never someone's finished image.
- **Reply UP only.** Replies where both parent and root are below the follower threshold hit
  `low_blast_radius` and **are not ranked at all** `[CODE]`. Small-account replies are relationship
  work, never reach work.
- **No links in post bodies** you want distributed — the ranker has no external-link-click head, so
  links earn nothing while suppressing what does score `[CODE]`. One link post a week, max.
- **Never imply anyone makes money here.** There is no money. `growth/context/05-facts.md`.
- **Never punch down at someone's real loss.** We're the place where losing is free; mocking people
  for whom it wasn't is how we become the villain. `growth/context/02-voice.md`.

---

## 6. Writing workflow

Every path ends at the same gate.

**For a reply:**
1. Confirm the target clears the reply-ranking threshold (Tier A) or is deliberate graph work (Tier B).
2. Pick **one** contribution — and note the first item is not a consolation prize: **a genuinely good
   joke about the actual topic**, a fact/number, first-hand experience, a sharpening of the claim, or
   the concrete example the post lacked. Being funny is our biggest differentiator and replies are
   where nearly all the follows come from; **don't sand them flat** (`growth/context/02-voice.md`).
3. Write it so it **stands alone** to someone who hasn't read the parent.
4. Gate: *would I upvote this if a stranger wrote it?* If no, don't send it.
5. `replies.md` §8 checklist + the voice gate.

Replies are scored **0–3 by an LLM whose rubric is withheld** `[CODE]`. There is no template to game —
and templated replies are exactly what such a classifier learns to catch. Write for a smart human.

**For a post:**
0. **Skim `growth/log/posted.md` first.** Ten seconds. Four of our nine series are locked behind
   missing product data, so the daily engine runs on three shapes — which is exactly when you repeat
   yourself without noticing. *(Skip it for a fast news reaction where the window matters more.)*
1. Pick a series from `growth/context/04-content-engine.md` — or don't post.
2. Default to **text-only** — highest median engagement in an 18.8M-post study `[STUDY]`. Media only
   when the media *is* the argument (a real screenshot). `memes.md` §1.
3. Hook: hold attention, and **pay it off**. `not_dwelled` is an explicit negative head `[CODE]` —
   unpaid curiosity gaps are actively penalized. Land the joke in line one.
4. **Longer wins** under author/topic control, and **numbers/specificity help**; **@-mentions hurt**
   and **"you" does nothing** `[STUDY]`. (The popular "+82% from hedged language" claim is
   **fabricated** — the one published coefficient is *negative*. See `posts.md` §3.)
5. Stay inside our pillars — off-topic candidates are **hard-dropped** `[CODE]`. `accounts.md` §3.
6. `posts.md` §8 checklist + the voice gate.

**The voice gate** (from `growth/context/02-voice.md`, run it every time):
would-you-send-this-to-a-friend · late test · costume test · landing-page test · stranger test ·
facts + villain test.

**Then write it into the log.** Drafts go to `growth/log/queue.md` marked `PROPOSED`. **Only Eli flips
a post to `APPROVED`, and nothing ships without it** — proposing is not deciding. Once it's posted,
move the block to `growth/log/posted.md` with the date and the URL. If something notable happened —
a post landed, a series died, a judgment call got made — one line in `growth/log/learnings.md`.

---

## 7. Honesty discipline

This skill's value is that it refuses to invent. Preserve that:

- If asked for a tactic with no evidence behind it (optimal posting time, DM scripts, teaser
  sequences), **say the evidence doesn't exist** and reason from mechanisms instead. Three independent
  research passes found **zero** verbatim DM amplification scripts — anyone selling one is improvising.
- Never quote a benchmark as a target. All available conversion figures are self-reported, from
  differently-normalized sources, and **not comparable to each other**.
- ⚠️ The algorithm repo has not been updated since **2026-05-15** despite a pledged four-week cadence.
  Anything after that date is inference. Re-check `github.com/xai-org/x-algorithm` before relying on
  `algorithm.md` for something load-bearing.
- Reach and conversion move in **opposite directions** — a viral post outside the niche converts
  terribly (one documented case: 4% → 0.6%) `[PRACTITIONER]`. When the user chases a big number, ask
  what it's for.
- **Never invent a product fact to make a post work.** Rewrite the post. `growth/context/05-facts.md`.
