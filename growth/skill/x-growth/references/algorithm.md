# How X ranking actually works (July 2026)

Verified against the published source at `github.com/xai-org/x-algorithm` (open-sourced 2026-01-20,
last commit 2026-05-15), not secondary blogs. Evidence grade on every claim.

**Grades:** `[CODE]` verified in published source · `[OFFICIAL]` X product statement ·
`[STUDY]` large-N study with methodology · `[PRACTITIONER]` named person, own data ·
`[FOLKLORE]` circulating but unsourced — do not build on it.

---

## 0. The one thing to internalize

**The numeric weights are not public, and the old ones are dead.** `[CODE]`

Every scoring constant lives in a `crate::params::*` module that is **excluded from the release**. The
scorer files contain weight *names* (`FavoriteWeight`, `ReplyWeight`, `DwellWeight`…) and zero values.

This matters enormously: the famous table circulating in every growth guide —
*"Reply ×13.5, Retweet ×20, author-reply-back ×75, Like ×1"* — is from the **March 2023** codebase,
describes **a system X no longer runs**, and is partly fabricated anyway (the real 2023 numbers were
retweet **1.0** and like **0.5**, not 20 and 1; bookmarks never appeared at all).

In Oct 2025 Musk announced deletion of all heuristics. The current README states:
> *"We have eliminated every single hand-engineered feature and most heuristics from the system.
> The Grok-based transformer does all the heavy lifting."*

**Consequence: there is no rulebook to game.** Ranking is a learned function predicting how *you*
specifically will behave. Build tactics on **mechanisms** (what the system structurally can and cannot
do), never on multipliers. Any guide quoting specific weights in 2026 is reasoning from a dead codebase.

---

## 1. The pipeline `[CODE]`

Four components: **Home Mixer** (orchestration) → **Thunder** (in-memory store of in-network posts,
including replies/reposts) → **Phoenix** (Grok-architecture transformer, two-tower retrieval then
ranking) → **Candidate Pipeline** (`Source`/`Hydrator`/`Filter`/`Scorer`/`Selector`).

**Scoring:** Phoenix predicts ~19 action probabilities; final score = `Σ(weight_i × P(action_i))`.

Positive heads: favorite, reply, retweet, quote, click, profile_click, photo_expand, video-quality-view
(vqv), share, **share_via_dm**, **share_via_copy_link**, dwell, cont_dwell_time, click_dwell_time,
quoted_click, quoted_vqv, follow_author.

Negative heads: **not_interested, block_author, mute_author, report, not_dwelled**.

**Read this as an objective function.** You are not optimizing "engagement" — you are optimizing the
model's *prediction* that a specific viewer will dwell, reply, click your profile, or follow you, minus
its prediction they'll mute or scroll past. Negative signals are first-class and symmetric.

---

## 2. Mechanisms you can actually exploit

These are structural facts about the system, so they stay true even though the weights are hidden.

### 2.1 Reply routing by follower size — the single most actionable finding `[CODE]`
From `grox/tasks/task_filters.py`:
- Parent author **or** thread root **above** the follower threshold → spam check skipped, reason
  `"reply_ranking_target"` → your reply enters **LLM quality ranking**.
- **Both below** the threshold → reply ranking skipped, reason **`"low_blast_radius"`** → screened only
  by `SpamSystemLowFollower`.

**Translation: replies under big accounts enter a quality tournament you can win. Replies under small
accounts are not ranked at all.** Reply-guy strategy still works — but only upward, and only with quality.
Volume-spamming small threads is worthless *by construction*, not by etiquette.

### 2.2 Replies are LLM-judged 0–3 `[CODE]`
`grox/classifiers/content/reply_ranking.py` runs a Grok VLM (`ReplyScoringSystem`) emitting a score with
buckets `[0,1,2,3]` plus a text `reason`. **The rubric is withheld** (`grox/lib/prompts` → 404).

Since you can't read the rubric, the only robust strategy is: **write something a smart human reader
would judge as a genuine contribution.** No template beats that, and templates are exactly what a
classifier learns to detect.

### 2.3 Mutual-follow is now a coded signal — highest-confidence lever `[CODE]` `[OFFICIAL]`
`mutual_follow_jaccard` sits on the candidate; `mutual_follow_jaccard_hydrator.rs` computes MinHash
(≥256 hashes). Dated **2026-07-13**. X head of product Nikita Bier:

