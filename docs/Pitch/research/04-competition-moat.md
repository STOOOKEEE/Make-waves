# Tide pitch research 04: competition and moat

> Research note for the Make Waves pitch deck. Written 2026-09-16. Every fact carries a source; anything not confirmed is marked UNVERIFIED. Figures come from public web sources and may be dated; re-check before printing a number on a slide. No traction figure for Tide appears here (rule `growth/context/05-facts.md`).

## 1. Competitor landscape

### (a) Paper trading simulators

| Player | What they offer | Scale and pricing | What they do NOT do |
|---|---|---|---|
| TradingView Paper Trading | Virtual account on every plan including free, $100,000 virtual balance, stocks, futures, crypto via broker feeds | TradingView claims 100M+ users, about 20M monthly users and 268M monthly visits (figures cited by third-party reviews; treat the 20M as approximate) | No on-chain settlement, no funded path, no leverage perps engine of its own, the paper account is a feature not a product |
| Investopedia Simulator | $100,000 virtual cash, stocks, options, crypto, public games and private leagues, tied to Investopedia articles | Free, ad-funded | Data is delayed 15 to 20 minutes, no watchlist, dated UI, no path to real trading |
| eToro Virtual Portfolio | $100,000 demo credited to every eToro account, same UI as live | eToro claims 40M+ registered users overall | The demo exists to convert to eToro deposits; no competitions with cash prizes, no on-chain proof |
| Binance Futures Mock Trading | Testnet with USDT perps, 233+ pairs, up to 125x, 3,000 USDT starting balance | Free for Binance Futures account holders | Requires a Binance account (KYC), no education, no leaderboard, score has no consequence |
| Bybit Demo Trading | Demo inside the main platform, 50,000 USDT plus USDC, BTC, ETH credited automatically | Free for Bybit users | Same as Binance: conversion tool for the exchange, not a learning product |
| Wall Street Survivor | Stock simulator, monthly contests with small prizes, teacher tools | Free with premium tier; contests all year | Stocks only, no crypto perps, no on-chain output |
| MarketWatch VSE | Virtual stock exchange, games between friends | Free | Stocks only, minimal education |

