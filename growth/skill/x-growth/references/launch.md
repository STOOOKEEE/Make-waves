# Launch

**Read `guardrails.md` before writing a single launch post.** A launch is the moment you make the most
claims to the widest audience, at the highest volume — exactly when X enforcement notices you.

⚠️ **Honesty warning for this file specifically.** Launch content is where the AI-blog slop is thickest.
Three independent research passes could **not** verify: teaser-sequence structures, launch-day timing,
optimal post formats for launch day, video demo specs, quote-tweet strategy, or **any** DM outreach script.
This file therefore contains fewer tactics than you'd expect — because the tactics that circulate are
unsourced. What follows is grounded in the mechanisms in `algorithm.md` and the two findings that *are*
well-supported.

---

## 1. ⭐ The finding that should shape the whole plan

**Reach and conversion move in opposite directions.** `[PRACTITIONER]`

One founder's viral post produced ~1,500 signups at a peak of 689/day. His normal signup→paid rate was
**4%**; that cohort converted at **0.6%** — a **6.7× collapse**. His own diagnosis: it *"reached a much
wider audience outside of my bubble."*

The same founder's in-niche launch post drove **$22.7K in 7 days**, which he attributed *"99%… from my
Twitter reach."*

**Same channel. Same person. Opposite outcomes — determined by audience fit, not by size.**

Independently corroborated: on Product Hunt and Hacker News, **rank is near-uncorrelated with signups** —
the variable that matters is *which* audience shows up, not how many.

**Consequence:** a launch that "goes viral" outside your niche is a vanity event that will *also* poison
your metrics, because your conversion denominator fills with people who were never going to convert.
**Design the launch to reach the right 5,000 people, not the biggest number.**

---

## 2. What the mechanisms imply for launch day

Derived from `algorithm.md`, not from launch folklore:

- **You get one feed slot per conversation** `[CODE]`. A launch thread is **one** candidate, not N. Its
  strongest-scoring post is the one that surfaces — and *you don't choose which*. So the main post must
  carry the whole message on its own.
- **Your own posts cannibalise each other** `[CODE]`. Author-diversity decay is exponential *within a feed
  render*, and it's **per-author, not per-conversation** — so "post 5 separate announcements to get 5
  slots" fails for the same reason threads do. **Space launch-day posts out.**
- **`not_dwelled` is a negative head** `[CODE]`. A launch hook that overpromises and underdelivers is
  actively penalised. Lead with the most concrete thing you have.
- **Links suppress engagement** `[CODE]`. The launch post should make people *want* the link. Per Musk's
  own framing, a link *"with an interesting description/image will get distribution"* — a bare link won't.
- **Topic coherence is a hard gate** `[CODE]`. If your account has been off-topic for months, launch day is
  the worst time to discover the classifier doesn't know what you are. Establish the topic **before** you
  need it.
- **Mutuals now measurably affect reply visibility** `[CODE]` `[OFFICIAL]`. The graph you built in the
  weeks before launch is the distribution you get on the day. **This is the single highest-leverage
  pre-launch investment.**

---

## 3. Amplification — without breaking the rules

The obvious growth tactics are prohibited by name. **Do not:**
- Ask for likes/reposts/follows — engagement solicitation is a **3-strike suspension referral** `[OFFICIAL]`
- Organise an engagement pod, a coordinated raid, or paid amplification — *"coordinating to exchange
  engagement"* and *"compensating others to conduct account metric inflation"* are both named in X's
  Authenticity policy
- Blast DMs — *"bulk, aggressive, high-volume unsolicited… direct messages"* is prohibited verbatim
- Run unattended automation

**What's left, and it's legitimate:**
- **Tell people who genuinely care, individually, before launch day.** `share_via_dm` is a **positive
  ranking head** `[CODE]` — real private sharing feeds public reach. The constraint is *bulk* and
  *unsolicited*, not "talking to people."
- **Be genuinely useful in the weeks before**, so that on launch day your mutuals amplify because they want
  to. There is no shortcut that survives the policy.
- **Any paid promotion must disclose the amount, in the post itself** (`guardrails.md`). Undisclosed
  paid promotion is what the SEC fined Kim Kardashian $1.26M for.

---

## 4. What to actually say

Apply `posts.md` §3 (length helps; specificity and numbers help; @-mentions hurt; "you" does nothing),
and write it in voice — `growth/context/02-voice.md`, no exceptions for launch day.

**The frame: show the thing working and let the thing be the claim.** Don't describe a benefit,
show a screenshot.

- ✅ "gave my bot $10,000 of fake money and a 3x leverage cap. it spent four minutes looking for a
  loophole, gave up, and is now rank 41. free, no signup nonsense."
- ❌ "Our AI agent trades for you and grows your portfolio."

The first is concrete, funny, and true. The second is a performance claim about a product where
nothing is real — false *and* the exact pattern the SEC fined Delphia, Global Predictions and Rimar
Capital for.

**Show, don't assert.** A screen recording of a bot getting blocked by its own limits is worth more
than any adjective. Every number on screen is simulated — say so, in voice, near the number
(`growth/context/05-facts.md`).

---

## 5. Pre-launch checklist

**Product truth**
- [ ] Every claim traces to `growth/context/05-facts.md`
- [ ] Nothing from the never-say list anywhere — no real trading, swaps, wallets, deposits, returns
- [ ] No AI capability claimed that isn't shipped and working **today**
- [ ] Simulated numbers labelled casually, adjacent to the number, not in a footer

**Voice**
- [ ] Passes all five gates at the bottom of `growth/context/02-voice.md`
- [ ] Nothing here could run verbatim on a fintech landing page

**Platform** (see `guardrails.md`)
- [ ] No engagement solicitation anywhere in the copy
- [ ] Launch posts spaced, not batched
- [ ] Link carries a substantial standalone description (or sits in the profile)
- [ ] Account has been topically coherent for weeks beforehand

**Craft**
- [ ] Main post stands alone — assume the thread never gets read
- [ ] Hook is paid off, not just baited
- [ ] **Shown to 3–5 people first.** Solo human accuracy at picking the better-performing wording is
      **61.3%**; a panel majority reaches **73%** `[STUDY]`. Your instinct alone is close to a coin flip.

---

## 6. After launch

- **Measure profile-visit and signup conversion, not impressions.** See `accounts.md` §5.
- **Audit your denominator.** Crypto signups are heavily bot-contaminated — one founder's "2% conversion
  problem" was really list-bombing; the true rate was **8.5%** `[PRACTITIONER]`.
- **Fix inaccurate copy the day you learn it's wrong.** Delphia's penalty was driven by claims that stayed
  up for ~2 years after being flagged. Pinned posts and bios are "live" indefinitely.
- **Don't publish the metrics that make you cloneable or farmable** (`posts.md` §5). Share process,
  decisions, and failures — not user counts or conversion rates.
