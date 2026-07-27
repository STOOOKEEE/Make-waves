# Memes & shitposting — craft

Voice and register live in `growth/context/02-voice.md`. This file is about the **format**: when a meme beats
a text post on X specifically, and how to make one that doesn't die.

---

## 1. When a meme is the right call

Text-only posts have the highest median engagement in an 18.8M-post study `[STUDY]`, and that finding
holds. So the bar for adding an image is: **the image has to be the argument.**

**Meme wins when:**
- The joke is visual and doesn't survive as text
- We're screenshotting something real (agent log, leaderboard, a genuinely stupid position) — this is
  our best raw material and nobody else has it
- A format is peaking *right now* and we have a genuinely native use for it
- The point is a number, and the number wants to be huge on a dark panel

**Text wins when:**
- The joke is a sentence. Don't illustrate a sentence.
- You're reaching for a meme because you have nothing to say. Readers can tell instantly.
- It's a reply. Image replies mostly underperform text replies and read as low-effort.

**The honest default: text-first, meme when the meme earns it.** An account that memes constantly
becomes a meme account, and meme accounts convert badly — the follows are for the format, not the
product (`replies.md` §6 on the conversion trap).

## 2. It has to work with zero context

A meme travels. By the time it lands in front of someone, our bio, our pinned post, and the thread
above it are all gone.

- **Nobody knows what Tide is.** If the joke requires knowing, it dies at the first repost.
- **Nobody knows the product's vocabulary.** "mandate", "the arena", "paper mode" mean nothing cold.
- **Best case:** the meme is funny to a stranger *and* makes them curious what app that screenshot is
  from. That's the whole trick — the brand rides along in the screenshot, not in the punchline.

Test: show it to someone who's never heard of us. If they need one sentence of setup, rewrite it.

## 3. Screenshots are the format

Our unfair advantage. Real product surfaces are funnier than anything we could design:

- **Agent logs.** A bot reasoning out loud and then doing something stupid is free content.
- **Leaderboards.** Rank + handle + absurd number. Built to be quote-tweeted.
- **Positions.** A 100x position on something ridiculous. `-97%` in mono type.
- **Error states.** A guardrail blocking a bot that tried something insane is a joke and a product
  demo in one image.

Craft rules:
- **Crop tight.** Dead UI space kills it. One thing per image.
- **Legible at thumbnail size** — that's the only size most people see.
- **Dark mode.** Always. It's the brand and it screenshots better.
- **Never fabricate.** Never fake a number, never mock up a screenshot that isn't real. Being the
  original source is the entire moat, and it's also what keeps us out of the plagiarism enforcement
  bucket (`guardrails.md` §3).

## 4. Borrowed formats

Meme templates are shared culture — using one is fine. Reposting someone's *finished* meme as ours is
not: X's plagiarism enforcement is live and removed ~4,000 accounts from rev-share in one day. Being
the original uploader is the protection.

- Use the **template**, make our own version. Never repost the output.
- If a format is everywhere already, we're late. A stale format makes the account look like it's run
  by someone studying memes rather than someone who's just online.
- **Don't force brand elements into the frame.** A meme with a logo slapped in the corner is an ad and
  reads as one. Let the screenshot inside do the branding.

## 5. Alt text

Write it. Two reasons, both practical: accessibility, and it's indexed text on an otherwise
text-free post. Describe what's in the image plainly — don't repeat the joke, don't stuff keywords.

## 6. Failure modes

| Failure | What it looks like | Fix |
|---|---|---|
| **Forced meme** | Format doesn't fit the point; the joke is "we used a meme" | Post the sentence instead |
| **Dead format** | Peaked months ago | Check what's actually circulating today |
| **Explained meme** | Caption explains the image | Cut the caption |
| **Brand-compliant meme** | Looks designed, on-brand, clean | Memes aren't design work. Rough is correct |
| **Inside baseball** | Only funny if you use Tide | Rewrite for a stranger |
| **Stolen** | Someone else's image reposted | Make our own version |
| **Punching down** | Joke lands on someone's real loss | See `growth/context/02-voice.md` hard limits — hard no |

## 7. The gate

Before any meme ships, run the full gate at the bottom of `growth/context/02-voice.md`. Plus one extra:

**Would this be funny if it came from an account with no product to sell?** If the humor depends on us
being a brand doing a bit, it isn't funny — it's an ad wearing a meme.

---

## 8. Concepts we can run **today** (no product data needed)

The four data-dependent series (`growth/context/04-content-engine.md`) are the best memes, but they're
blocked on live data. These aren't — they're **text-native or self-screenshot formats** that work now,
in voice, and most double as the "enemy" or "today" quota. None require a fabricated screenshot (banned).

### A. The two-panel (text)
The oldest structure on the timeline: expectation vs reality, them vs us, before vs after. Two lines,
a hard turn between them. Ours writes itself because paper-vs-real-feeling *is* a two-panel.
```
what you think paper trading is: chill practice mode
what it actually is: awake at 3am furious about money that isn't real
```
```
their arena: 12 bots losing to each other in a spreadsheet
ours: 12 bots and one guy who can still panic
```
*(second one = the enemy quota, names a genre not a competitor.)*

### B. The definition (Explain-It-Badly as a format)
`term: the brutally honest one-liner`. Already our highest-quotability shape. As a "meme" it's a
screenshot of your own clean one-liner tweet — legible at thumbnail, quotable, no image needed.
```
dollar cost averaging: being wrong on a schedule
liquidation: the exchange informing you your position is now its position
"diamond hands": a stop loss you forgot to set
```

### C. Which-one-are-you (the QT engine)
A numbered taxonomy people sort themselves into. Highest quote-tweet-per-effort format that exists —
the natural reply is "i'm 3" or "@friend this is you." Ship as text; upgrade to a clean 4-quadrant
image once there's a visual signature.
```
four kinds of paper trader
1. treats it like real money, learns everything
2. treats it like a video game, learns nothing, has fun
3. was going to be #1, became #2 by tuesday
4. hasn't placed a trade, has 6 open charts
```

### D. The fake-confidence bit
Trading twitter's dominant register is unearned certainty. Mirror it flatly and it reads as satire
without a single mean word.
```
my strategy is called "it'll bounce" and it is undefeated until it isn't
```

### E. The self-screenshot callback (continuity engine)
Screenshot a past tweet of ours and react to it. Builds the running-joke/continuity the account
structurally lacks (`02-voice.md` §"same object"). Costs nothing, reads as a person, not a calendar.
```
[QT of our own "it'll bounce is undefeated" tweet] it did not bounce
```

### F. Reaction-image (borrowed template, our text)
A widely-current reaction image (verify it's current — lateness is failure mode #1) with a trading
caption. **Use the template, never someone's finished meme** (§4, plagiarism enforcement is live).

**Ranking for us:** C and E are the ones nobody else can copy well and that build what we're missing
(QTs + continuity). A and B are reliable filler. D is easy and ages fast. F is highest-risk (lateness,
plagiarism) — use sparingly.

⚠️ Every one still passes the gate: in voice, no fabricated data, no real-loss punch-down, and it must
land for a stranger who's never heard of Tide.
