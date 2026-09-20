# Tide pitch: storyline, arguments and honesty rules

> Synthesis of the six research memos in `research/` (2026-09-16). This is the brief the deck (`tide-pitch-deck.html`) is built from. If a slide and this document disagree, fix the slide.

## The one sentence

**The XRP Ledger has the exchange. Tide brings the traders.**

Thesis that every slide points back to: **every simulator stops at the simulation. Tide's ends on the ledger.**

## Who the deck must convince, and with what

| Audience | What they judge | What wins |
|---|---|---|
| Make Waves jury (XRPL Commons) | Live on mainnet, real users, real on-chain volume. 25,000 of the 50,000 XRP is a jury decision on "best overall project". | A product the ledger visibly needs, built on native primitives, with every learner turning into a funded, tagged XRPL account. |
| Investors (seed / Aquarium) | Problem, why now, market, business model, moat, team. | A funnel with unit economics, a revenue engine already proven elsewhere (funded-trader evaluations, perp venues), and a vision ladder whose every rung sits on production code. |

## The five load-bearing arguments

1. **The gap is people, not infrastructure.** XRPL runs 2.44 M transactions a day and settles in seconds, has a native order book, an AMM and a $2.4 B stablecoin, and only 1,111 accounts trade on its order book per day, down 40 % in a year. No project brings it traders.
2. **The simulation has consequences.** Every other simulator ends at a score or at "deposit here". Tide's ends on a funded XRPL account, a soulbound proof of first trade, prizes paid on the ledger, and (H1 2027) real capital under server-enforced risk rules.
3. **Funded onboarding is the trick, and only this ledger makes it affordable.** An account exists at 1 XRP of reserve; Tide creates, encrypts and funds the learner's first account for about 1.2 XRP (about $1.55). Nearly all of it stays in the learner's balance. Robinhood's best CAC was $15; Coinbase pays $10 per referral. Every learner becomes an XRPL account: the hackathon metric, by construction.
4. **One rule book for humans and AI agents, enforced by the server.** 20 MCP tools, a signed mandate (max capital, daily loss, trades per day, leverage, pairs, expiry), a kill switch, one leaderboard. The same guard becomes the funded-trader evaluation.
5. **The business lives in the venue.** No fee on spot. Tournament rake now, classrooms and hosted competitions and the AI coach next, evaluations in H1 2027 (FTMO made $329 M on evaluations in 2024), then the Tide DEX (Hyperliquid made $844 M on perp fees in 2025).

## Narrative arc (12 slides, v5 "VC mode" of 2026-09-16)

Each slide carries a big section word (Problem, Insight, Product, The unlock, Why now, Market, Business model, Why we win, Vision, Where we are) and one assertion.

Cover ("Learn to trade. Prove it. Get funded. On the ledger.") → Problem (a generation learns by losing; zero simulators lead anywhere) → Insight (every simulator stops at the simulation; Tide's ends on the ledger) → Product (Learn. Prove. Trade.) → The unlock (a funded XRPL account per learner at $1.55; the six-step wall versus one click; Robinhood CAC $15) → Why now (1,111 daily DEX traders, RLUSD $2.38 B, Hyperliquid $844 M) → Market (741 M → 150 M → 15 M → 300 k; SAM about $180 M a year; the two end states: FTMO $329 M, Hyperliquid $844 M) → Business model (five lines with unit economics; about $1.4 M ARR at 60,000 monthly actives in 2027 before any DEX fee) → Why we win (three unfair advantages; the corpus compounds) → Vision (every trader on XRPL starts on Tide; the ladder to TideTrade, each rung on code that exists) → Where we are (live on mainnet after 90 days; what the next 180 buy; the ask in the speaker notes, amount to be set by Eli) → Closing (the XRP Ledger has the exchange; Tide brings the traders).

No names or roles anywhere in the deck. No source footers, no appendix (all in `research/`).

## Honesty corrections applied (the deck differs from the roadmap page on purpose)

| Roadmap page / PITCH.md says | Code and production say | Deck says |
|---|---|---|
| Prediction markets, present tense | No code exists (grep finds only prose) | "Next, Q4 2026". Flip to present only if it ships before 21 Sept. |
| Funded onboarding 2.22 XRP, two wallets, AccountDelete | `main` funds one wallet with 1.21 XRP and mints the NFT into it | "About 1.2 XRP, the base reserve plus the NFT page", one account, no AccountDelete on the slide |
| 19-step tutorial | 33 steps | 33 steps |
| Perps up to 100x | Engine validates 100x, terminal slider stops at 20x, no automatic server liquidation | "Perpetuals with leverage up to 20x, isolated margin, loss capped at the margin" |
| First cash-prize competition open | One competition live, 0.001 XRP tickets, 0.055 XRP pot | "First on-chain-ticketed competition running; prize paid in XRP on the ledger". Fund a real pot before the demo or do not say "cash prize" out loud. |
| Humans and agents ranked together | True by design; no agent row visible in prod data | "Same rails, same leaderboard" |
| 1,213 tests | 1,224 tests, 158 files | 1,224 |

Also: the roadmap page (`#/roadmap`) is merged but not deployed (production is the 27 Aug build). Redeploy before the jury opens the link.

## Copy rules (non negotiable)

No "risk-free". No promise of gains. No Tide traction number (users, volume, entrants). Never "prop firm" (say funded traders). No em dashes. Every external number carries a source and a date on the slide.

## Sources shortlist used on slides

See `research/02-market-business.md` section 7 and `research/03-xrpl-why-now.md` "Numbers we can use on a slide". Every figure on a slide is High or Medium confidence there; re-verify the Messari and Evernorth Q2 2026 figures against the primary reports before printing.
