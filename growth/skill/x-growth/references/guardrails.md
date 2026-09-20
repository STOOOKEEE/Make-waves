# Guardrails — how not to get the account nuked

Short file. Not a legal doc — the legal side is handled elsewhere and is not this account's problem.
**This is about the one thing that can actually kill goal #1: X enforcement.**

Because Tide is paper-only (no real money, no deposits, no trading), almost all of the financial-
promotion surface is gone. What's left is the platform itself, and X is the only enforcer that scans
automatically, at scale, all the time.

---

## 1. X bans the standard crypto growth playbook by name

From X's [Authenticity policy](https://help.x.com/en/rules-and-policies/platform-manipulation).
Note how precisely each one maps onto what a growth account is tempted to do:

- *"Sending **bulk, aggressive, high-volume unsolicited replies**, mentions, or direct messages"*
- *"promoting content by **replying with content that is irrelevant** to the topic of the original post"*
- *"using trending or popular hashtags with an intent to… drive traffic or attention to accounts,
  websites, products"*
- *"repeatedly posting… **links shared without commentary**, so that this comprises the bulk of your
  post activity"*
- *"**coordinating to exchange engagement**"* and *"compensating others to conduct account metric
  inflation"* — engagement pods, paid raids
- *"**engaging with posts aggressively or through the use of automation** to drive traffic"*
- *"**Unauthorized automation**… you are ultimately responsible for third-party applications you
  authorize"*

## 2. The enforcement ladder is real

Shadowbanning isn't folklore — X names it:

> *"**Restricting Reach:** … excluding posts from search results, trends, and recommended
> notifications, removing posts from the For You and Following timelines, restricting a post's
> discoverability to the author's profile… and **downranking the post in replies**."*

Then: anti-spam challenges, feature restriction, **URL denylisting**, and *"for severe violations,
accounts will be **permanently suspended at first detection**."*

**⚠️ URL denylisting is the underrated catastrophic one.** X can blacklist `tidetrade.xyz` itself.
That **survives account recreation.** You cannot fix it by starting over. This is the single worst
outcome available to us and it's reachable through pure impatience.

## 3. The bright lines

- **Every reply genuinely relevant** to its parent. Irrelevant replies posted for traffic are named
  as manipulation.
- **10–30 replies a day, spread out.** Not 100+, not batched. (Two independent reasons for this — see
  `algorithm.md` on author diversity decay.)
- **No engagement pods. No paid amplification. No coordinated raids.** Ever.
- **No unattended automation** posting or replying on our behalf. We're an account about AI agents;
  being caught running one on X would be a genuinely funny way to die, but it would still be dying.
- **Never solicit engagement.** "follow for more", "like if you agree", "reply and I'll follow back".
  3+ occurrences → removal from the revenue program + **referral for suspension**.
- **Don't let link posts become the bulk of our activity.** One link post a week, max
  (`04-content-engine.md` series 9).
- **Never repost someone else's content as ours.** Plagiarism enforcement is live — ~4,000 accounts
  removed from rev-share in a single day. Being the **original uploader** is the protection. Applies
  hard to memes: see `memes.md`.

## 4. The copy rules that survive paper-only

Short list, and it happens to overlap perfectly with just not being cringe:

**Never write:**
- Any return figure, win rate, or profit implication — real, backtested, or hypothetical
- "guaranteed", **"risk-free"**, "passive income", "can't lose"
  *(Note: **"no experience needed" is fine** — it's a plain true statement about a free simulator, not
  a return promise. Earlier drafts banned it by association; over-broad prohibitions are how copy
  starts sounding like legal wrote it.)*
- "our AI beats the market / finds alpha / makes money"
- Undocumentable superlatives ("first", "only", "best")
- Any capability that isn't shipped and working today
- Fabricated screenshots or invented numbers

**Always:**
- **Describe the mechanism, never the outcome.** "your bot trades inside the limits you set" is fine.
  "your bot grows your portfolio" is not. This one rule handles most of it.
- **Say the numbers are fake, near the number** — casually, in voice, not as a disclaimer block.
  `growth/context/05-facts.md` has the pattern.
- **Audit old posts occasionally.** Pinned posts and bios are live forever.

## 5. The leaderboard trap

A public ranking that only shows winners is structurally cherry-picking, and amplifying top performers
reads as publishing testimonials. Two habits fix it and both make the content better anyway:

- **Show the denominator.** Losses and mid-table are funnier than wins. `04-content-engine.md` builds
  two entire series on losing (Worst Trade of the Week, Fake Money Real Pain) — that's not a
  concession, it's the best material we have.
- **Never aggregate paper results into a claim about Tide.** "our users average +X%" is a performance
  claim about the product. "this guy did +400% and I'm not okay" is a leaderboard moment. Post the
  second one.

---

**Full claim limits live in `growth/context/05-facts.md`.** If a claim isn't there, it doesn't ship.
