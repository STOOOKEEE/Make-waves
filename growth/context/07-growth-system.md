# 07 — The growth system

The continuous machine. Everything else in `growth/` is *what we say*; this is *how the account
actually grows*, week after week, without relying on anyone being inspired.

Every number here is graded. `[STUDY]` large-N with methodology · `[PRACTITIONER]` named person,
own data · `[FOLKLORE]` circulating but unsourced — **never build on it**.

---

## 0. Prerequisite: buy Premium

**The sound reason:** the free tier caps at ~**50 posts / 200 replies per day**, and this whole system
is reply-led. Premium also buys reply prioritization `[OFFICIAL]`. That alone justifies the cost.

**The dramatic reason, and why not to lean on it:** `[STUDY]` Buffer's 18.8M-post dataset shows
Premium and regular accounts tracking together until January 2025, then diverging — with the **median
engagement rate for regular accounts reaching 0%** by late 2025.

⚠️ **Don't over-read that.** A 0% *median* means more than half the non-Premium accounts in a large
scrape got zero engagement — which mostly describes a long tail of dormant accounts, not the marginal
effect of subscribing. It's confounded by selection (accounts that pay try harder). **Buy Premium for
the rate cap, which is a real mechanism. Treat the 0% figure as suggestive, not as proof.**

---

## 1. Realistic targets — read this before setting any goal

The honest first-hand logs, all `[PRACTITIONER]`:

| Account | Result | Method |
|---|---|---|
| vrsnmk | **47 → 702 followers in 6 weeks** | 12–18 replies/day |
| Graham Mann | **7–8 follows/day** once consistent | 40–60 posts+replies/day |
| Arvid Kahl | 400 → 4,000 in 8 months; **11,000 in 2.5 years** | reply-first, every account size |

**A realistic 90-day target is 500–2,000 followers.** Not 10,000. Anyone showing you a 0→100K case
study is selling something — the genre is ~85% AI-generated vendor content citing other vendor
content, and the one famous 2025 rage-bait case study (Cluely) was **partly built on revenue numbers
its CEO later admitted fabricating**.

### The funnel math

Two unrelated practitioners converged on the same order of magnitude, which is the strongest signal
available:

- reply impression → profile click: **0.05–0.15%**
- profile visit → follow: **~8%**
- ⇒ **roughly 1,000–10,000 reply impressions per follower**

At 15 replies/day (mid-range of our 10–30 band, §3) averaging ~1,000 impressions each: **~2–15
followers/day.** Treat this as a planning
estimate, not a fact, and replace it with our own analytics within four weeks.

---

## 2. The 90-day cold start

**Week 0 — before posting anything**
1. **Premium.** §0.
2. **Profile, bio, pinned post.** At an ~8% profile→follow rate this is the highest-multiplier surface
   in the whole funnel. `accounts.md` §1.
3. **Build the reply target list.** Tier by *conversation quality*, not follower count — Kahl's rule,
   and it contradicts most of the reply-guy genre. Weight toward finance-adjacent meme accounts: the
   audience for "trading is absurd" is far larger than the audience for trading.
4. **Ship screenshot instrumentation** (§5). It needs 2–4 weeks to produce signal. Start the clock now.

**Weeks 1–4 — reply-dominant**
- **10–30 replies/day** in 2–3 sittings. This is the only dial that matters right now.
- **Expect near-zero follower growth for 2–3 weeks.** Both honest logs report this; it's where people
  quit. vrsnmk: *"the first two weeks were discouraging."*
- Post daily anyway — the no-post penalty is account-level (§3).
- **Do not measure followers.** Measure replies sent and profile visits.

**Weeks 4–8 — find what lands**
- Duolingo's actual process, per their social lead: **not a rigid strategy — watch the community and
  riff.** Kill series that don't land instead of defending them.
- First screenshot data arrives. Redesign whatever the top three moments turn out to be.
- Follower growth becomes visible. 2–8/day is on track.

**Weeks 8–12 — install the loops**
- Ship the redesigned share artifacts (§5).
- Add **"how did you hear about us?"** at signup. Duolingo's social lead reports a direct correlation
  between a post landing and a spike in that answer — and it's the only attribution that survives X's
  missing click data. Without it we cannot tell whether any of this is working.

---

## 3. The weekly operating system

**The floor — never miss:**

