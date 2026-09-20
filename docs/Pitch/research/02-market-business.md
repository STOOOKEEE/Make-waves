# Tide pitch research: market and business

> Research memo for the Make Waves / investor deck. Written 2026-09-16.
> Rule: no figure without a source and a date. Confidence: **High** = primary source (filing, company report, regulator, on-chain data aggregator). **Medium** = reputable trade press quoting a primary source. **Low** = market-research vendor or blog aggregate; use only as an order of magnitude, never as a headline number.
> Product facts (16 lessons, $10,000 virtual, 2.22 XRP per learner, 20 MCP tools, 1,213 tests) come from the codebase and `docs/PITCH.md`, not from this memo.

---

## 1. Retail trading demand, and why beginners lose

### 1.1 The crowd exists and it is young

| Finding | Figure | Source | Date | Confidence |
|---|---|---|---|---|
| Global crypto owners | **741 million** (up 12.4% from 659M in 2024) | [Crypto.com, Global Cryptocurrency Ownership Reaches 741 Million](https://crypto.com/en/company-news/global-cryptocurrency-ownership-reaches-741-million-in-2025) | 2025 | High |
| Bitcoin owners | 365M (49.3% of owners) | same report | 2025 | High |
| Gen Z who own crypto (US, directly or via ETF) | **24%** | [Motley Fool investor survey](https://www.fool.com/money/research/study-americans-cryptocurrency/) | 2026 | Medium |
| Gen Z investors who own crypto | **42%**, versus 11% who hold a retirement account | YouGov study cited by [Nasdaq / GOBankingRates](https://www.nasdaq.com/articles/almost-20-gen-z-investors-are-only-crypto-brilliant-or-dumb) | 2025 | Medium |
| Gen Z likely to buy crypto in the next 12 months | **49%** (Gen X 26%, boomers 11%) | [Gemini, State of Crypto survey](https://www.gemini.com/blog/gemini-survey-finds-more-than-half-of-gen-z-owns-crypto) | 2025 | Medium |
| Investors under 30 whose only asset is crypto | roughly **1 in 5** | [Nasdaq / GOBankingRates](https://www.nasdaq.com/articles/almost-20-gen-z-investors-are-only-crypto-brilliant-or-dumb) | 2025 | Medium |
| Retail share of US equity trading | up to **36%** in 2025 versus a 10-year average near 12% | [Finance Magnates](https://www.financemagnates.com/forex/retail-traders-are-no-longer-buying-both-us-equity-share-hits-36-crypto-drops/) | 2025 | Medium |

Read for the deck: the next cohort of traders is already here, it is young, and its first instrument is crypto, not a stock. They are learning by losing.

### 1.2 Beginners lose, and regulators have to say so

| Finding | Figure | Source | Date | Confidence |
|---|---|---|---|---|
| Retail CFD accounts that lose money (EU regulators' analyses, now a mandatory warning on every EU broker) | **74% to 89%**, average loss per client EUR 1,600 to EUR 29,000 | [ESMA press release](https://www.esma.europa.eu/press-news/esma-news/esma-agrees-prohibit-binary-options-and-restrict-cfds-protect-retail-investors) | 2018 (still the disclosure standard) | High |
| Brazilian day traders who persisted 300+ days and lost money | **97%** of 1,551 individuals, net of fees | Chague, De Losso, Giovannetti (2020), summarised by [Tradicted](https://www.tradicted.com/research/chagu-day-2020/) | 2020 | High (peer-reviewed) |
| Taiwan day traders with persistent positive returns net of fees | **under 1%** | Barber, Lee, Liu, Odean, summarised by [Tradicted](https://www.tradicted.com/research/barber-learning-2020/) | 2004 to 2020 | High (peer-reviewed) |
| Most active quintile of US retail underperformed the market | by roughly **6.5 points a year** | Barber and Odean (2000), summarised by [Curved Trading](https://curvedtrading.com/articles/en/trading/day-trading-statistics/) | 2000 | High (peer-reviewed) |
| Crypto liquidations, all exchanges | **over $150 billion** in 2025, daily average $400M to $500M | [CoinGlass via Bitcoinist](https://bitcoinist.com/crypto-liquidations-150-billion-2025-coinglass/) | 2025 | Medium |
| Largest single-day liquidation | **$19 billion** on 10 October 2025, 85% to 90% of it long positions | [CoinGlass via Yellow](https://yellow.com/news/crypto-liquidations-surpass-dollar150-billion-in-2025-coinglass-reports) | Oct 2025 | Medium |
| Centralised crypto derivatives volume | **$85.7 trillion** in 2025 | [CoinGlass via Yellow](https://yellow.com/news/crypto-liquidations-surpass-dollar150-billion-in-2025-coinglass-reports) | 2025 | Medium |
| Futures and perps share of all crypto exchange activity | roughly **77%** | [Datawallet, perpetual futures statistics](https://www.datawallet.com/crypto/crypto-perpetual-futures-statistics) | 2025 | Low |

Why they lose (the studies agree): overtrading, leverage without position sizing, no stop, no plan, and the tuition is paid in real money. In the funded-trader world, the majority of evaluation failures happen in the first week, from breaching the daily loss limit, not from missing the profit target ([Fortunly](https://fortunly.com/statistics/prop-firm-challenge-pass-rate-statistics/), 2026, Medium). That is exactly the skill Tide's curriculum and sandbox drill (risk per trade, liquidation, stop placement).

---

## 2. Trading education and simulators

### 2.1 Market size (vendor estimates, order of magnitude only)

| Finding | Figure | Source | Date | Confidence |
|---|---|---|---|---|
| Trading education market | **$2.34B** in 2024, projected $5.25B by 2033 (9.2% CAGR) | [Growth Market Reports](https://growthmarketreports.com/report/trading-education-market) | 2024 | Low |
| Financial literacy platform market | $2.8B in 2025, $7.6B by 2034 | [MarketIntelo](https://marketintelo.com/report/financial-literacy-platform-market) | 2025 | Low |
| Financial literacy education market (broad) | $5.0B in 2025, $11.6B by 2032 | [Stratistics MRC via MarketResearch.com](https://www.marketresearch.com/Stratistics-Market-Research-Consulting-v4058/Financial-Literacy-Education-Forecasts-Global-43563375/) | 2025 | Low |

Recommendation: do not headline a vendor TAM. Use the simulator usage numbers below, which are company-reported and concrete.

### 2.2 Simulators are a mass channel, and every one of them ends at the simulation

| Platform | Usage | Source | Date | Confidence |
|---|---|---|---|---|
| SIFMA Foundation Stock Market Game (US schools) | **more than 700,000 students a year**, all 50 states | [SIFMA press release](https://www.sifma.org/news/press-releases/sifma-and-the-sifma-foundation-announce-the-top-10-winners-of-the-18th-annual-capitol-hill-challenge-and-congratulate-all-participants) | Jan 2025 | High |
| HowTheMarketWorks (Stock-Trak) | **485,000+ students and individuals a year** | [HowTheMarketWorks](https://www.howthemarketworks.com/) | 2025 | High (company-reported) |
| Wall Street Survivor | **150,000 individuals a year** | [Wall Street Survivor](https://www.wallstreetsurvivor.com/) | 2025 | High (company-reported) |
| eToro virtual portfolio | $100,000 virtual balance, identical features to live | [eToro demo account page](https://www.etoro.com/en-us/trading/demo-account/) | 2026 | High |
| Binance Futures mock trading | 3,000 USDT testnet balance, up to 125x, 233+ pairs | [Binance support](https://www.binance.com/en/support/faq/how-to-access-mock-trading-in-binance-futures-b3706b248f2b4b1caabb4bf253bf067f) | 2026 | High |
| TradingView (platform, not paper-specific) | 50 million app downloads | [Goat Funded Trader on TradingView paper trading](https://www.goatfundedtrader.com/blog/tradingview-paper-trading-simulator-how-to-use) | 2026 | Low |
| Investopedia Simulator users | UNVERIFIED (no public figure found) | | | |

Read for the deck: in the US alone, three school-channel simulators report about **1.3 million learners a year** between them, and they run a stock game with a 1990s instrument set. None of them ends on a funded account, a track record, or a venue. Tide's classroom feature (Q4 2026 roadmap) targets exactly this channel with a modern instrument set and an on-chain outcome.

---

## 3. The funded-trader (evaluation) industry: the revenue engine of "Then"

| Finding | Figure | Source | Date | Confidence |
|---|---|---|---|---|
| FTMO revenue | **$329M** in 2024 (+53% YoY), net profit about **$62.5M** | [Finance Magnates](https://www.financemagnates.com/forex/ftmos-parent-netted-over-62-million-on-329m-revenue-in-2024/) | 2024 filings | High |
| FTMO revenue 2023 | $213M | [Finance Magnates](https://www.financemagnates.com/forex/exclusive-prop-trading-giant-ftmos-2023-turnover-hits-213-million/) | 2023 | High |
| FTMO open trading accounts | **2.3 million** in 2024 (+33% YoY) | [Finance Magnates](https://www.financemagnates.com/forex/ftmos-parent-netted-over-62-million-on-329m-revenue-in-2024/) | 2024 | High |
| FTMO cumulative payouts to traders | over **$450M** in 10 years | [Finance Magnates](https://www.financemagnates.com/forex/ftmo-announces-over-450-million-paid-out-as-prop-trading-firm-turns-10/) | 2024 | High |
| Topstep cumulative payouts | **$1.4B+**; 33.3% of funded participants received a payout in 2025 | [Topstep](https://www.topstep.com/) via [QuantVPS](https://www.quantvps.com/blog/prop-firm-statistics) | 2025 | Medium |
| Apex Trader Funding payouts | **$598M+** since 2022, about $15.4M a month late 2025 | [QuantVPS](https://www.quantvps.com/blog/topstep-vs-apex-full-comparison) | 2025 | Medium |
| FTMO challenge prices | $155 ($10K) to $1,080 ($200K), one-time, refunded on first payout | [FXNX](https://fxnx.com/en/blog/ftmo-challenge-cost-2026-fees-refunds-total-funded) | 2026 | Medium |
| Topstep evaluation | $99 to $199 a month, plus $149 activation | [PropFirmMap](https://propfirmmap.com/blog/ftmo-vs-topstep-2026-cfd-futures-comparison) | 2026 | Medium |
| Evaluation pass rate | **5% to 14%**; of 100 buyers about 14 pass and 7 ever get paid | [Fortunly](https://fortunly.com/statistics/prop-firm-challenge-pass-rate-statistics/) | 2026 | Medium |
| Retail prop industry revenue | about **$850M** (2026 estimate, +45% YoY); other estimates $4B to $4.5B for the wider ecosystem | [Track360](https://track360.io/blog/prop-trading-industry-report-2026-market-analysis) | 2026 | Low |
| Firms that shut down 2024 to 2025 | about **80 to 100** prop firms (about 14% of the market) | [VeritasChain](https://veritaschain.org/blog/posts/2025-12-28-prop-trading-reckoning/) | 2025 | Medium |
| MetaQuotes revoked MT4/MT5 access for prop firms serving US clients | Feb 2024; True Forex Funds closed May 2024 leaving about 300 traders and $1.2M unpaid | [FX News Group](https://fxnewsgroup.com/forex-news/retail-forex/exclusive-prop-trading-firm-true-forex-funds-shut-down-by-metaquotes-move/) | 2024 | High |
| CFTC action against My Forex Funds | asset freeze, 2023 | [Finance Magnates](https://www.financemagnates.com/forex/ctrader-restricts-us-prop-firm-access-following-internal-regulatory-assessment/) | 2023 | Medium |
| Crypto-native prop firms | HyroTrader: 30,000+ traders, $3.5M+ payouts, real Bybit execution. Breakout Prop acquired by **Kraken**, Sept 2025 | [Kraken Learn](https://www.kraken.com/learn/breakout-vs-hyrotrader), [CoinGecko](https://www.coingecko.com/learn/best-crypto-prop-firms) | 2025 to 2026 | Medium |

Read for the deck:
- One company, FTMO, makes **$329M a year selling evaluations**, with a 19% net margin, on a **5% to 14% pass rate**. The industry monetises failure.
- The industry's structural weakness is trust: simulated evaluations on rented MT4/MT5 servers, opaque rules, 80+ firms vanished in two years, regulators circling. A Kraken acquisition of Breakout shows exchanges want this business.
- Tide's angle is defensible: **the evaluation rules already run server-side on agents** (max capital, daily loss, trades, leverage, kill switch), the track record is **on a public ledger**, and the funded account trades a **real DEX** with every transaction tagged. Verifiable evaluation, verifiable payouts. Never say "prop firm" on a slide (product decision); say funded traders.

---

## 4. Perpetuals and prediction markets: the instruments beginners actually meet

| Finding | Figure | Source | Date | Confidence |
|---|---|---|---|---|
| Hyperliquid volume 2025 | **$2.95 trillion**, revenue **$844M** (96% from perp fees) | [BlockEden](https://blockeden.xyz/blog/2026/01/10/hyperliquid-revenue-dominance-onchain-trading-solana/), [Phemex](https://phemex.com/news/article/hyperliquid-exceeds-3-trillion-in-trading-volume-dominates-2025-perp-dex-market-48981) | 2025 | Medium |
| Hyperliquid share of on-chain perps | about **73%** in 2025, contested by Aster and Lighter in Q4 | [bex.co](https://bex.co/blog/2026/01/10/hyperliquid-844m-revenue-perpetual-dex-dominance) | 2025 | Medium |
| Hyperliquid 30-day perp volume | **$245B**, 4x the next competitor | [Coinlaw](https://coinlaw.io/hyperliquid-statistics/) | June 2026 | Low |
| Perp DEX cumulative volume | **$12.09T** by end of 2025, from $4.1T at the start of the year | [Phemex](https://phemex.com/news/article/hyperliquid-exceeds-3-trillion-in-trading-volume-dominates-2025-perp-dex-market-48981) | 2025 | Medium |
| Perp DEX share of global futures volume | about **26%**, about $1T a month | [BlockEden](https://blockeden.xyz/blog/2026/01/29/perp-dex-wars-2026-hyperliquid-lighter-aster-edgex-paradex-decentralized-derivatives/) | Jan 2026 | Low |
| Top ten perp exchanges volume | **$92.9T** in 2025 (+64.6%) | [Datawallet](https://www.datawallet.com/crypto/crypto-perpetual-futures-statistics) | 2025 | Low |
| Polymarket volume 2025 | about **$220B**; 477,850 active traders in Oct 2025 (record month) | [The Block](https://www.theblock.co/post/383733/prediction-markets-kalshi-polymarket-duopoly-2025), [KuCoin](https://www.kucoin.com/news/flash/kalshi-and-polymarket-dominate-97-5-of-prediction-market-share-in-2025) | 2025 | Medium |
| Kalshi volume 2025 | about **$238B**, +1,100% YoY, 97M transactions, record $381.7M in one day | [The Block](https://www.theblock.co/post/383733/prediction-markets-kalshi-polymarket-duopoly-2025) | 2025 | Medium |
| Prediction market monthly volume | from about $5B a month to **$24B a month** in seven months | [Coinlaw](https://coinlaw.io/prediction-market-statistics/), [Pew Research](https://www.pewresearch.org/short-reads/2026/05/27/trading-volume-on-prediction-markets-has-soared-in-recent-months/) | 2025 to 2026 | Medium |
| Hyperliquid take rate (derived) | $844M / $2.95T = about **2.9 basis points** of volume | derived from the two figures above | 2025 | Medium |

Read for the deck: the three instruments Tide teaches in paper (spot, perps, prediction markets) are the three fastest-growing retail venues of the cycle. The school simulators of section 2 teach none of them. Note: Hyperliquid's 2025 figures are quoted differently across sources ($2.95T vs "over $3T"); use "about $3 trillion".

---

## 5. Business model benchmarks and Tide's revenue lines

### 5.1 Benchmarks

| Benchmark | Figure | Source | Date | Confidence |
|---|---|---|---|---|
| Poker tournament fee | usually **10%** of buy-in online (range 3% to 10%; live up to 20%) | [PokerNews](https://www.pokernews.com/pokerterms/rake.htm), [Pokercode](https://www.pokercode.com/blog/poker-rake) | 2025 | High (industry norm) |
| Duolingo paid conversion | **9.2%** of MAU (12.2M subscribers / 133.1M MAU, Q4 2025); 8.9% in Q1 2025 | [Duolingo 8-K Q3 2025](https://www.sec.gov/Archives/edgar/data/1562088/000162828025049514/q3fy25duolingo9-30x25press.htm), [Business of Apps](https://www.businessofapps.com/data/duolingo-statistics/) | 2025 | High |
| Robinhood ARPU | **$191** annualised (Q3 and Q4 2025); Gold subscribers 4.2M (+58%) | [Robinhood Q4 2025 results](https://investors.robinhood.com/news-releases/news-release-details/robinhood-reports-fourth-quarter-and-full-year-2025-results) | 2025 | High |
| Robinhood CAC per new funded account | fell from $53 (FY2019) to **$15** (Q1 2021) thanks to referral | [Robinhood S-1 / DRS](https://www.sec.gov/Archives/edgar/data/1783879/000162827921000383/filename1.htm) | 2021 (dated) | High |
| FTMO evaluation fee | $155 to $1,080 one-time | see section 3 | 2026 | Medium |
| Hyperliquid take rate | about 2.9 bps of volume | derived, section 4 | 2025 | Medium |
| Coinbase referral bonus | typically **$10 in BTC** per referred user who buys; promotions up to $200 | [Coinbase referral guides](https://intercom.help/cryptoreferralcodes/en/articles/15054846-coinbase-referral-code-3kmzm83-10-btc-bonus-2026) | 2026 | Medium |
| Binance welcome rewards | up to **$100** in fee-rebate vouchers for verify, deposit, first trade | [Binance Square](https://www.binance.com/en/square/post/32106266651929) | 2026 | Medium |

### 5.2 Tide's revenue lines (proposal, with the benchmark each one leans on)

| Line | When | Mechanism | Benchmark | Unit economics (assumptions in italics) |
|---|---|---|---|---|
| 1. Tournament rake | Now (code: buy-in in XRP to multisig, payout by tagged Payment; current competition is 0% rake winner-takes-all) | 5% to 10% of buy-ins | Poker 10% | *Assume $20 average buy-in, 2 tournaments a month per active competitor, 8% rake* = **$3.20 per competitor per month** |
| 2. Third-party competitions | Q4 2026 (roadmap) | Educators, XRPL projects, communities fund a prize pool and pay a platform fee | Esports / poker tournament fees | *Assume 5% platform fee on hosted pools* |
| 3. Classrooms (B2B) | Q4 2026 | Per-seat licence to schools and universities; every seat is a funded XRPL account | Stock-Trak / SIFMA channel of 1.3M learners a year (US only) | *Assume $5 per seat per semester* (pricing UNVERIFIED; Stock-Trak pricing not public) |
| 4. Evaluation fees (funded traders) | H1 2027 | Paid evaluation under the risk rules already enforced on agents; refunded on first payout | FTMO $155 to $1,080, 5% to 14% pass rate | *Assume $99 evaluation, 10% pass rate*; FTMO's $329M revenue is the ceiling reference |
| 5. AI coach subscription | Q4 2026 | Post-trade review and weekly report, built on the existing agent stack | Duolingo 9.2% conversion, Robinhood Gold 4.2M | *Assume $8 a month, 5% of MAU convert* (half Duolingo's rate) |
| 6. DEX fees | 2027 (v0 off-chain matching, RLUSD settlement) | Maker/taker fees on the perp venue; spot on the native DEX stays free | Hyperliquid 2.9 bps on volume, $844M in 2025 | *Assume 2.5 bps net* |

### 5.3 Bottom-up TAM / SAM / SOM

Method: count people, not vendor dollars. Every assumption is labelled.

**TAM (who could use a trading school with a simulator and an on-chain outcome)**
- 741M crypto owners worldwide (Crypto.com, 2025, High).
- Per-user value ceiling: Robinhood ARPU $191 a year (2025, High). Tide will not reach that in year one; the point is the ceiling on a monetised trader.
- TAM in people: **741M**. TAM in dollars at Robinhood ARPU: 741M × $191 = **about $140B a year**. Use the people number on the slide; the dollar figure is only to show the ceiling is not the constraint.

**SAM (who Tide can realistically serve in 24 months)**
- Segment: young, crypto-first, wants to learn before risking. Proxies: 24% to 42% of Gen Z investors own crypto (2025 to 2026, Medium); 49% of Gen Z intend to buy in 12 months (Gemini 2025, Medium).
- English and French speaking markets first (the product is bilingual). *Assumption: 20% of the 741M are reachable in EN/FR retail markets* = about 150M people.
- *Assumption: 10% of them are beginners who would try a free simulator* = **about 15M people**.
- Plus the school channel: 1.3M learners a year in three US programs alone (High), and universities have used simulators for fifteen years.
- Revenue per served user, blended, year two: *assume $12 a year* (rake + coach + evaluations, using the unit economics above with 5% coach conversion and 2% who buy an evaluation). SAM in dollars: 15M × $12 = **about $180M a year**.

**SOM (what Tide can capture, 2027, with the funded-trader line live)**
- *Assumption: 300,000 registered learners, 60,000 MAU* (this is 0.4% of SAM; for reference Duolingo has 133M MAU and SIFMA alone puts 700k students a year through a stock game).
- Coach: 60,000 × 5% × $8 × 12 = **$288k**
- Rake: *20% of MAU compete* = 12,000 × $3.20 × 12 = **$461k**
- Evaluations: *2% of registered buy one a year* = 6,000 × $99 = **$594k**
- Classrooms: *200 classes × 30 seats × $5 × 2 semesters* = **$60k**
- Hosted competitions: *50 pools × $2,000 × 5%* = **$5k**
- **SOM about $1.4M ARR in 2027 on 60k MAU**, before any DEX fee. Every line scales linearly with MAU; the funded-trader line is the one FTMO proved can reach hundreds of millions.
- Cost side to remember: the funded onboarding costs $2.84 per learner at today's XRP price (section 6), so 300k learners = about $850k of XRP, most of which ends in accounts users keep. That is the growth budget line, and it is cheaper than every fintech CAC benchmark below.

State on the slide: "Bottom-up, assumptions on the slide, no vendor TAM."

---

## 6. Why funding wallets is cheap acquisition of on-chain accounts

| Finding | Figure | Source | Date | Confidence |
|---|---|---|---|---|
| XRP price | **$1.28** | [CoinGecko simple price API](https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd) | 2026-09-16 08:27 UTC | High |
| Cost of one funded learner | 2.22 XRP × $1.28 = **$2.84** | derived; 2.22 XRP is the funder payment in code and `docs/PAPER-WALLET-MAINNET.md` | 2026-09-16 | High |
| What the learner keeps | starter sends 1.21 XRP to the kept account, then AccountDelete (0.2 XRP) sweeps the remainder into it: about **2.0 XRP, about $2.56**, stays with the user | derived from the funding flow in `docs/PITCH.md` | 2026 | High |
| Robinhood CAC per new funded account | $53 (FY2019), $20 (FY2020), **$15** (Q1 2021) | [Robinhood DRS/A](https://www.sec.gov/Archives/edgar/data/1783879/000162827921000383/filename1.htm) | 2021 (dated, best public disclosure) | High |
| Coinbase referral bonus | about **$10 in BTC** per referred user who makes a purchase | referral guides, section 5 | 2026 | Medium |
| Binance welcome rewards | up to **$100** in fee-rebate vouchers | [Binance Square](https://www.binance.com/en/square/post/32106266651929) | 2026 | Medium |
| XRPL new accounts | about **2,800 a day** in Q2 2026 (down 25% YoY); about 490,000 new addresses in H1 2026; daily active trading accounts about **2,435** | [Evernorth Research via Cryptonomist](https://en.cryptonomist.ch/2026/09/02/xrp-ledger-liquidity-trends-q2-2026/), [Crypto.news](https://crypto.news/xrp-ledger-order-book-volume-jumps-79-as-traders-fall/) | Q2 2026 | Medium |
| XRPL DEX order-book volume | **3.57M XRP a day** in Q2 2026 (+79% YoY) while active accounts fell about 40% | [The Crypto Basic](https://thecryptobasic.com/2026/09/03/xrpl-dex-order-book-volume-spiked-to-3-57m-xrp-in-q2-2026/) | Q2 2026 | Medium |
| RLUSD | **$2.32B** market cap; XRPL share of supply from 18.4% to 58.9% during 2026 | [Crypto.news](https://crypto.news/xrp-rlusd-disconnect-price-down-network-up-2/) | 2026 | Medium |

The argument, in order:
1. An XRPL account exists at 1 XRP of base reserve and a transaction costs a fraction of a cent. The ledger makes onboarding affordable in a way an EVM chain does not.
2. Tide spends **$2.84 per learner** and about 90% of it ends in an account the learner keeps. Robinhood's best-ever CAC was $15; Coinbase pays $10 in BTC per referral; Binance offers up to $100 in vouchers. Tide's "CAC" is not marketing spend, it is the user's first on-chain balance.
3. The result is the hackathon metric itself: a mainnet account, funded, that has signed real transactions (NFT accept, AccountDelete sweep), owned by a real person who has already done a first trade.
4. Context that makes it matter to XRPL: the ledger's DEX volume is rising while its **active trading accounts fell to about 2,435 a day** and new accounts fell 25% YoY. XRPL has liquidity and is losing retail participants. Every Tide learner is a new one, with a track record.
5. Guardrails already in code: total cap (300 wallets in the pilot config), daily cap (25), anti-farming (one address per session), so the budget is bounded and sybil-resistant.

---

## 7. Numbers we can use on a slide (shortlist)

| Figure | Use on | Source | Date | Confidence |
|---|---|---|---|---|
| 741 million crypto owners | Market | Crypto.com | 2025 | High |
| 49% of Gen Z plan to buy crypto in 12 months | Problem / market | Gemini | 2025 | Medium |
| 74% to 89% of retail CFD accounts lose money | Problem | ESMA | 2018 standard | High |
| 97% of persistent day traders lose (Brazil) | Problem | Chague et al. | 2020 | High |
| $150B+ liquidated in 2025, $19B in one day | Problem / why now | CoinGlass | 2025 | Medium |
| 700,000 students a year in one US stock game; 1.3M across three programs | Channel / classrooms | SIFMA, Stock-Trak, WSS | 2025 | High |
| FTMO: $329M revenue, $62.5M profit, 2.3M accounts, 5% to 14% pass | Business model / Then | Finance Magnates | 2024 | High |
| 80 to 100 prop firms vanished 2024 to 2025 | Moat (verifiability) | VeritasChain | 2025 | Medium |
| Hyperliquid: about $3T volume, $844M revenue | Vision / DEX | BlockEden, Phemex | 2025 | Medium |
| Polymarket $220B, Kalshi $238B | Why now / instruments | The Block | 2025 | Medium |
| Duolingo 9.2% paid conversion | Business model | Duolingo 8-K | 2025 | High |
| Poker tournament fee 10% | Business model | PokerNews | norm | High |
| Robinhood ARPU $191, CAC $15 to $53 | Business model / CAC | Robinhood filings | 2025 / 2021 | High |
| XRP $1.28, so 2.84 dollars per funded learner | Why we fund wallets | CoinGecko | 2026-09-16 | High |
| XRPL DEX volume +79% while active trading accounts about 2,435 a day | Why XRPL needs Tide | Evernorth via press | Q2 2026 | Medium |
| RLUSD $2.32B, 58.9% of supply on XRPL | Why now on XRPL | Crypto.news | 2026 | Medium |

Do not use: vendor "trading education market $2.34B" as a headline (Low); "crypto prop industry crossed $20 billion" (Kraken Learn, undefined metric, Low); any Tide traction number (rule in `growth/context/05-facts.md`).

---

## Summary

1. The crowd is real and young: 741M crypto owners (Crypto.com 2025), 49% of Gen Z intend to buy crypto within a year (Gemini 2025), one in five under-30 investors hold nothing but crypto.
2. Beginners lose, and the numbers are the same everywhere: 74% to 89% of retail CFD accounts lose (ESMA), 97% of persistent Brazilian day traders lose, under 1% of Taiwan day traders are consistently profitable.
3. The tuition is paid in real money: $150B+ liquidated in 2025, $19B on one day in October, 85% to 90% of it longs.
4. Simulators are already a mass channel: SIFMA alone puts 700k students a year through a stock game, Stock-Trak 485k, Wall Street Survivor 150k. They teach 1990s instruments and stop at the simulation.
5. The instruments beginners actually meet are perps and prediction markets: Hyperliquid about $3T volume and $844M revenue in 2025; Polymarket $220B and Kalshi $238B in 2025.
6. The funded-trader model is proven and profitable: FTMO $329M revenue, $62.5M net profit, 2.3M accounts in 2024, on a 5% to 14% pass rate.
7. That industry's weakness is trust: 80 to 100 firms vanished in 2024 to 2025, MetaQuotes cut them off, the CFTC froze one. Verifiable evaluation on a public ledger is the wedge.
8. Benchmarks for Tide's lines: poker rake 10%, Duolingo 9.2% paid conversion, Robinhood ARPU $191, Hyperliquid take rate about 2.9 bps.
9. Six revenue lines, in shipping order: tournament rake, hosted competitions, classrooms, evaluations, AI coach, DEX fees. Spot on the native DEX stays free.
10. Bottom-up SAM: about 15M reachable beginners (assumptions labelled), about $180M a year at $12 blended revenue per user.
11. SOM 2027: about $1.4M ARR on 60k MAU before any DEX fee; the evaluation line is the one FTMO proved scales to hundreds of millions.
12. Funding a wallet costs $2.84 at XRP $1.28 (CoinGecko, 2026-09-16), and about 90% of it stays in an account the learner keeps.
13. That beats every CAC benchmark: Robinhood's best was $15 per funded account, Coinbase pays $10 in BTC per referral, Binance up to $100 in vouchers.
14. XRPL needs the crowd: DEX order-book volume +79% YoY in Q2 2026 while daily active trading accounts fell to about 2,435 and new accounts fell 25%. RLUSD is $2.32B and majority on XRPL.
15. Slide rule: use the High and Medium rows in section 7, never a vendor TAM, never a Tide traction number, never the words "prop firm" or "risk-free".