> ⚠️ **Internal inconsistency, flagged rather than resolved.** This file states elsewhere that the repo's
> last commit is **2026-05-15** — two months *before* this date. Both can't be right. Most likely the
> 2026-07-13 date comes from Bier's public announcement rather than a commit, or the repo was updated
> after the last-commit note was written. **Until someone re-checks the repo, treat the mutual-follow
> signal as `[OFFICIAL]` (X's head of product said it) but not `[CODE]`-confirmed as shipped.**
> `replies.md` Rule 2 rests on this — downgrade its confidence accordingly.
> *"We noticed this data was missing from the algo and it made your friends appear less in your replies."*

**Becoming genuine mutuals with people in your niche is the most defensible tactic available today.**
Graph overlap directly raises your visibility in their replies and feeds.

### 2.4 Author-diversity decay — volume is mechanically throttled `[CODE]`
`author_diversity_scorer.rs`: `multiplier = (1 - floor) × decay^position + floor`, where `position` is
your Nth post **within one feed response**. Exponential decay per repeat author.

**Posting more does not linearly buy more reach.** Your 2nd/3rd/4th item in the same render is
multiplied down. This is the code-level reason to prefer ~10–30 quality replies/day over 100+ spam.

### 2.5 One post per conversation wins a slot `[CODE]`
`dedup_conversation_filter.rs`: conversation ID = `min(ancestors)`; keeps **exactly one candidate per
conversation** — the highest-scoring one, **author-agnostic**.

Implications: (a) a **thread yields at most one feed slot** — threads win through *dwell*, not slot
count; (b) your reply to a viral post competes head-to-head with the original and usually loses, so
reply distribution comes from the **conversation surface**, not For You; (c) a self-reply (e.g. a link)
competes with your own root post.

### 2.6 Topic coherence is a hard gate `[CODE]`
`topic_ids_filter.rs` **drops** (not demotes) candidates matching excluded topics, using a hierarchical
Grok taxonomy. Viewer side carries `inferred_grok_topics`.

**Post coherently within a recognizable topic.** An account that jumps randomly across topics is
harder to route. Consistency is a distribution mechanic, not just branding advice.

### 2.7 Dwell and `not_dwelled` `[CODE]`
`not_dwelled` is an explicit **negative** head. A hook that wins the scroll but fails to hold attention
is actively penalized. Optimize for *holding* the reader, not just stopping them. Clickbait is
self-defeating here in a way it wasn't in earlier eras.

### 2.8 Out-of-network + new-account cold start `[CODE]`
`oon_scorer.rs` multiplies out-of-network candidates by `OON_WEIGHT_FACTOR` (<1). **New accounts get a
preferential `NEW_USER_OON_WEIGHT_FACTOR`** if account age < threshold AND following ≥
`NEW_USER_MIN_FOLLOWING`. A genuine early-account advantage exists — and it requires you to *follow
enough accounts* to qualify.

### 2.9 Impression dedup `[CODE]`
`previously_seen_posts_filter`, `impression_bloom_filter`, etc. A post shown to a user and not engaged
with is suppressed from re-serving. **Each post gets limited bites at each viewer** — which is why
re-posting the same idea in different framings beats hammering one post.

---

## 3. Settled questions (stop believing the folklore)

| Claim | Verdict |
|---|---|
| "Reply = 13.5×, author reply-back = 75×" | **Dead.** 2023 constants, system replaced. `[CODE]` |
| "Premium gives 2–4× For You reach" | **False.** Zero `verified` hits in the repo; the 2023 blue multiplier was deleted, and it never applied to replies. X commits only to *"a slight preference for replies from verified accounts."* Premium buys **reply prioritization + rate-cap escape**, not For You reach. `[CODE]` `[OFFICIAL]` |
| "Links are deboosted by the algorithm" | **No deboost code exists.** Bier, 2026-04-22, verbatim: *"there is no code that is deboosting links."* The effect is **emergent** — the browser overlay covers the post, people forget to engage, the model sees no positive signal. Practical advice unchanged (keep links out of main posts) but the mechanism is engagement suppression, not a penalty. `[CODE]` `[OFFICIAL]` |
| "X downranks AI-generated content" | **Unsupported.** X *computes* a `slop_score` (`banger_initial_screen.py`) but grepping `home-mixer/` for `slop`/`banger` returns **zero matches** — the published ranker never consumes it. X's posture is **anti-bait and anti-plagiarism, pointedly not anti-AI.** `[CODE]` |
| "First 30 minutes is the critical window" | **Folklore as stated.** No early-velocity term in the pipeline. A plausible mechanism exists (early counts are candidate features) but **no source establishes 30 minutes or any half-life.** `[FOLKLORE]` |
| "Thread completion rate is a ranking signal" | **Not in the 19 heads. No code evidence.** `[FOLKLORE]` |
| "Optimal posting time is X o'clock" | **Unverified.** No primary source with methodology found. `[FOLKLORE]` |

---

## 4. Hard constraints & enforcement

- **Rate limits:** free accounts ~**50 original posts + 200 replies/day** (from ~2026-05-17; established
  by diffing help-page snapshots, **no official announcement** — treat as strong secondary). Premium
  exemptions inferred, not stated.
- **Engagement bait — 3 strikes.** Bier, 2026-07-16, verbatim: *"Soliciting engagements ('I'll follow
  everyone who replies') 3 or more times will results in removal from the program and your account will
  be forwarded to the policy team for suspension."* `[OFFICIAL]` **Never ask for engagement. Ever.**
- **Plagiarism enforcement is live:** 1.5M stolen posts flagged; ~4,000 accounts removed from rev-share
  in a day. Being the **original uploader** is what protects you — not being human.
- **Visibility filtering ("shadowban") persists:** `safety_labels`, `visibility_reason`,
  `brand_safety_verdict`, `vf_filter.rs` drops on `Action::Drop(_)`. Policy definitions unpublished.
- **X Communities were shut down** (announced 2026-04-23, effective 2026-05-06) — <0.4% of users but 80%
  of spam/scams. Migrated to **XChat group chats**. Note `share_via_dm` is a positive head, so private
  sharing now feeds public reach.
- **API link posting went $0.01 → $0.20** on 2026-04-22 (~1,900%).

---

## 5. What nobody can verify (don't let anyone sell you these)

- Any 2026 numeric weight (params withheld — likely permanently).
- Grok classifier rubrics: what counts as a "banger," as spam, or as a quality reply.
- Quantified link-penalty figures ("50–70% less reach") — no traceable methodology.
- Time-of-day and optimal-frequency data.
- Whether TweepCred (author reputation PageRank) still runs — it was a separate offline job, outside
  this repo's scope. **Absence from the repo is not proof of removal.**
- Community Notes reach/monetization effects.

⚠️ **The repo has not been updated since 2026-05-15**, despite a pledged four-week cadence. Anything
after that date is inference. Re-check `github.com/xai-org/x-algorithm` before relying on this file
for anything load-bearing.
