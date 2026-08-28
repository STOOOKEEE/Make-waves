# 05 — Facts (the only place claims come from)

**Rule: if it isn't on this page, don't post it.** Not "check with someone" — just don't.
Making stuff up is how a growth account turns into a liability account.

---

## The one-liner

**Tide is a paper-trading arena. Fake money, real prices, real bragging rights. You compete against
other humans and against AI agents people built.**

## Paper trading

- **$10,000** in virtual capital. Instantly. No deposit.
  (`PAPER_STARTING_EQUITY`, `packages/core/src/constants.ts`. Valued in RLUSD internally — say
  "dollars", never mention the quote currency.)
  > ⚠️ **The old brand pack said $100,000 and it was wrong.** That figure only exists in the
  > competition **display catalogue** (`apps/web/src/data/competitions.ts`), which is seed/demo data.
  > If you see $100k anywhere in an old draft, it's a bug. Individual competitions may advertise their
  > own starting capital — that's per-competition, not the account default.
- ❓ **Account reset: no reset mechanism appears in the codebase** (searched 2026-07-21). So the honest
  answer to the very common *"what happens if I blow it all up?"* is: **we don't currently know of a
  reset, ask us and we'll find out.** Say that — it's a real answer and it's the kind of question the
  reply surface exists for. Do **not** imply you can start over until someone confirms it.
  (The voice file's "blow up an account without blowing up your life" is safe — it's about
  consequence, not about resetting.)
- Trades run on **real, live market prices** across the **top 250** markets. The prices are real. The
  money is not.
- **Spot** and **perp**, **market** and **limit** orders, optional **take-profit / stop-loss**.
- Perp is a **simulation**. Leverage goes up to **100x**, margin is **isolated**.
  - No borrowing, no counterparty, nothing to liquidate in the real world.
  - A position **can't lose more than its margin** — P&L is floored at −margin when it closes.
  - Fees used in-product: **maker 0.02% / taker 0.06%** (simulated, for realism).
- Chart timeframes: **5m / 15m / 1H / 4H / 1D**.
- ⚠️ TP/SL and limit orders are **client-side triggers** — the tab has to stay open for them to fire.
  Never imply they're guaranteed.

## Competitions

- Tournaments and seasons with a **leaderboard**. You're ranked on paper performance.
- **Humans and AI agents compete in the same arena, on the same leaderboard.**
- Ties **split the pot** poker-style (tied players mutualize the tiers they occupy).
- What we talk about: **rank, streaks, standings, getting cooked, bragging rights.**
- What we don't talk about: entry economics, prize money, anything financial. Not our story. See
  the never-say list below.

## AI agents

- You can plug an AI agent into Tide and it trades **the same rails a human uses** — around **20 tools**
  (market data, portfolio, orders, positions, competitions, leaderboard).
- Works from **Claude Desktop, Cursor**, or any MCP client — and there's an **in-Tide chat agent** too.
- You scope your agent with a **mandate**: max capital, max daily loss, max trades/day, max leverage,
  allowed pairs, declared style (momentum / mean-reversion / DCA / grid / mixed), expiry.
- The **server enforces every limit before every trade**. The agent can't talk its way past it. No
  "advanced mode."
- **Kill switch**: kill the agent → it stops, its mandates are revoked, every further call fails.
- Every action is **logged** — tool, params, result, timestamp.
- Bring your own model. Any Anthropic-compatible endpoint works, tool-use included.

> **How to weight this:** agents are *how it works*, not *what it is*. Lead with the arena and the
> competition. "MCP" is at most one clause in a bio — never a headline. (Research backing:
> `.claude/skills/x-growth/references/niche-crypto-ai.md`.)

## Tide School

- **16 lessons**, bilingual FR/EN, across **4 tracks**: Basics · Perps & leverage · Strategies ·
  Tide & competitions.
- Contextual "?" hints sit right on the trading controls and link to the matching lesson.

## Badges

- Earned **free**, from what you actually do in paper (e.g. `first_trade`, `ten_trades`,
  `first_competition`, plus a weekly one for staying active).
- Treat them as **status and streak mechanics**. That's the interesting part.
- ⚠️ **Trap.** The badge feature has a second half in the codebase — claiming them on-chain, which
  needs a wallet signature. **That half is on the never-say list.** If you go read `CLAUDE.md` you'll
  find it and it will look postable. It isn't. Badges are an off-chain status mechanic and nothing
  more, for our purposes.

## Access

- **No deposit. No KYC.** You can play paper with an anonymous identity.
- Live at **tidetrade.xyz**. Org signature: **TIDE LABS**.
- **The X account is [@tidetradexyz](https://x.com/tidetradexyz).** This is the handle everything in
  `growth/` is written for — a product handle, which is why we write in "you" and never "i"
  (`02-voice.md` § Person).
- Built for the **Make Waves** hackathon. Background context only — useful as credibility if someone
  asks who we are, never a talking point, never a tagline, and never a reason to start talking about
  blockchains.

---

## NEVER SAY

Not "be careful with" — **never**. These are either false or off-story:

| Don't say | Why |
|---|---|
| real trading, live trading, swaps, execution on a DEX | We don't do it. Full stop. |
| on-chain settlement, SourceTag, XRPL transactions, volume | Not our story. |
| wallet, connect your wallet, non-custodial, Xaman, GemWallet | Not our story. |
| deposit, withdraw, funds, capital at risk, real money | There is none. |
| returns, profit, gains, "make money", ROI, yield, APY | We are not a money product. Ever. |
| "your agent grows your portfolio" / any agent-makes-money implication | Hard no. |
| **"risk-free"** | Prohibited-adjacent in financial promotion. Say "no real money" or "fake money" instead. |
| financial advice, signals, calls, "this is going to pump" | Not our lane. |
| buy-in, prize pool, rake, entry fee, tournament economics | Off-story. Don't go there. |
| specific traction numbers (users, signups, conversion) | Hands cloners the playbook. |

**Careful with:** competition pots and player counts shown on the landing are **seed/demo data**.
Never cite them as real traction.

## The simulated-numbers habit

Every number that comes out of Tide is simulated. Say it once, casually, near the number — not as a
legal block at the bottom.

✅ `+312% on the week (paper money, calm down)`
✅ `this is fake money btw. the pain is real though`
❌ `*Past performance is not indicative of future results. Simulated results have inherent limitations.*`

The one that actually matters: **never aggregate paper results into a claim about Tide itself.**
"Our top trader did +400%" reads as a performance claim. "this guy did +400% and I'm not okay" reads
as a leaderboard moment. Same number, completely different thing.
