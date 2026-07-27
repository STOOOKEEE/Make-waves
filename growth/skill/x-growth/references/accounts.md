# Account setup, operating rhythm, and measurement

---

## 1. The profile is a landing page

Every reply you write has one job: make a stranger click your name. What they land on decides whether
that click becomes a follower, and whether that follower becomes a user. `profile_click` and
`follow_author` are both explicit positive heads in the ranker `[CODE]` — the profile is *inside* the
optimization loop, not outside it.

**Our account: [@tidetradexyz](https://x.com/tidetradexyz).** A product handle, not a founder handle —
which is why everything is written in second person (`growth/context/02-voice.md` § Person).

⚠️ **Nobody has audited the live profile yet.** Bio, pinned post and existing posts are unknown to this
pack — X blocks automated reads, so it needs a human or a browser session. Until then, treat the bio
and pinned-post guidance below as *proposals*, not as a description of what's up there now, and
backfill anything already posted into `growth/log/posted.md`.

**Handle & display name.** Searchable, spellable, stable. If the product is the brand, the product name
belongs in the display name.

**Bio.** You have **160 characters** — that's two short lines, not three. The common "what you do /
why you're credible / what to do next" template is imported from LinkedIn and doesn't fit; trying to
hit all three produces a cramped bio that does none of them.

**Prioritise, in this order:** (1) what this is, in plain words a stranger understands, (2) the one
detail that makes it credible or funny. Drop the CTA — the profile link and pinned post already carry
it, and a "join now" in a bio spends ~20 characters on nothing.

State the category plainly so both humans and the topic classifier can place you (`topic_ids_filter`
hard-drops off-topic candidates — topical legibility is a distribution mechanic `[CODE]`). Concrete
beats vague, and concrete *and* funny beats both — the bio is where the voice has to land in about
three seconds (`growth/context/02-voice.md`).

**Worked example (156 chars — count it again before shipping; an earlier draft of this file claimed
157 for a string that was actually 161, i.e. over the limit):**
> paper-trading arena. $10,000 in fake money, real prices, a leaderboard for humans and the bots they
> built. nothing real except your rank. no deposit, no kyc

*What it does: names the category in the first two words, gives the concrete number, states the
differentiator (humans vs bots), lands the pitch as a joke, and removes the two biggest objections
last. No CTA. Link goes in the profile URL field, where it costs nothing.*

**Pinned post.** The single highest-leverage asset you control, and it should be your best
**demonstration** — not an announcement. Replace it whenever something better exists.
Until real product data exists, an announcement is the honest placeholder; **swap it for a real
leaderboard or agent-log screenshot the day one is available.** That swap is a scheduled task, not a
maybe. ⚠️ No sourced research exists on pinning strategy specifically — this reasons from the
profile-click mechanic, it isn't an evidenced tactic.

**Link.** One, in the profile field — where it costs you nothing (the link suppression in `posts.md`
applies to post bodies, not profile fields).

---

## 2. Founder account vs brand account

> **Tide today: one brand handle ([@tidetradexyz](https://x.com/tidetradexyz)), written in second
> person — "you", never "i".** It's the app's account, not a person's. There is no founder account, so
> the split below is contingency planning, not a current instruction. The voice decision is settled in
> `growth/context/02-voice.md` § Person and it wins — do not read the "practical split" below as a
> reason to change how this account is written.

Evidence here is thinner than the confident advice around it suggests. What's defensible:

- **Mutual-follow graph overlap is now a coded ranking signal** `[CODE]` `[OFFICIAL]`. Humans form
  mutuals with humans far more readily than with logos. This is a real, mechanism-level argument for a
  founder account carrying the growth load.
- Replies are where the reach is, and replies from a **person** land better than replies from a brand.
- ⚠️ "Founder accounts outperform brand accounts by X%" — **no credible study found.**

**Practical split:** the **founder account** does the reply work and the building-in-public narrative;
the **brand account** carries announcements, product surface, and support. The founder account is the
growth engine; the brand account is the record.

---

## 3. Topic coherence

`topic_ids_filter` **drops** off-topic candidates rather than demoting them, and the viewer side carries
`inferred_grok_topics` `[CODE]`. An account that posts coherently within a recognizable topic is
routable; one that scatters is not.

Pick **2–4 content pillars** and stay inside them. Wandering off-pillar isn't just off-brand — it's
structurally harder to distribute.

**Tide's pillars**, matching the series in `growth/context/04-content-engine.md`:

1. **Trading is absurd** — the jokes about markets, leverage, and the culture. Widest reach.
2. **Bots being bots** — agent logs, humans-vs-bots standings. Our most ownable material.
3. **Leaderboard & losses** — standings, worst trades, the emotional reality of fake money.
4. **Explaining things badly** — real trading concepts made funny and legible. Best saves.

Everything we post should be recognisably one of those four.

---

## 4. Operating rhythm

**Daily (~45–60 min)** — the reply block from `replies.md` §5: scan, 10–30 substantive replies spread
across the day, tend the graph. Spread them out: `author_diversity_scorer` decays your Nth item
exponentially within one feed render `[CODE]`.

**Posting cadence:** ⚠️ no verified optimal frequency exists `[FOLKLORE]`. What's verified: the free-tier
cap (~50 posts/200 replies per day) and that volume is mechanically decayed. **Post when you have
something worth a stranger's attention.** For most builders that's 1–2 posts/day, not 10.

**Weekly** — review metrics (§5), refresh the target list, plan the week's substantial posts.

**Never** — batch-blast replies, solicit engagement, or repost others' content as your own. Engagement
solicitation is a **3-strike suspension referral** `[OFFICIAL]`; plagiarism enforcement removed ~4,000
accounts from rev-share in a single day.

---

## 5. Measurement

Track **weekly trends on your own account**, never absolute benchmarks from strangers.

| Metric | What it tells you | Fix if bad |
|---|---|---|
| Impressions → profile visits | Are replies making people curious? | Reply quality / target selection |
| Profile visits → follows | Is the profile converting? | Bio + pinned post |
| Follows → signups | Is the audience the right audience? | Target selection (see below) |
| Mutuals formed / week | The compounding asset | More Tier-B graph work |

Reference points, all **self-reported, different sources, not comparable to each other** `[PRACTITIONER]`:
impressions→profile visits **1.1%–5.9%**; one full micro-funnel ran 16,828 impressions → 524 profile
visits → ~150 follows → 7 signups (**0.04%** impressions→signup).

**⭐ The trap to avoid:** reach and conversion move in **opposite** directions. A viral post that escapes
your niche converts terribly — one documented case: normal 4% signup→paid collapsed to **0.6%** (6.7×)
on a viral cohort, because it *"reached a much wider audience outside of my bubble."* Meanwhile an
in-niche launch post from the same founder drove **$22.7K in 7 days**. `[PRACTITIONER]`

**Optimize for the right 5,000 people, not the biggest number.**

**⚠️ Audit your denominator.** One founder measured ~2% signup→paid and assumed a product problem; the
real cause was bot list-bombing. After a targeted captcha the true rate was **8.5%** `[PRACTITIONER]`.
If conversion looks inexplicably bad — especially in crypto, where bot signups are endemic — suspect
the denominator before rewriting the product.

---

## 6. Premium — buy it, but for the right reason

**Buy it — for the rate cap.** `[OFFICIAL]` The free tier caps at ~**50 posts / 200 replies per day**,
which is a hard ceiling on a reply-led strategy, and Premium also buys **reply prioritization** (X
commits only to *"a slight preference for replies from verified accounts"*). That's a real mechanism
and it's reason enough.

**Do not expect a For You reach multiplier.** `[CODE]` `[OFFICIAL]` Zero `verified` references exist
in the ranking repo, and the 2023 blue multiplier was deleted and never applied to replies anyway.

⚠️ **The dramatic stat, and why not to lean on it.** `[STUDY]` Buffer's 18.8M-post dataset shows the
median engagement rate for non-Premium accounts reaching **0%** by late 2025. **Don't over-read it:** a
0% *median* means over half the non-Premium accounts in a large scrape got zero engagement, which
mostly describes a long tail of dormant accounts — not the marginal effect of subscribing. It's also
confounded by selection (accounts that pay try harder). Suggestive, not proof. Same treatment in
`growth/context/07-growth-system.md` §0; if these two files ever diverge on this, the cautious reading wins.

---

## 7. Platform notes

- **X Communities were shut down** (effective 2026-05-06) — <0.4% of users, 80% of spam. Migrated to
  **XChat group chats**. `share_via_dm` is a positive ranking head `[CODE]`, so genuine private sharing
  now feeds public reach. Group chats are a real surface; treat them as relationship infrastructure.
- **API link posting: $0.01 → $0.20** (2026-04-22, ~1,900%). Relevant if you automate.
- **X is anti-bait and anti-plagiarism, pointedly not anti-AI** `[CODE]`. X computes a `slop_score` but
  the published ranker never consumes it. Using AI to draft is not penalized; **being the original
  uploader is what protects you.** Don't launder other people's content.