| Slot | Volume | Why |
|---|---|---|
| **Replies** | **10–30/day**, 2–3 sittings, ~100–200/week | The only mechanic with two independent practitioner datasets behind it |
| **Posts** | 1–3/day, **text or image, no link in the body** | Format: `posts.md` §1 |

**Not in the floor: replying to our own commenters.** It lifts engagement only **+8%** on X `[STUDY]` —
nearly the weakest of any platform measured — and `SKILL.md` §3 lists the "always reply to every
comment" advice as one of the three myths. **Do it because someone asked a real question and deserves
an answer, not as a growth slot.** That's a warmth reason, and it's a good one.

> **10–30 replies/day is the number. Full stop.** Some practitioner logs report 40–60 combined
> posts+replies, but `guardrails.md` §3 treats **10–30/day as the bright line** against X's
> "bulk, aggressive, high-volume replies" prohibition — and that's an account-suspension risk, not a
> performance trade-off. **The safety ceiling wins over the practitioner's ceiling.** Anywhere in this
> pack that implies a higher number is wrong; this line is authoritative.

**Conditional slot — artifact posts (1–2/week when possible).** Leaderboard / agent-log / badge
content is our structural QT advantage (§4), and it's the highest-value thing we can post. **It is
also currently unexecutable** — see the data dependency in `README.md` and `04-content-engine.md`.
Deliberately *not* in the never-miss floor above: a floor item you cannot produce is a broken system,
not a stretch goal. Promote it the day real data is available.

**Format:** text first, link last, image in between. **Full numbers and the caveat that two cuts of
the source study disagree: `posts.md` §1** — read it there rather than repeating figures from memory.

- **Don't produce video for X.** The "video is 6x more retweetable" line everyone repeats is a ~2016
  Twitter marketing stat, and video does not lead in either cut of the current data.
- **Links are the one clear, large penalty.** One link post a week, max.

**The no-post penalty** `[STUDY]`: accounts that skipped weeks underperformed their own baseline.
**Any posting beats silence.** Consistency is a floor, not a growth hack.

**The frequency tension, stated honestly by the source:** posting more raises *total* engagement and
follower growth, but *per-post* reach declines. **Optimize weekly totals. Never optimize per-post
averages** — that metric will push you toward posting less, which is backwards.

---

## 4. Designing for distribution

**Quote tweets are identity, not content.** `[STUDY]` 14.1M tweets: quotes are **4–16x harder to
predict** than likes/retweets, and they're driven by *the quoter's* influence and self-presentation —
not by how good your post is. Likes and retweets respond to content; **a QT is someone publishing
their own opinion, using your post as the pretext.**