Sources: [Coincub on TradingView paper trading](https://coincub.com/blog/tradingview-paper-trading/), [TradingView review with user figures](https://www.greatworklife.com/tradingview-review/), [Investopedia simulator review](https://stockmarketgame.net/investopedia-simulator-the-ultimate-review), [eToro demo account](https://www.etoro.com/trading/demo-account/), [Binance mock trading FAQ](https://www.binance.com/en/support/faq/how-to-access-mock-trading-in-binance-futures-b3706b248f2b4b1caabb4bf253bf067f), [Bybit demo FAQ](https://www.bybit.com/en/help-center/article/FAQ-Demo-Trading), [Wall Street Survivor contests](https://www.wallstreetsurvivor.com/stock-game-trading-contest/).

Read-across: the simulator category is huge and free. Nobody wins by being "another simulator". The whole category shares one flaw: the simulation is a dead end. Either it ends when the game ends (Investopedia, MarketWatch) or it ends with "now deposit on our exchange" (eToro, Binance, Bybit).

### (b) Trading education

| Player | What they offer | Scale | What they do NOT do |
|---|---|---|---|
| Binance Academy | 500+ articles and videos, periodic learn-and-earn campaigns | Free; campaigns region restricted | No practice terminal, no track record, it feeds Binance |
| Coinbase Learn and Earn | Paid users small crypto rewards to watch lessons | Distributed over $150M in rewards to "millions" of users before being discontinued on 2025-05-27 | Ended. Proves learn-to-earn works as acquisition and proves it costs the platform real money per learner |
| Investopedia Academy | Paid video courses | Paid | No practice with consequences |
| Udemy trading courses | Thousands of courses, $10 to $200 each | Marketplace | No practice, no proof, quality unverified |
| YouTube gurus and Discord signal groups | Free content, paid "mentorships" | Enormous reach, no quality control | No verifiable track record for the teacher or the student |

Sources: [Coinbase vs Binance learn and earn](https://financefeeds.com/coinbase-learn-and-earn-vs-binance-learn-and-earn/), [Koinly learn and earn list](https://koinly.io/blog/learn-and-earn-crypto/).

Read-across: education without a terminal stays theory. Education attached to an exchange is a funnel to deposits. Tide's education ends in a terminal and the terminal ends on the ledger.

### (c) Trading competitions and leagues

| Player | What they offer | Scale | What they do NOT do |
|---|---|---|---|
| Bybit WSOT 2025 | Real-money trading competition, $10M USDT prize pool, zero entry barrier | 520,451 participants from 202 countries, 1,474 squads; Guinness record of 71,765 participants in 24 hours | Real money required, so beginners are the exit liquidity; no education, no simulated tier |
| Binance Futures Grand Tournament | Real-money futures tournament, up to $3M USDT in voucher rewards, solo and team | Recurring | Same: real money, rewards paid as trading vouchers that push more volume |
| OKX Global Trading Championship | 1M USDT in prizes, team based | Recurring | Same model |
| TradingView The Leap | Paper trading competition sponsored by brokers (CME, TradeStation, Pepperstone, AMP Futures) | 91,676 participants in the September 2026 AMP Futures edition; 59,187 traders and 3M+ trades in the CME edition; top prize $8,500, top 250 rewarded | Prizes are fiat or subscription months, sponsored by a broker who wants sign-ups; no on-chain settlement, no persistent track record |
| Trade The Pool, Wall Street Survivor contests | Small stock-only contests | Small | Stocks only |

Sources: [Bybit WSOT 2025 recap](https://www.bybit.com/en/learn/this-week-in-bybit/bybit-wsot-2025), [PR Newswire WSOT](https://www.prnewswire.com/apac/news-releases/bybit-reshapes-wsot-2025-with-10-million-usdt-prize-pool-zero-barriers-to-entry-302527784.html), [Binance FGT](https://www.binance.com/en/support/announcement/futures-grand-tournament-compete-in-the-medal-rankings-to-win-a-share-of-up-to-3m-usdt-in-rewards-e458868d8f214ad6b305d2869b3b72e9), [OKX GTC](https://www.okx.com/en-us/learn/global-trading-championship), [The Leap AMP Futures Sept 2026](https://www.tradingview.com/the-leap/amp-futures-september-2026/), [The Leap by CME winners](https://www.tradingview.com/blog/en/leap-by-cme-winners-announced-50889).

Read-across: the demand is proven and large. A paper competition with a modest prize pulls 50,000 to 90,000 entrants when a broker sponsors it. That is the exact format Tide runs, with two differences: the prize is paid on a public ledger into an account the winner did not have to open, and the entrant leaves with a track record that persists.

### (d) Funded-trader evaluations

| Player | Model | Scale | What they do NOT do |
|---|---|---|---|
| FTMO | Two-step evaluation (10% then 5% target), 80% to 90% profit split | About $329M revenue in 2024 (+53% YoY), about $62.5M net profit, 2.3M open accounts in 2024, 4.5M customers, $650M+ paid to traders since 2015 (all figures from third-party reporting of FTMO statements) | Forex and CFDs, simulated capital, no crypto-native settlement, no education worth the name, opaque pass rate (about 10% first attempt, UNVERIFIED) |
| Topstep | Futures combines, $85 to $199 per month per combine (May 2026 list pricing) | Large, private | Futures only |
| Apex Trader Funding | Futures evaluations, frequent 80 to 90% discount sales bringing a 50K evaluation to $33 to $50 | Large, private | Futures only |
| Breakout Prop | Crypto prop firm, launched 2023, acquired by Kraken in September 2025; 80% to 90% split; 20,000+ funded accounts and $38M+ paid out; payouts in USDC on Ethereum | Only crypto prop owned by a major exchange | Paid evaluation fee, no learning layer, no public on-chain track record, Kraken-centric |
| HyroTrader, Crypto Fund Trader | Crypto prop firms executing through Bybit API, mandatory stop-loss, consistency rules, 10 to 15 minimum trading days | Mid-size | Same: fee first, no education, exchange dependent |
| Hyperliquid user vaults | Copy vaults where a leader trades pooled USDC, depositors share profit | HLP roughly $184M to $269M in mid 2026 after a drop; user vaults smaller | Not an evaluation: anyone can open a vault, capital comes from depositors not the venue, no learning path |

Sources: [FTMO 2024 revenue](https://joinprop.com/prop-news/ftmo-posts-329-million-in-2024-revenue-as-prop-trading-reaches-institutional-scale/), [FTMO statistics](https://coinlaw.io/ftmo-statistics/), [Topstep pricing](https://proptradingvibes.com/blog/topstep-accounts-overview), [Apex vs Topstep](https://www.quantvps.com/blog/topstep-vs-apex-full-comparison), [Kraken on Breakout](https://www.kraken.com/learn/best-crypto-prop-firms), [Breakout rules](https://www.quantvps.com/blog/breakout-crypto-prop-firm-rules), [Hyperliquid HLP](https://www.datawallet.com/crypto/hyperliquid-hlp-explained).

Read-across: this is the business model that makes "the score has consequences" worth money. FTMO alone is a $300M+ revenue business on evaluation fees. The whole category charges the learner up front, publishes nothing verifiable, and sits under growing regulatory pressure. Tide's version inverts the order: learn free, prove on a public ledger, then the funded account. The evaluation is the graduation, not the storefront.

### (e) AI trading agents for retail, and XRPL-native trading UIs

| Player | What they offer | What they do NOT do |
|---|---|---|
| Coinbase for Agents, Coinbase MCP stack | Four MCP products in 12 months: Payments MCP (Oct 2025), Base MCP (May 2026), Coinbase for Agents (June 2026), Coinbase Advisor (June 2026, SEC and NFA registered adviser). Agents trade and pay through Coinbase with one login | Real money only, Coinbase and Base only, no paper tier, no mandate model exposed to the user, no humans-versus-agents leaderboard |
| Virtuals Protocol (Base) | Create and tokenise AI agents | Agents as tokens, not agents as traders under a mandate |
| MetaMask Agent Wallet, Hyperliquid agent SDKs | Agent wallets that trade across 25+ EVM chains and Hyperliquid | Infrastructure, not a venue with rules; real money only |
| Polymarket bots | Copy and arbitrage bots; 14 of the 20 most profitable Polymarket wallets are bots; about $40M extracted by arbitrage April 2024 to April 2025 | Bots against humans with no disclosure, no shared rules |
| First Ledger (XRPL) | Telegram trading bot, "the leading gateway to the native DEX on the XRPL", most of CLOB volume and trades go through it | A sniper bot for meme tokens; no education, no simulation, no risk rules |
| XPMarket, Sologenic, Magnetic X, Horizon (XRPL) | DEX front ends, AMM pools, token launches, NFTs | Built for people who already hold XRP and already trade; none funds a first account, none teaches, none runs paper |

Sources: [TechCrunch on Coinbase MCP](https://techcrunch.com/2026/06/11/coinbase-debuts-mcp-for-agent-trading/), [The Agent Report on Coinbase MCP stack](https://the-agent-report.com/2026/06/coinbase-mcp-agent-integration/), [OpenClaw MCP servers for traders](https://openclaw.direct/blog/best-mcp-servers-for-traders), [Finance Magnates on prediction market bots](https://www.financemagnates.com/trending/prediction-markets-are-turning-into-a-bot-playground/), [Messari State of XRP Q1 2026](https://messari.io/report/state-of-xrp-q1-2026), [First Ledger bot review](https://telegramtrading.net/firstledger-xrp-bot-review/).

XRPL market context (Messari Q1 2026, via search summaries, re-verify against the report): average daily CLOB volume of issued currencies $8.1M (+15.3% QoQ), average daily CLOB traders about 8,000 (+19.2% QoQ), average daily CLOB trades 735,900, average daily AMM volume $883,400 (down 31.4% QoQ), AMM contributors 182 per day. Bybit WSOT alone had 520,000 entrants. The gap between "XRPL has a DEX" and "XRPL has traders" is the whole thesis, and the numbers say it out loud: about 8,000 daily DEX traders on a ledger with a native order book, AMM and a dollar stablecoin.

## 2. Positioning: the whitespace

Feature matrix. A filled cell means the player does it as a product, not as a footnote.

| | Learn (free curriculum + guided practice) | Prove (paper with real instruments: spot, perps, prediction) | Cash-prize competitions | On-chain track record (persistent, public) | Funded path (earn real capital) | Own venue (settlement on a public ledger) | AI agents under the same rules as humans |
|---|---|---|---|---|---|---|---|
| TradingView | partial | spot, futures via brokers | yes (The Leap, broker sponsored) | no | no | no (broker hands off) | no |
| Investopedia | yes (articles) | delayed data | leagues, no cash | no | no | no | no |
| Binance / Bybit / OKX | academy | demo | yes, real money | no | no | yes, custodial CEX | no |
| eToro | academy | demo | no | no | no | yes, custodial broker | no |
| FTMO / Topstep / Breakout | no | evaluation only, paid | no | no | yes, fee first | no (execution via partner) | no |
| Coinbase for Agents | no | no | no | no | no | Coinbase | agents only |
| First Ledger / XPMarket / Sologenic | no | no | no | ledger history exists but is not curated | no | XRPL DEX | no |
| Tide | yes (16 lessons, 19-step sandbox) | yes (spot top 250, perps, prediction) | yes (XRP prize, paid on ledger) | yes (soulbound XLS-20 badges, funded account) | H1 2027 (evaluation reuses the mandate guards) | XRPL DEX today for spot; TideTrade v0 planned | yes (20 MCP tools, mandate, one leaderboard) |

Two-by-two that makes it visible on one slide:

- X axis: "the score has no consequence" (simulators, academies) to "the score pays real capital" (prop firms, exchanges).
- Y axis: "closed, custodial, private ledger" (CEX demos, prop firms) to "open, public ledger, credential you own".
- Bottom-left: Investopedia, TradingView, Wall Street Survivor. Bottom-right: FTMO, Topstep, Bybit WSOT, Breakout. Top-left: nobody worth naming. Top-right: Tide, alone. XRPL front ends sit at top-left-ish but with no learning and no competition.

Closest competitors and why they will not do it:

1. **TradingView The Leap** is closest in format (paper competition, big entrant numbers). It will not settle on a ledger or fund traders because its business is charting subscriptions and broker referral fees. The competition exists to sell broker sign-ups. Chain neutrality and broker partners forbid taking custody or paying on-chain.
2. **Breakout / Kraken** is closest in business model (crypto funded traders). It will not build a free school and a public on-chain track record because the evaluation fee is the revenue and opacity of pass rates is a feature of that model. It is also captive to Kraken.
3. **Binance / Bybit** have the crowd and the demo. They will not ship "learn, then prove, then get funded" because their metric is deposits and volume now; a demo that delays the deposit is a cost centre. They will never route a beginner to a public-ledger DEX they do not own.
4. **Coinbase for Agents** is closest on the agent side. It is real money only, Coinbase only, and treats the human as the account holder, not a competitor on the same board.

## 3. Moat: honest rating

| Candidate moat | Copyable? | Rating today | Notes |
|---|---|---|---|
| On-chain track record as an open credential (soulbound XLS-20 badges, funded account per learner) | Mechanism is copyable in weeks; the accumulated history is not | Medium now, strong with time | The value is in the corpus: every learner's first account, first trade, competitions won, all on one ledger, readable by any XRPL app. Nobody else on XRPL curates this. |
| Funded-trader outcome data (who passes, how, on which instruments) | Not copyable without running the funnel | Weak today, strongest long term | Prop firms sit on this data and never publish it. Tide would have it from lesson one through funded account. It is the underwriting model for "real capital on XRPL" in H1 2027. |
| Leagues and community network effects (weekly promotion and relegation, squads, shareable cards) | Format is copyable; the cohort is not | Weak today | Only becomes a moat once there are cohorts. Bybit proves squads work at 1,474 squads. |
| Classroom distribution (a teacher opens a class, every student gets a funded XRPL account) | Copyable by an education company, not by an exchange | Medium | Universities have used stock simulators for 15+ years. A class that produces XRPL accounts is a channel Ripple and XRPL Commons will actively want. Sales motion, not tech. |
| MCP-native agent layer (20 tools, mandate, kill switch, humans and agents on one board) | Coinbase shipped four MCP products in 12 months; the tool layer is copyable | Medium | Defensible part is the rule set, not the tools: server-enforced mandate, same guards for humans and bots, paper tier for agents. First on XRPL is a real claim. "First anywhere" is not. |
| XRPL-first with ecosystem support (SourceTag attribution, RLUSD, native DEX, XRPL Commons relationship) | Copyable by any XRPL team | Medium in the hackathon context | Real for the jury: the product is built entirely on mainnet primitives and every transaction is attributed. Not a moat against a well-funded competitor, but a head start in the ecosystem that is funding it. |
| Funded onboarding (Tide pays 2.22 XRP per learner, learner leaves with an account) | Copyable, costs money | Low as tech, real as positioning | It is the one thing no simulator and no prop firm does: the learner ends up on-chain without buying anything. It makes "every learner becomes an XRPL account" literally true. |

The three moat claims that hold up today, phrased without bullshit:

1. **"The only trading school whose diploma is an XRPL account."** Every learner leaves with a funded mainnet account, a soulbound proof of first trade, and competition results paid on the ledger. Simulators end at a score; Tide ends at an address. (Verifiable in code: `paper-wallet/claim`, XLS-20 mint, `AccountDelete` flow.)
2. **"One rule book for humans and AI agents, enforced by the server, not by the prompt."** Max capital, max daily loss, max trades, max leverage, kill switch, applied before every call for 20 MCP tools and for the in-app chat. The same guards become the funded-trader evaluation. (Verifiable: `@tide/mcp` guard, mandate tables.)
3. **"Built for the pipeline XRPL is missing: from zero to the native DEX without an exchange, a KYC or a purchase."** Not a claim about scale. A claim about a path that exists in production and that no CEX, prop firm or XRPL front end has an incentive to build.

Do not claim: first AI trading agents (Coinbase, Virtuals, Hyperliquid exist), largest anything, "risk-free", any user or volume number, "prop firm".

## 4. Risks a jury or VC will raise, with honest mitigations

| Risk | What they will say | Honest mitigation from the code and docs |
|---|---|---|
| Regulation of funded-trader programmes | ESMA preliminary inspections; FSMA (Belgium), CONSOB (Italy), CNMV (Spain) consumer warnings; Czech National Bank says some models need authorisation; ESMA statement of 2026-02-24 on novel leveraged products; EU converging on MiFID II perimeter | The funded stage is H1 2027 and is not the hackathon deliverable. Tide charges no evaluation fee today. Learning and paper are free and do not touch real money. When the funded stage ships it will be designed against MiFID II rather than around it, and the on-chain track record gives regulators something prop firms cannot: a public audit trail. Say "funded traders", never "prop firm". |
| Custody of prize pools and starter accounts | You hold keys | Prize pools sit on a multisig operator account (`SignerListSet`), exposure bounded to open pools, buy-ins low, tournaments short. Starter keys are AES-256-GCM under a versioned master key, decrypted in memory only to sign, wiped after `AccountDelete`, tombstone kept. Three separate keys: hot funder holding only the campaign budget, NFT issuer, cold recovery. Users with a wallet never give Tide a key. The DEX v0 (custodial clearing) is explicitly gated behind a legal framework. |
| Sybil and farming of funded accounts | 2.22 XRP per learner is a faucet | One address per paper session, wallets linked to one session share reward history, daily cap on external claims, total cap (`MAX_WALLETS`) and daily cap (`MAX_DAILY`) re-read from SQLite before each Payment, funder submissions serialised. Badge is soulbound. Real trade required before any mint. |
| XRPL DEX liquidity is thin | $8.1M per day CLOB, $0.9M AMM, 8,000 daily traders | That is the problem statement, not a bug in the plan. Live mode routes XRP/RLUSD (the deepest dollar pair) across book and AMM with a server-side slippage bound. The volume Tide sends is real user swaps, tagged; the volume bot is OFF by default and gated on an organiser answer about self-generated volume. |
| Dependence on external price APIs | CoinGecko, Binance, Hyperliquid, Gate rate limits and CORS | Dual-source feed (CEX plus on-chain AMM spot and book) with a divergence guard, cache, silent fallback on charts. Paper PnL is valued at the server price. Acknowledged as debt in the DEVLOG; the fix is a paid data plan, not an architecture change. |
| Team size | Two to three people | 1,213 tests, type-checking across 8 workspaces, no `as any`, a pure domain package with no I/O. Show the test count and the fact that the whole on-chain layer is native primitives with no smart contract, no bridge, no oracle: small surface, small team. |
| Paper performance is not real performance | No slippage, no fear | Docs already say it: paper is engagement and learning, the serious value is the Live track record. Paper fees are modelled (0.02% maker, 0.06% taker), fills cross the spread in the sandbox, liquidation is simulated. The funded evaluation adds the missing ingredient: consequences. |
| Prediction markets and the open cash-prize competition are asserted in the present tense | Are they live? | Verify in `#/competitions` and the terminal on submission day; remove the mention if not. |

Sources for regulation: [Industry Spread on MiFID II perimeter](https://theindustryspread.com/eu-regulators-prop-trading-mifid-ii-perimeter/), [TradingView News on ESMA reviews](https://www.tradingview.com/news/financemagnates:6fcadd880094b:0-exclusive-regulators-conducted-preliminary-reviews-on-potential-prop-trading-regulations/), [FSMA warning](https://fxnewsgroup.com/forex-news/regulatory/belgiums-fsma-warns-consumers-against-shadow-investment-game/).

## Summary

1. Simulators are huge, free, and dead ends: TradingView (about 20M monthly users), Investopedia, eToro ($100k demo for 40M users), Binance and Bybit demos all stop at a score or at "deposit here".
2. Demand for paper competitions is proven: The Leap draws 54,000 to 92,000 entrants per edition for an $8,500 top prize; Bybit WSOT drew 520,451 real-money entrants for $10M.
3. Funded-trader evaluations are the money: FTMO did about $329M revenue and $62.5M profit in 2024 on evaluation fees; Kraken bought Breakout (20,000+ funded accounts) in September 2025.
4. That category is under regulatory pressure in the EU (ESMA inspections, FSMA, CONSOB, CNMV warnings, MiFID II perimeter). Tide's funded stage is 2027, fee-free today, and leaves a public audit trail.
5. AI agents: Coinbase shipped four MCP products in 12 months, all real money, all Coinbase. Nobody runs humans and agents on one board under one server-enforced mandate with a paper tier.
6. XRPL front ends (First Ledger bot, XPMarket, Sologenic, Magnetic) serve people who already trade; none teaches, funds a first account or runs competitions.
7. XRPL Q1 2026 (Messari): about $8.1M daily CLOB volume, about 8,000 daily CLOB traders, AMM volume down 31% QoQ. The ledger has the exchange and not the crowd. Tide's thesis is the data.
8. Whitespace on a 2x2: "score pays real capital" x "open public ledger credential". Tide is alone in the top-right.
9. Closest by format: TradingView The Leap (will not settle on-chain, broker referral business). Closest by model: Breakout/Kraken (fee-first, opaque, captive to Kraken).
10. Defensible claim 1: the only trading school whose diploma is a funded XRPL account and a soulbound proof.
11. Defensible claim 2: one rule book for humans and AI agents, enforced server-side, which becomes the funded evaluation.
12. Defensible claim 3: the full path from zero to the native DEX with no exchange, no KYC, no purchase, in production on mainnet primitives.
13. Real moats grow with the corpus (track records, funded-trader outcome data, cohorts, classrooms); the tech is copyable, the history is not. Say so.
14. Never claim: first AI agents, any user or volume figure, "risk-free", "prop firm", largest anything.
15. Top jury risks and answers: custody (multisig, AES-256-GCM, three keys), sybil (caps, soulbound, one address per session), thin XRPL liquidity (it is the problem statement; RLUSD routing, no wash volume), regulation (funded stage designed under MiFID II, 2027), team size (1,213 tests, native primitives only).
