# Queue — approved and proposed, not yet posted

**`APPROVED` = may ship. `PROPOSED` = waiting on Eli. Nothing ships without APPROVED.**

Format: status · series · the post · notes.
When it ships, move the whole block to [`posted.md`](posted.md) with date + link.

---


> ✅ **Day corrected.** This block was labelled "(Mon)" — 2026-07-21 is a **Tuesday**. The error came
> from the brief, not the writing, and it propagated into the batch. Tuesday's rhythm slot is
> **Explain It Badly · ◆ Bot Diary** — not Humans vs Bots, so the "Monday substitution" reasoning was
> answering a question that didn't exist.
>
> **Already shipped today** (see [`posted.md`](posted.md), URLs still missing): an observer-voice
> Humans-vs-Bots post and an Explain It Badly post. So Tuesday's scheduled slot is **already used** —
> don't run a second Explain It Badly today.

### KILLED · Trading-is-absurd · ~9:00 — wrong day
> ~~sunday you're a portfolio manager / monday you're just a guy clicking~~

*A Monday joke with a stated 24-hour shelf life, queued for a Tuesday. Not salvageable today — hold it
for next Monday, where it's genuinely good. (The "a guy" gendering note still applies then: safe cut is
"monday you're just clicking", at some cost to the joke.)*

### PROPOSED · Warm · ~20:00
> you're allowed to be bad at this for way longer than you think

*The ~1-in-5 warm slot, and the day needs it — both posts already shipped are jokes. Honest
assessment: the weakest thing in this file. It states a permission rather than noticing something and
sits close to generic encouragement. **Prefer the sharper alternate below** unless you want the softer
read.*

### PROPOSED · Humans vs Bots (qualitative) · hold for Wednesday
> your agent will try to argue its way past the limit you set
>
> the server doesn't read

*Our most ownable angle, traceable to `context/05-facts.md` (mandate, server-enforced limits, no
bypass; no counts, no logs). **Held, not killed:** an observer-voice Humans-vs-Bots post already went
out today and two in one day reads as a bit. Assumes the reader knows you can plug an agent in —
underperforms on a general timeline, fine for our niche.*

---

## Alternates — unscheduled, approved-in-principle pool

### PROPOSED · Explain It Badly — ⚠️ not today
> dollar cost averaging: being wrong on a schedule

*Highest quotability in the batch. Arguable on purpose — DCA people will push back, which is the
format working. **But an Explain It Badly already shipped today** ("leverage: the same trade, you just
find out sooner"). Two of one format in a day reads as a bit. Run it tomorrow.*

### PROPOSED · Fake Money Real Pain
> you'll hold a losing paper position for three days rather than be wrong in a game with no money in it

### PROPOSED · Trading-is-absurd
> nobody has a high risk tolerance. some people just haven't had a red day yet

### PROPOSED · Warm
> you're not bad at this, you're new at this, and those look identical from the inside

*Sharper than the scheduled warm post. One comma from a motivational poster — but it earns it.*

### PROPOSED · Ask The Void (1×/wk)
> what's the position you're still not over. no context, just the ticker

*Near-zero friction to answer. The replies become next week's posts.*

### PROPOSED · The Invitation (1×/wk, the only post a link belongs in)
> $10,000 in fake money, real prices, and a leaderboard with other people and their bots on it. no deposit, no kyc, nothing to lose except a rank. tidetrade.xyz

*Every figure from `context/05-facts.md`. Note "nothing to lose except a rank" — deliberately not
"risk-free", which is prohibited-adjacent.*

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
