# `log/` — what we actually did

`context/` is what we believe. **This is what happened.** Four files, all append-only, all meant to be
edited by hand in ten seconds.

| File | What goes in it |
|---|---|
| [`daily.md`](daily.md) | **The runsheet. Open this each day** — the whole loop on one page. |
| [`queue.md`](queue.md) | Approved, not posted yet. Today's batch lives here. |
| [`posted.md`](posted.md) | Shipped, with date + link. The archive. |
| [`targets.md`](targets.md) | The reply target list. Tier A / B / C. |
| [`learnings.md`](learnings.md) | What worked, what died, what to stop doing. |
| [`data-access.md`](data-access.md) | How to get real product data into posts — the #1 unblock. |

---

## Why this exists (read before writing posts)

**Check [`posted.md`](posted.md) before drafting.** Two reasons, both real:

1. **Repetition is invisible from the inside.** Without an archive nobody can tell whether a joke is
   fresh or the fourth version of it. `context/04-content-engine.md` asks for a staleness check every
   few weeks and this is the only thing that makes it possible.
2. **Four of our nine series are locked** behind missing product data, so the daily engine runs on
   three shapes. That's exactly the situation where you unknowingly repeat yourself.

**Also check [`learnings.md`](learnings.md)** if you're about to make a judgment call the account has
already made once.

> **When it's fine to skip both:** a single reply, or a fast news reaction where the window matters
> more than the archive. Don't turn a 10-second check into a ritual — the point is to avoid repeats,
> not to file paperwork.

## How to use it

**Drafting** → write into `queue.md`, marked `PROPOSED`.
**Eli approves** → flip to `APPROVED` (that's the only signal that a post may ship).
**Posted** → move the line to `posted.md`, add the date and the URL.
**Something notable happens** → one line in `learnings.md`.

Nothing is deleted. A killed draft moves to `posted.md` marked `KILLED` with the reason — knowing what
we rejected is as useful as knowing what we shipped.

## Rules

- **Never ship anything not marked `APPROVED`.** The queue is a proposal, not a schedule.
- **Never invent performance numbers.** Leave the field blank until someone reads the real ones.
- Keep entries short. A log nobody maintains is worse than no log, because it looks current.
