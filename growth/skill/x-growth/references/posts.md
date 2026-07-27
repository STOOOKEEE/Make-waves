# Posts — formats, hooks, and what the evidence actually supports

Evidence grades as in `algorithm.md`. This file is deliberately short on templates: the strongest
finding in the research is that **most circulating post-format advice is unsourced**, and templated
content is what classifiers learn to catch.

---

## 1. Format hierarchy `[STUDY]`

Buffer, **18.8M posts**. **Two different cuts of this study circulate and they disagree** — so here
are both, honestly:

| Format | Non-Premium cut | All-accounts median |
|---|---|---|
| **Text only** | **~0.40%** | **3.56%** |
| Image | ~0.20% | 3.40% |
| Video | ~0.25% | 2.96% |
| **Link** | **~0%** | 2.25% |

⚠️ **They rank image and video in opposite orders, and the absolute values differ ~10×** (different
normalization and different account populations). Never mix a number from one column with one from
the other, and never quote a single figure as *the* engagement rate.

**What survives in both cuts — treat only this as robust:**
1. **Text is first.** Always.
2. **Link is last.** By a wide margin.
3. **Image vs video is not settled.** Don't build a policy on their ordering.

**Policy, which both columns support:** default to text. Add an image when the image *is* the argument
(a real screenshot). Don't produce video for X. Ration links hard.

⚠️ **Which column applies to us is genuinely unknown.** Being on Premium does *not* make the
all-accounts column more applicable — that median is itself dominated by non-Premium accounts. What
would settle it is a Premium-only cut, which the study as published doesn't offer. So:

> **Don't decide the meme question from this table.** Under the optimistic reading images cost us
> almost nothing; under the pessimistic one they cost half. `memes.md` §1 applies the stricter reading
> deliberately — use an image when the image *is* the argument, and let our own analytics settle it
> within a few weeks.

---

## 2. The link problem — mechanism, not penalty

**There is no link-deboost code.** `[CODE]` `[OFFICIAL]` Bier, 2026-04-22, verbatim:
*"there is no code that is deboosting links."*

**But** the ranker predicts `profile_click`, `quoted_click`, `share_via_copy_link` — and has **no
external-link-click head at all**. So link clicks earn you nothing, while the link overlay covers the
post and suppresses the likes/replies/dwell that *do* score. The penalty is **learned, not coded** —
which means it cannot be removed by deleting a rule.

Musk's own framing (he pointedly did **not** endorse the "links are fine now" reading):
> *"Posting a link with almost no description will get weak distribution, but posting a link with an
> interesting description/image will get distribution."*

**Practical rules:**
- Keep links out of posts you want distributed. Put the idea in the post; make people want the link.
- If you must link, give it a substantial, self-contained description — per Musk's framing.
- ⚠️ **"Link in the first reply" has no credible primary test.** The circulating "30–50% penalty avoided"
  numbers trace only to AI-SEO sites `[FOLKLORE]`. The pattern is plausible and low-cost, but note that
  a self-reply **competes with your own root post** for the single conversation slot `[CODE]`. **A/B it
  on your own account; don't trust the numbers.**

---

## 3. Hooks and wording — the one genuinely rigorous source

### ⚠️ First, a refuted claim
**"Hedged language drives +82% more replies" is FOLKLORE — and probably fabricated.** No source exists.
The nearest published coefficient runs the *other way*: Mahmud et al. 2014 (arXiv:1402.6690, N=17,640)
measured the LIWC "Tentative" category at **r = −0.053** — negative and negligible. If you see the +82%
figure quoted anywhere, that guide is not checking its sources.

### Tan, Lee & Pang 2014 — the best wording evidence that exists `[STUDY]`
ACL, peer-reviewed. Method: **11,404 topic-AND-author-controlled pairs** (same URL, same author,
different wording) from a 558M-tweet corpus; one-sided paired t-tests, Bonferroni-corrected across 39
features. This design removes the author-fame and topic confounds that ruin nearly every marketing study.

| Feature | Effect |
|---|---|
| **Length (characters)** | **↑ — longer wins** |
| Informativeness: verbs, nouns, adjectives, adverbs, proper nouns, **numbers** | ↑ |
| Explicit share request ("please RT", "spread") | ↑ *(see warning below)* |
| Conformity to the community's language model | ↑ — write like the room |
| Resemblance to headline cadence (NYT bigram LM) | ↑ |
| Sentiment — positive, negative, **and contrastive** | ↑ (all three) |
| Indefinite articles (a/an) — generality | ↑ |
| **@-mentions** | **↓ — actively hurts** |
| **2nd-person pronouns ("you")** | **no effect** |
| Hashtags | mostly **confounded** — the known positive effect largely vanishes under author+topic control |

**Three folklore items this kills:**
- **"Keep posts short"** — contradicted. Under proper controls, length *helped*.
- **"Talk directly to the reader with 'you'"** — measured **ineffective**, yet authors *preferred* adding
  it in 57% of rewrites. A documented case of practitioners optimizing for something that doesn't work.
- **"Hashtags boost reach"** — mostly a confound.

⚠️ **Do not act on the share-request finding.** That data is from ~2013. X now treats engagement
solicitation as a **3-strike suspension-referral offense** `[OFFICIAL]`. The finding is historically
real and currently unusable.

### Calibration: your instinct is barely better than a coin flip `[STUDY]`
Same paper: humans picking which of two wordings won scored **61.3%** solo (106 subjects, 3,900
judgments), **73%** for a majority vote of 39 — rising above 90% when ≥80% agree.

