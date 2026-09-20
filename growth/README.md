# `growth/` — the X account

> # Priority #1: grow the X account and pull in users.
> Everything here serves that. When something is ambiguous, pick the option that gets more of the
> right people playing.

---

## What Tide is (so you can't get it wrong even if you read nothing else)

**A paper-trading arena.** $10,000 in fake money, real live market prices, a leaderboard. You compete
against other humans and against AI agents people built. No deposit, no KYC, no real money anywhere in
the product story.

**There is no real trading here.** No swaps, no wallets, no on-chain settlement, no deposits, no
returns. Never mention them. Not having real money is our best feature — see
[`context/01-product.md`](context/01-product.md).

**The account: [@tidetradexyz](https://x.com/tidetradexyz)** · site: `tidetrade.xyz`

---

## Three layers

| | | |
|---|---|---|
| **[`context/`](context/)** | **who we are** | product truth, voice, audience, content angles. Authoritative on **tone** and **facts**. |
| **[`log/`](log/)** | **what we did** | queue, archive, reply targets, learnings. Authoritative on **what actually happened**. |
| **`.claude/skills/x-growth/`** | **how X works** | platform mechanics, evidence-graded. Authoritative on **tactics**. |

If `context/` and the skill disagree about how something should *sound*, `context/` wins.
If `log/learnings.md` contradicts `context/`, **the log wins** — it's evidence from our own account.

## What to load

| Task | Load |
|---|---|
| **Anything at all** | [`context/02-voice.md`](context/02-voice.md) — non-negotiable, every single time |
| Write a post | `02-voice` + [`context/04-content-engine.md`](context/04-content-engine.md) + **[`log/posted.md`](log/posted.md)** (don't repeat yourself) + skill `posts.md` |
| Write a reply | `02-voice` + **[`log/targets.md`](log/targets.md)** + skill `replies.md` |
| Make a meme | `02-voice` + [`context/06-visual.md`](context/06-visual.md) + skill `memes.md` |
| React to market news | `02-voice` + skill `newsjacking.md` |
| Plan growth, set targets, cadence | [`context/07-growth-system.md`](context/07-growth-system.md) |
| "why isn't this working" | [`context/07-growth-system.md`](context/07-growth-system.md) §6 + [`log/learnings.md`](log/learnings.md) |
| Set up / audit the account | [`context/03-audience.md`](context/03-audience.md) + [`context/07-growth-system.md`](context/07-growth-system.md) §0–2 + skill `accounts.md` |
| Make an image or brand asset | [`context/06-visual.md`](context/06-visual.md) + `02-voice` |
| Explain the product | [`context/01-product.md`](context/01-product.md) + [`context/05-facts.md`](context/05-facts.md) |
| Check any specific claim | [`context/05-facts.md`](context/05-facts.md) |

## The three hard rules

1. **If a claim isn't in [`context/05-facts.md`](context/05-facts.md), it doesn't get posted.** No
   improvising product details, no invented numbers, no fabricated screenshots.
2. **Everything runs through the gate at the bottom of [`context/02-voice.md`](context/02-voice.md)**
   before it ships.
3. **Nothing ships that isn't marked `APPROVED` in [`log/queue.md`](log/queue.md).** Drafting is not
   deciding.

## Files

**[`context/`](context/) — who we are**
- [`01-product.md`](context/01-product.md) — what Tide is, plus the out-of-scope list
- [`02-voice.md`](context/02-voice.md) — **the voice bible. Start here.**
- [`03-audience.md`](context/03-audience.md) — who we want and what they actually feel
- [`04-content-engine.md`](context/04-content-engine.md) — the recurring series + the news loop
- [`05-facts.md`](context/05-facts.md) — citable facts + the never-say list
- [`06-visual.md`](context/06-visual.md) — visual identity + the social/meme layer
- [`07-growth-system.md`](context/07-growth-system.md) — targets, funnel math, 90-day cold start, weekly OS

**[`log/`](log/) — what we did**
- [`daily.md`](log/daily.md) — **the daily runsheet. Open this to run the account.**
- [`queue.md`](log/queue.md) — approved and proposed, not yet posted
- [`posted.md`](log/posted.md) — the archive. **Check before drafting.**
- [`targets.md`](log/targets.md) — reply target list
- [`learnings.md`](log/learnings.md) — what worked, what died
- [`data-access.md`](log/data-access.md) — the #1 unblock, scoped in code

**Language: English only.** Posts and docs. The product has an FR toggle; the X account doesn't.

**Docs only.** Nothing here edits product code.

---

## ⚠️ Open dependencies

Operational inputs nobody has supplied yet. **Work around them honestly — never invent them.**

1. **The reply target list is empty.** [`log/targets.md`](log/targets.md) is a stub. Replies are where
   essentially all follows come from, so until someone spends the 30 minutes (procedure in the skill's
   `replies.md` §3), an agent asked to write replies can only invent fictional parents. **Highest-value
   hour available.**
2. **⭐ No access to live product data — this is the one that decides whether the account is good.**
   Four of the series in [`context/04-content-engine.md`](context/04-content-engine.md) — Leaderboard
   Drama, Humans vs Bots, Worst Trade of the Week, Bot Diary — need real standings and agent logs. Both
   exist in the codebase; nothing exposes them to whoever writes posts.

   An adversarial audit traced *every* remaining voice complaint back to this
   ([`log/learnings.md`](log/learnings.md)): with no real data, the account can only post timeless
   aphorisms, and timeless is a synonym for brand. **We are running the substitute formats as the
   strategy.** Nobody else on X can post *"the bot spent four minutes looking for a loophole in a 3x
   cap, failed, and opened a 3x."* Until this is wired up, the writing can keep improving and the
   account will keep reading as commentary rather than as a live feed from somewhere only we can see.

   ✅ **Scoped 2026-07-24 — it's nearly done already.** See [`log/data-access.md`](log/data-access.md):
   the human-vs-bot leaderboard split already exists behind the admin token (`/admin/overview`), and
   the agent action log is one ~15-line admin route from the data that's already persisted. **The ask
   is: hand over `TIDE_ADMIN_TOKEN` and add one small route.** Not a project.
3. ~~No archive of what's been posted.~~ **Resolved** — [`log/posted.md`](log/posted.md). It only works
   if people actually write to it.
4. ~~Account tier unknown.~~ **Resolved: buy Premium — for the rate cap.** The free tier caps at ~50
   posts / 200 replies a day, a hard ceiling on a reply-led strategy. (A widely-quoted stat says
   non-Premium median engagement hit 0% — **don't lean on it**, it's confounded; see
   [`context/07-growth-system.md`](context/07-growth-system.md) §0.)