→ **Design rule: leave a slot the quoter fills with themselves.**
- A claim someone can disagree with *by degree* (a stance they'd want on record — not a flamewar)
- **A number or ranking they can answer with their own number** ← leaderboards and score cards are
  structurally the best QT bait that exists. This is Tide's native advantage; use it deliberately.
- A category system people sort themselves into ("which one are you")
- Something taggable — where the natural response is "@friend this is you"

⚠️ Honest gap: "QTs drive more reach than reposts" is widely believed and **could not be verified**.
What's verified is that they're the hardest to induce and depend on identity.

**Emotional register decides sharing.** `[STUDY]` Berger & Milkman, JMR 2012, all NYT articles over
3 months: **high-arousal emotions drive sharing — awe, anger, anxiety, amusement.** Low-arousal
(sadness) suppresses it. Holds controlling for surprise, interest and utility.

→ For us: **awe** (a bot doing something absurdly good), **indignation** (a leaderboard position
someone finds offensive), **amusement**. And the flip side matters more than it looks:

> **"Informative" is the wrong register for distribution.** A **post** that makes someone feel
> *educated* travels badly. One that makes them feel *competitive* or amused travels well.

Two limits, both important:

1. **Don't stop teaching.** Explain It Badly works precisely because the payload is educational and
   the *feeling* is amusement. Never optimize a post to *feel* informative — that's different from
   never being useful.
2. **⚠️ This does not apply to replies.** The finding measures *article sharing*. Replies aren't
   shared; they're read by someone who already has a question. **In replies, being plainly useful is
   the highest-converting thing we do** (`02-voice.md`). Do not import this rule there — it's
   the single easiest way to make the account read cold.

**Leaving a gap pulls replies — but the famous number is fake.** A "+82% replies from uncertain
language" figure circulates and **`posts.md` §3 shows it's fabricated**: the nearest actually-published
coefficient runs *negative* (r = −0.053, N=17,640). **Do not cite +82% anywhere.**

The underlying craft point still stands on its own logic, so keep it as craft, not as data: **a post
that closes every loop gets liked; a post that leaves something to answer gets replied to.** Decide
which you want before writing.

---

## 5. The screenshot loop — highest-leverage item here

`[PRACTITIONER]` Duolingo's virality team stopped asking *"what should we make shareable?"* and
instead instrumented a single event — **"user took a screenshot"** — producing a heat map of where
people were already capturing the screen unprompted.

Three hotspots surfaced:
1. **Streak milestones** — proof of commitment
2. **The weird sentences** ("the horse drinks beer") — pure entertainment, *nothing to do with the
   product's value prop*
3. **Finishing top-3 on the weekly leaderboard** — competitive proof

They then rebuilt exactly those three screens as full-screen, high-contrast, animated celebrations
sized to social aspect ratios. **They built no new features.**

⚠️ The famous "5–10x increase in sharing" figure is single-source and secondhand. **The method is
well-attested; the multiplier is not.**

**Direct transplant for Tide.** Instrument screenshot events for 2–4 weeks and find our three. Prior,
based on the Duolingo pattern: **a rank change**, **a catastrophic loss**, and **an agent doing
something unhinged in its log**. Note two of those three are *failure* states and Duolingo's #2 had no
product value at all — **do not assume the shareable moment is the one you're proud of.**

This also unblocks the "no live product data" dependency in the README: it tells us *which* of our
data-dependent series is worth the plumbing before we build any of it.

**Design constraints, consistent across every documented case:**
- Ship the artifact **pre-formatted to social aspect ratios**, branding baked in
- **One tap to share.** No export flow.
- **The artifact must say something about the person, not the product.** People share identity claims,
  not statistics.
- **Comparison beats absolute numbers.** A relative rank against matched peers beats a raw score.
- **Never gate it.** Strava moved its year-in-review behind a paywall after eight years free; if the
  artifact is the acquisition loop, gating it kills the loop.

---

## 6. What to measure

Weekly, in this order. **Followers are the last thing you look at, not the first.**

1. **Replies sent** — the input metric, the only one fully in our control
2. **Profile visits/day** — the real leading indicator. Graham Mann's inconsistent vs consistent
   months moved this **26%**, and his inconsistent month ended in *net unfollows*
3. **Profile visit → follow rate** — target ~8%. **If this is low, fix the bio and pinned post, not
   the content.** A content problem and a profile problem look identical from the follower count
4. **Which reply produced the most profile visits** → feed it back into the target list
5. **Signup survey attribution** (§2) — the only real conversion signal we'll ever have

⚠️ **Audit the denominator before concluding anything.** One founder measured 2% signup→paid and
assumed a product problem; the real cause was bot list-bombing inflating the denominator. Real rate:
**8.5%** `[PRACTITIONER]`.

---

## 7. Deliberately not in the system

Each of these is popular and each fails on evidence:

- **Posting-time optimization.** Buffer's timing study covers 8.7M tweets and reports **zero effect
  sizes** — not small ones, none. Every vendor study also has an uncontrolled self-selection confound
  (the hours good accounts already post look "best"). `[FOLKLORE]`
- **Video for X.** Worst-performing format (§3).
- **"Episodic content performs 8x better."** No study attached anywhere. Invented. `[FOLKLORE]`
- **Naming the audience.** Searched specifically; **no evidence it does anything.** Cheap and harmless,
  so do it if it's funny — just don't count it as a lever.
- **Recurring series as a growth mechanism.** All serialized-content evidence is TikTok/Instagram/
  YouTube, where a *format* can be algorithmically recognized. Nothing X-specific exists. **Run our
  nine series because they make the account cheaper to operate and give people something to expect —
  not because a study says they multiply anything.**
- **Rage bait.** Works for attention; incompatible with our positioning, and the one famous case study
  is partly a lie (§1).
- **Anything justified by the 2023 engagement weights.** See `algorithm.md` §3.

---

## 8. The thing that actually kills this

Not the algorithm. **Stopping.** The inconsistent month in the only detailed practitioner log produced
net unfollows; the consistent months produced 7–8 follows/day with the same person writing the same
way. The system above is unglamorous on purpose — it's designed so that a mediocre week still moves
the number, and so that nobody has to feel inspired for the account to grow.