**Practical consequence: show launch-critical drafts to 3–5 people before sending.** A small panel is
measurably better than any individual's taste, including yours.

### Justin Welsh's 3-line structure `[PRACTITIONER]` — a usable frame, weaker evidence
1. **Scroll-stopper** — `The {relatable enemy} is {negative}`
2. **Flip** — `The {hero} is {strong positive}`
3. **Gasoline + teaser** — escalate, then promise what follows

Constraint: **~210 characters above the fold**, three short lines, blank lines between them.

**Hook principles that follow from the code, not from folklore:**
- **`not_dwelled` is an explicit negative head** `[CODE]` — a hook that stops the scroll but doesn't hold
  attention is *actively penalized*. Curiosity gaps that don't pay off hurt you. This is the single
  biggest difference from pre-2026 advice.
- **Specificity and numerals** beat abstraction — concrete claims hold readers.
- **Stand-alone value.** Someone who reads only the first line should get something.

---

## 4. Threads vs long-form — genuinely unresolved

**Do not let anyone tell you this is settled.**
- Threads beat *link posts* — solid, but that's partly re-measuring the link penalty.
- Threads vs long-form text: **settled by nothing.** Hootsuite's test is n=6 with totals dominated by a
  single outlier. `[FOLKLORE]`
- "Thread completion rate is a ranking signal" — **not among the 19 action heads, no code evidence.** `[FOLKLORE]`
- "3–5 tweet threads get 40–60% more impressions" — no traceable methodology. `[FOLKLORE]`

**What IS true** `[CODE]`: `dedup_conversation_filter` keeps **one candidate per conversation**. A thread
earns **at most one feed slot**. So threads win through **dwell time once opened**, never through slot
count. Write threads that hold a reader, or don't write threads.

---

## 5. Build in public — the constraint that matters

**The open-startup movement has closed.** `[WELL-EVIDENCED]` `levels.io/open/` 404s, nomadlist/remoteok
open pages are down, Bannerbear shares "only selected metrics," Baremetrics shows no revenue values.

**Arvid Kahl — who helped popularize revenue transparency — publicly reversed:** `[PRACTITIONER]`
> *"I would never share numbers."*

His reasoning: the old "$20–30K MRR is safe from cloning" threshold *"has effectively collapsed to zero"*
because AI makes cloning near-free. His replacement rule is the usable one:

> **"Share things that make it interesting to participate in your journey, but not easy to clone your
> business."**

**For us this is the most important line in the research.** Publishing exact user counts, signup or
conversion rates hands a cloner the playbook and tells farmers what to game. Share **process,
decisions, failures, and craft** — not the metrics that constitute the business.

Convenient side effect: the failures *are* our content. `growth/context/04-content-engine.md` builds four
series on losing, and none of them leak anything worth cloning.

**Patterns that still work** `[PRACTITIONER]`: milestone ladders, cost-transparent posts (Tony Dinh:
*"~25B tokens, ~$15,000 cost, gained $157 MRR, AMA"* — note he shared **cost**, not revenue), standing
failure ledgers, and public retractions/reversals.

---

## 6. Media

From the code `[CODE]`:
- The **video-quality-view head is gated on a minimum duration** — very short clips may not qualify for
  the credit at all. Don't post 3-second loops expecting video treatment.
- Separate heads exist for `photo_expand`, `quote`, `quoted_click`, `quoted_vqv` — **quote-posts have
  their own scoring surface**, including credit when viewers click through to the quoted post.
- `video_filter.rs` is binary (all videos in or out); **no graduated duration logic** beyond the vqv gate.

**Practical:** a real screen-recorded demo is a legitimate use of video (the media *is* the argument).
For everything else, text outperforms. A demo GIF/video should show the thing working in under ~20
seconds and be legible on a phone.

---

## 7. What nobody could source (three independent research passes)

Treat the absence as information — if these existed as reliable playbooks, they'd have surfaced:

- **DM amplification scripts** — zero verbatim examples found across three passes. Anyone selling you a
  "proven DM template" is improvising.
- Teaser-sequence structures and X launch-day timing.
- Video demo specs for dev-tool launches.
- Pinning and quote-tweet strategy.
- Contrarian / before-after / screenshot templates with real data behind them.
- Optimal posting times and frequency.

**Write from the mechanisms in `algorithm.md` instead of borrowing templates.** The mechanisms are
verified; the templates are mostly SEO fiction.

---

## 8. Pre-publish checklist

- [ ] Is this text-only unless media *is* the argument? (Memes: `memes.md` §1)
- [ ] No link in the post body — **one documented exception**: The Invitation, once a week
      (`growth/context/04-content-engine.md` series 9), where the link carries a substantial standalone description
- [ ] Does the first line hold attention, and does the post **pay off** the hook? (`not_dwelled` is negative)
- [ ] On-topic for my account's established topic (`topic_ids_filter` hard-drops off-topic)
- [ ] No engagement solicitation of any kind
- [ ] Original — not a repackaged version of someone else's post
- [ ] **In voice, and through the gate** — `growth/context/02-voice.md`
- [ ] **Every claim traceable to `growth/context/05-facts.md`**

⚠️ Deliberately *not* on this list: "hedge for replies, assert for authority." §3 shows that claim is
fabricated — the one published coefficient points the other way. Write it the way it's true, then make
it funny.
- [ ] Does it reveal metrics that make us easy to clone or easy to farm? If yes, cut them.
