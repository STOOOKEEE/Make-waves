# Getting real data into posts — the #1 unblock, scoped

Every audit says the same thing: the account reads as "commentary on trading in general" because it
has no live product data, so it can only post timeless aphorisms. This file turns that from a vague
"someone should wire it up" into exactly what exists and what's missing.

**Codebase scoped 2026-07-24. Verdict: most of it already exists behind the admin token.** This is
much closer than "a small engineering task."

---

## What unlocks which series

| Series (currently BLOCKED) | Needs | Status |
|---|---|---|
| Humans vs Bots | leaderboard split by human/agent | ✅ **already exists** — `/admin/overview` |
| Leaderboard Drama | standings, PnL, ranks | ✅ **public** — `/leaderboard` |
| Bot Diary | an agent's action log | 🟡 **one thin admin route away** |
| Worst Trade of the Week | biggest loss on the board | ✅ derivable from `/admin/overview.users[]` |

---

## 1. Humans vs Bots + Leaderboard Drama — ready now

`GET /admin/overview` already returns the labelled split in one call. Needs `TIDE_ADMIN_TOKEN` (the
same one the read-only admin console uses — Armand has it).

```
curl -s https://api.tidetrade.xyz/admin/overview \
  -H "x-admin-token: $TIDE_ADMIN_TOKEN" | jq '{split: .totals.bySegment, board: .users}'
```

- `totals.bySegment` → counts of `operator` / `agent` / `frontend` → the **humans-vs-bots scoreboard**.
- `users[]` → `{userId, segment, equity, pnl, orders, positions, rank}` → the leaderboard **with the
  human/agent label attached**, so "bots hold 6 of the top 10" becomes a real, postable fact.

Public fallback with no token (rankings only, no segmentation): `GET /leaderboard`.

**Postable today, if someone runs that curl and hands over the numbers:**
> the top of the leaderboard this week is [N] bots and [M] humans. [the split, reacted to like sport]

⚠️ Still obeys `05-facts.md`: post the *real* split, never an invented one. And per `guardrails.md` §5,
show the denominator — mid-table and losers, not only the winners.

## 2. Bot Diary — ✅ route written, awaiting review + deploy

The data is fully captured. Table `agent_actions`
(`apps/api/src/store/sqlite-agent-actions-store.ts`), record shape:

```ts
{ id, agentId, userId, toolName, toolParams /*JSON*/, result /*JSON|null*/,
  error /*string|null*/, idempotencyKey, executedAt /*epoch ms*/ }
```

The existing `GET /api/agent-actions?agentId=…` is JWT + owner-scoped, so a post-writer can't pull an
arbitrary agent's log. **The admin-gated wrapper is now written** — branch
`feat/admin-agent-actions-for-growth`, ~40 lines across `server.ts` + `guard.ts`, with tests:

```
GET /admin/agent-actions?agentId=…&limit=…   (guard: x-admin-token, same as /admin/overview)
  → actionsStore.listByAgent(agentId, limit)   // returns AgentAction[], newest first
```

⚠️ **Not deployed.** It's on a branch, typechecks, 414 API tests pass, lint clean. Someone with deploy
access reviews and ships it (same pipeline as any API change). Once live:

```
curl -s "https://api.tidetrade.xyz/admin/agent-actions?agentId=<id>&limit=50" \
  -H "x-admin-token: $TIDE_ADMIN_TOKEN" | jq '.[0]'
```

Then Bot Diary posts write themselves from `{toolName, toolParams, error, executedAt}`:
> capped it at 3x. `toolParams` says it asked for 10x, `error` says the server said no, next record
> says it opened exactly 3x. not smarter than the rules, just faster at finding out

## 3. The one genuine gap (only if you want it)

Guardrail rejections have **no first-class `status`/`reason` field**. A "the bot tried to exceed its
limit and got blocked" post has to be reconstructed by parsing the `error` string of a `result:null`
record — and only if the MCP layer actually wrote a record on that rejection, which isn't guaranteed
for every guardrail trip.

For *reliable* structured "blocked action" facts you'd add a `status` / `rejectionReason` column and
make guardrail trips always record. That's a real (small) product change — **not needed to start.**
The Bot Diary material works off successful actions and the occasional error record we already have.

---

## The ask, in one line

**Give the post-writer the `TIDE_ADMIN_TOKEN` (unblocks §1 today), and review + deploy branch
`feat/admin-agent-actions-for-growth` (unblocks §2 — the code is written and tested, not shipped).**
That converts the account's four highest-ceiling, currently-dead series into its default material —
which every audit says is the single highest-impact change available.
