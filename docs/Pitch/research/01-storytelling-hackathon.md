# Tide pitch research 01: storytelling and the Make Waves jury

> Research note for the Tide pitch deck. Written 2026-09-16. Every external fact carries its source URL. Anything not confirmed by a primary source is marked UNVERIFIED. Copy rules respected throughout: no "risk-free", no promise of gains, no traction numbers, "funded traders" never "prop firm", no em dashes.

---

## 1. Make Waves on XRPL 2026: what the jury is actually judging

### 1.1 The programme

| Fact | Value | Source |
|---|---|---|
| Format | "a 90-day challenge to build a live app on XRPL Mainnet, get real users, and generate real on-chain volume" | https://luma.com/make-waves-on-xrpl |
| Dates | 22 June to 21 September 2026, online, opens with a 2-day technical deep dive, weekly webinars and office hours every Wednesday | https://luma.com/make-waves-on-xrpl |
| Organiser | XRPL Commons, Paris-based nonprofit; Make Waves sits in its 2026 portfolio next to Hack The Block (Paris Blockchain Week) and the October NYC hackathon | https://genfinity.io/2026/08/24/xrp-ledger-hackathon-nyc-october-2026-xrpl-commons-swell/ |
| Total prizes | 50,000 XRP | https://luma.com/make-waves-on-xrpl |
| Best overall project (jury) | 25,000 XRP | https://thecryptobasic.com/2026/07/13/more-developer-activity-on-the-xrp-ledger-as-app-related-transactions-surges/ |
| Highest number of users | 5,000 XRP | same |
| Highest on-chain volume | 5,000 XRP | same |
| 300 active users | 1,000 XRP each, shared among 15 projects | same |
| Follow-on | "a path into Aquarium, the incubator" (12-week Paris residency, themed cohorts: gaming, AI and blockchain, DeFi, social impact) | https://luma.com/make-waves-on-xrpl and https://www.xrpl-commons.org/the-aquarium |
| Honesty mechanism | "A weekly leaderboard keeps everyone honest" | https://luma.com/make-waves-on-xrpl |
| Application | manual review, answer within 48 hours, via xrpl.at/make-waves (redirects to hackathons.xrpl-commons.org) | https://luma.com/make-waves-on-xrpl |

Reading of the prize structure: half the pool (25,000 of 50,000 XRP) is a jury decision on "best overall project". Only 10,000 XRP depends on raw user and volume counts, and 15,000 is a threshold prize. So the pitch matters at least as much as the counters. The jury prize is the one Tide's deck is built to win.

### 1.2 How users and volume are attributed

- Attribution runs on the `SourceTag` field. A competing Make Waves entry (LFG, Team Hamsa) states in its README that "every XRPL transaction and Xaman signing payload the app builds carries `SourceTag` ... so all of the volume counts toward this entry", and shows a dashboard of "tagged transaction volume and unique wallets, deduplicated by activation funder". Source: https://github.com/Team-Hamsa/LFG
- XRPL's own docs frame `SourceTag` as "a 32-bit unsigned integer that identifies the originating application or workflow", and note it should be combined with Memos for a full audit trail. Source: https://xrpl.org/docs/agents/track-agent-behavior
- UNVERIFIED: the exact definition of "active user" for the 300-user prize (one tagged tx? distinct wallets? over what window?). The official detail page is a client-rendered app that returns only navigation to a fetch (https://hackathons.xrpl-commons.org/hackathons/make-waves-041f8ce6). The competitor above deduplicates wallets "by activation funder", which suggests organisers watch for accounts mass-funded from one source. This matters for Tide: the funded-onboarding flow funds starter accounts from one hot wallet, so the deck must present that mechanism as transparent and human-gated (one account per learner, badge only after a real first trade, retirement by `AccountDelete`), not hide it.
- UNVERIFIED: submission deliverables (pitch deck, video, demo day). No public page lists them. Assume the standard XRPL Commons pattern: project page on hackathons.xrpl-commons.org, short video, live app link, plus a jury presentation. Plan the deck for a 5 to 7 minute spoken pitch and as a standalone read.

### 1.3 Ecosystem context the jury lives in

- XRPL "source-tagged transactions" reached 676,800 per week in the week of 13 July 2026 (up 28.6% over the reporting period), daily active source tags at 176, new wallets flat at 12,400 per week. Source: https://thecryptobasic.com/2026/07/13/more-developer-activity-on-the-xrp-ledger-as-app-related-transactions-surges/ (cites dUNL validator Vet)
- XRPL daily active wallets: 14,300 (report dated 28 July 2026, MSB Intel). Source: https://www.kucoin.com/news/flash/xrp-ledger-hackathon-set-for-october-as-daily-active-users-reach-14-3k
- Reading: a network whose weekly new-wallet count is flat is a network that needs an on-ramp of new humans. That is exactly Tide's thesis, and it is a chart the jury already believes. Verify the two numbers against the primary posts before printing them.
- The October 2026 NYC hackathon tracks announced by XRPL Commons include "Agentic Finance: autonomous agent transaction rails" and "Lending & Borrowing". Source: https://genfinity.io/2026/08/24/xrp-ledger-hackathon-nyc-october-2026-xrpl-commons-swell/ . Tide's MCP-native agents under mandate land squarely in a theme the organiser is already promoting.

### 1.4 What past XRPL Commons winners looked like

From the public projects gallery (https://hackathons.xrpl-commons.org/projects):

| Event | Winner | Pitch shape |
|---|---|---|
| Hack The Block 2026 (Paris Blockchain Week) | Check-Fi (1st): supplier payments with ZK creditworthiness; Latch (2nd): overcollateralised lending on native primitives; Edel402 (3rd): "One line of code to monetize any API on the XRPL" | Finance-native, primitive-native, one-sentence pitches |
| IXH25 Italian XRPL Hackathon | PermiX (1st): "Permissioned DEX on XRPL enabling regulatory-compliant trading via credential-based access control" | DEX plus compliance |
| HACK4GOOD | PrevHero (1st): preventive health actions as verifiable certificates | Verifiable credentials on ledger |
| Special awards | "Zero to Users" category (XRP402), "Boundless", "Pixel Meets Chain" | Organisers explicitly reward getting to users |

Pattern: winners use native primitives rather than wrappers, describe themselves in one line, and tie to finance or verifiable credentials. Tide's "no smart contract, no bridge, no oracle" stance and its soulbound track-record NFTs are in the winning idiom. The existence of a "Zero to Users" award is a signal that "we bring the crowd" is a story the organisers want to hear.

- UNVERIFIED: Make Waves 2026 winners (the programme closes 21 September 2026; no results published at time of writing).

---

## 2. Pitch craft: what the best decks actually do

### 2.1 The five rules that survive every source

1. **The deck is an argument, not a gallery.** Airbnb's deck "was designed as arguments. Each slide was a step in a logical proof that Sequoia should write a check" (https://mypitchdecks.com/case-studies/airbnb-pitch-deck , https://blog.thinklions.com/airbnb-pitch-deck). Sequoia's own framing: "Define your company in a single declarative sentence" (https://www.sequoiacap.com/article/writing-a-business-plan/).
2. **Assertion headlines.** The title of a slide is the claim; the body is the evidence. Front slide 3: "The Inbox is Broken". Front slide 14: "A growing wedge of a huge market". Airbnb problem slide: "Price is an important concern for customers booking travel online". Sources: https://mypitchdecks.com/case-studies/front-pitch-deck , https://mypitchdecks.com/case-studies/airbnb-pitch-deck
3. **One idea per slide.** "Every Airbnb slide makes a single argument. Adding a fourth bullet would have weakened the third." (https://blog.thinklions.com/airbnb-pitch-deck)
4. **Why now is a slide, not a sentence.** Sequoia: "Nature hates a vacuum, so why hasn't your solution been built before now?" (https://www.sequoiacap.com/article/writing-a-business-plan/). Front answered with three external trends that "suggested incumbents couldn't have captured the opportunity earlier because the conditions didn't exist yet" (https://mypitchdecks.com/case-studies/front-pitch-deck).
5. **Bottom-up market, auditable assumptions.** Airbnb: "10.6M trips x 15% market share x $80 average booking = $200M opportunity", chosen because it lets investors "audit individual assumptions" (https://mypitchdecks.com/case-studies/airbnb-pitch-deck).

### 2.2 Patterns worth stealing, slide by slide

- **Cover as category claim.** Front's cover "The inbox built for teams" was "the entire vision compressed into a positioning statement, then proven across the subsequent 18 slides" (https://mypitchdecks.com/case-studies/front-pitch-deck). Tide's equivalent already exists: "The XRP Ledger has the exchange. Tide brings the traders."
- **Pre-empt the workarounds.** Front slide 4 "What teams do today" listed four workarounds and dismissed each, "pre-empting investor objections before they're voiced". Tide's version: what a beginner does today (YouTube, a CEX deposit, a testnet, a stock-market game) and why each fails to produce an XRPL trader.
- **Validation from adjacent behaviour.** Airbnb proved demand with Craigslist and Couchsurfing listings: "Airbnb merely needed to channel existing behavior into their platform". Tide's adjacent behaviour: paper-trading apps and trading-education audiences already exist at scale; Tide channels them onto the ledger. (Market agent to size this.)
- **Positioning by intersection, not feature war.** Front "triangulated against three understood categories (email, CRM, chat), positioning Front at an intersection rather than as direct competition". Tide sits at the intersection of trading education, competitive paper trading and the XRPL DEX; no one else occupies that corner.
- **Team after proof.** Front placed team "after market validation (since traction proves capability)". In a hackathon, the shipped product is the proof; put "why us" late, and make it about what was built in 90 days.
- **Close by echoing the opening claim.** Front's ask requested funds for "category-defining marketing", reinforcing the cover thesis.
- **Guy Kawasaki 10/20/30** (ten slides, twenty minutes, 30-point font): the page itself returned 403 to fetch, so the rule is cited from general knowledge and marked UNVERIFIED as to exact wording. The practical residue: if a slide needs a font under 30 points, it has too much text.

### 2.3 What hackathon judges reward and penalise (Devpost, ETHGlobal)

Rewarded:
- "A project that really stands out is one that was clearly considering the judging criteria" (Richard Moot, Square). For Make Waves the criteria are live on mainnet, real users, real volume. Say the words.
- "Is that finished product something that I would want to use?" (Warren Marusiak, Atlassian). Show the product, not a tour of it.
- Passion that is visible: "fire in their eyes" (Maria Yarotska, NEAR Foundation).
- Source for all three: https://info.devpost.com/blog/hackathon-judging-tips

Penalised:
- "ambiguity is a red flag"; "over-indexed" submissions strong in one area and weak elsewhere; "rehashed ideas ... something already in the market"; projects "repackaged across multiple hackathons" (same source).
- Demos that are tours: "many hackathon pitches are demos dressed as tours ('Here is the homepage', 'Here is what happens when you click this') ... the audience checks out when nothing is at stake" (https://tiffanyjachja.medium.com/i-learned-how-to-pitch-a-demo-heres-how-you-can-too-15b7301f61bd). Put something at stake in the demo: a learner who has never held crypto, on mainnet, in one flow.
- Overreliance on unexplained code: teams that "cannot explain how it works" lose (https://ainna.ai/resources/faq/winning-hackathon-guide). Tide's "For XRPL engineers" section is the antidote; keep one slide of it.

ETHGlobal finalist rubric adds Practicality ("Could it be used by its target audience today?"), Usability and "WOW Factor"; finalists get 4 minutes demo plus 3 minutes Q&A, demo videos 2 to 4 minutes, "no more than 4 bullet points per slide". Source: https://ethglobal.com/events/ethonline2025/info/details and https://ethglobal.com/events/newyork2025/info/details

### 2.4 How to make a modest prototype read as a large company (without lying)

The honest technique is a **vision ladder**: each rung is a thing that already exists in the code, and the next rung is the same thing pointed at a bigger market. The jury sees continuity, not a leap.

For Tide the rungs are already real:
1. Server-enforced risk rules on agents (max capital, daily loss, trades, leverage, kill switch) exist today. The same rules are the evaluation for funded traders (H1 2027).
2. The paper perpetuals engine (positions, isolated margin, liquidation, maker and taker fees) exists today. The same engine with RLUSD margin on a multisig clearing account is the DEX v0.
3. Soulbound First Trade NFTs exist today. The same primitive, with rank and competitions won, is an open trading credential any XRPL app can read.
4. Funded onboarding at 2.22 XRP per learner exists today. The same flow, opened by a teacher, is "Tide for classrooms", and opened by a community, is "competitions created by others".

Rule: never put on the ladder a rung whose lower rung is not in production. Everything above is.

Second technique: **market size as a funnel, not a TAM.** Show the crowd that exists (people learning to trade, paper-trading app users), the slice Tide can plausibly reach, and what one converted learner is worth to the ledger (an account, a track record, tagged volume). The market agent owns the numbers; this note owns the shape.

---

## 3. Three storylines, one recommendation, candidate titles

### Storyline A: "The ledger has the exchange, not the crowd" (infrastructure gap)

- Hook: The XRP Ledger has run a native exchange for over a decade. The retail trading crowd is on Binance and Hyperliquid.
- Load-bearing arguments:
  1. XRPL has an order book, an AMM, RLUSD and 3 to 5 second settlement, and flat new-wallet growth (see 1.3). The bottleneck is people, not infrastructure.
  2. Every simulator stops at the simulation. Tide's ends on a funded XRPL account and a track record on the ledger.
  3. Funded onboarding: Tide creates and funds the learner's first account, so a person who has never held crypto is on mainnet on day one, no exchange, no KYC, no purchase.
  4. Humans and AI agents trade on the same rails, under the same server-enforced limits.
  5. The venue at the end: the paper perps engine becomes the Tide DEX; the business lives there.
- Closing: "Every learner becomes an XRPL account. Every track record lives on the ledger. The DEX comes at the end."
- Strength: speaks the jury's language (mainnet, users, volume, primitives). Weakness for a VC: the wedge sounds ecosystem-shaped rather than company-shaped unless the DEX rung is made vivid.

### Storyline B: "Learn. Prove. Trade." (the learner's journey)

- Hook: Nobody is born knowing how to read a chart. Most people learn by losing real money on an exchange that profits when they do.
- Load-bearing arguments:
  1. The beginner's problem: fear of losing, no place to practise the instruments that define trading today (spot, perps, prediction markets).
  2. Tide School and a 19-step sandbox that cannot write to the server: learning with nothing at stake.
  3. Prove it: $10,000 virtual, real prices, real order books, a leaderboard shared with AI agents, cash-prize competitions paid in XRP.
  4. The score has consequences: badges become soulbound NFTs, winnings land in a real XRPL account, and the funded-trader path turns a track record into capital.
  5. Same terminal, one toggle: Live spot on the native DEX, non-custodial, tagged, no swap fee.
- Closing: "The first real XRP a beginner trades is earned, not bought."
- Strength: emotionally clear, product-shaped, great for demo. Weakness: reads as an edtech consumer app; the jury may not see why XRPL specifically needs it, and a VC may ask where the margin is.

### Storyline C: "The merit-based on-ramp" (funnel as business)

- Hook: Exchanges pay hundreds of dollars to acquire a trader who then loses money and churns. Tide acquires them with a lesson, keeps them with a league, and hands the ledger a trader with a verifiable track record.
- Load-bearing arguments:
  1. Acquisition cost is inverted: education is the top of the funnel, and it is free to the learner and cheap to run.
  2. The ledger makes onboarding affordable: 2.22 XRP per learner buys an account, a badge and a first tagged transaction.
  3. Merit is measurable on-chain: rank, weeks active, competitions won, as soulbound credentials any XRPL app can read.
  4. The funnel monetises at three points that already exist in code: tournament buy-ins, funded-trader evaluations, and the DEX.
  5. The same funnel works for classrooms, communities and AI agents, so distribution compounds.
- Closing: "XRPL has the exchange. Tide is the machine that makes the crowd."
- Strength: the most VC-native (unit economics, moat via credential, three revenue lines). Weakness: the "exchanges pay hundreds of dollars" premise needs a sourced number from the market agent; without it, drop the claim.

### Recommendation: A as the spine, with B as the demo and C as the business section

Use Storyline A's hook and close, because they answer the jury's rubric in the first ten seconds (live on mainnet, real users, real volume) and they are also a category claim in the Front sense: "the merit-based on-ramp to XRPL trading". Insert Storyline B as the middle of the deck (problem, product, demo), because it is the only version that makes a room feel something and it is the only version that can be demoed live. Bring in Storyline C for market, business model and moat, because a VC needs a company, not a pipeline. This ordering matches the user's requested arc (hook, problem, insight, solution, demo, market, business model, competition, proof, vision, roadmap, why us, close) without inventing anything that is not in production.

The single sentence that holds the three together, and that every slide should be able to point back to: **"Every other simulator stops at the simulation. Tide's ends on the ledger."**

### The 3 to 5 arguments to build the deck around

1. **The gap is people, not infrastructure.** XRPL has the exchange; no project brings it traders.
2. **The simulation has consequences.** Funded account, soulbound track record, prizes paid in XRP, funded-trader path.
3. **Funded onboarding is the trick.** 2.22 XRP turns a beginner into a mainnet account without an exchange, a KYC or a purchase; only the ledger makes that affordable.
4. **One set of rails for humans and agents.** 20 MCP tools, mandates enforced server-side, one leaderboard.
5. **The venue at the end.** The paper perps engine becomes the DEX; that is where the business lives.

### Candidate assertion titles (pick 8 to 10)

1. The XRP Ledger has the exchange. Tide brings the traders.
2. Beginners learn to trade by losing real money. Most stop there.
3. Every simulator stops at the simulation. Tide's ends on the ledger.
4. A ledger with 3-second settlement and flat wallet growth is a distribution problem, not a technology problem.
5. Why now: RLUSD, an AMM on mainnet, and an MCP standard that lets agents trade through the same tools as people.
6. We fund the first account because the ledger makes it cost 2.22 XRP, and because it is line one of the learner's track record.
7. Learn, prove, trade: three stages, one terminal, all in production.
8. Humans and AI agents rank on the same numbers, under the same server-enforced limits.
9. The score has consequences: badges are soulbound NFTs, prizes are XRP, the track record is a credential.
10. Tide takes no fee on swaps. The business lives in the venue: buy-ins today, funded traders next, the DEX after.
11. Nobody else sits at the corner of trading education, competitive paper trading and the XRPL DEX.
12. Built in 90 days on primitives that have been on mainnet for years: no smart contract, no bridge, no oracle.
13. The paper perps engine that runs today is the DEX v0. The trader base ships before the venue.

Titles 1, 3, 6, 8, 10, 12 are the strongest; 4 and 5 depend on numbers the market agent must confirm.

---

## 4. The eight hardest questions, with honest answers from the code

1. **"Isn't funding starter accounts from one hot wallet exactly what a sybil farm looks like?"**
   Answer: The flow is designed to be legible on-chain. One starter per learner, capped by `TIDE_PAPER_WALLET_MAX_WALLETS` and a daily cap, funded with 2.22 XRP; the badge is only minted after a real first fill on live prices; the kept account is funded from the starter (not the funder), receives a non-transferable NFT the user must accept, and the starter is retired with `AccountDelete`, leaving a tombstone for audit. The funder holds only the campaign budget. A user with a wallet connects it instead and Tide never touches their keys. If the organiser deduplicates by activation funder, our accounts are still real humans with real trades behind them, and we will say so rather than hide the funder address. (Source: docs/PAPER-WALLET-MAINNET.md, roadmap page "Funded onboarding".)

2. **"Paper trading has no slippage and no fear. Why would a paper score mean anything?"**
   Answer: We agree, and the product is built around it. Paper fills traverse real order books from XRPL, Binance and Hyperliquid, with maker and taker fees and isolated-margin liquidation. Paper is framed as engagement and learning; the serious signal is the Live leg on the native DEX, which is signed by the user and verifiable by transaction hash. The funded-trader evaluation adds server-enforced risk rules (max capital, daily loss, trades, leverage) that already run on agents today. (Source: SPEC.md section 7 "Honnêteté du track record Paper", roadmap "Funded traders".)

3. **"Where is the revenue? You take no fee on swaps."**
   Answer: Three lines, all already modelled in code or spec: tournament buy-ins (tagged `Payment` to a multisig prize pool; the current competition pays 100% to rank 1, so the rake is a parameter not a promise), funded-trader evaluations (H1 2027, priced like every evaluation programme in that market), and the DEX v0 (maker and taker fees on perps settled in RLUSD). The no-fee spot decision is deliberate: it removes the conflict of interest between the school and the learner. (Source: CLAUDE.md "Revenu", roadmap "Why it holds together".)

4. **"Perps with leverage and prediction markets for beginners. Is that responsible, and is it legal?"**
   Answer: In paper mode they are simulations with virtual money; the leverage is simulated, losses are capped at margin, and the curriculum's longest chapters are perps and risk because that is what other platforms do not explain. Live mode today is spot only, XRP against RLUSD, non-custodial. The DEX v0 is custodial by construction and the roadmap says the legal framework has to be set before it opens. Prediction markets: UNVERIFIED as shipped at time of writing; the pitch must not claim them until they are live in the app.

5. **"Why XRPL and not a chain with smart contracts?"**
   Answer: Because everything Tide needs is a native primitive that has been on mainnet for years: `OfferCreate` plus AMM for swaps, `Payment` with Memos for tickets and payouts, XLS-20 for soulbound badges, `SignerListSet` for the prize pool, `AccountDelete` for retiring starters, `SourceTag` for attribution. A 1 XRP reserve and fractional-cent fees are what make funding a learner's first account affordable; on most chains the same flow would cost dollars per user. Native programmability, when it ships, is the trigger for DEX v1, not a dependency of anything before it.

6. **"What stops Binance, Hyperliquid or TradingView from adding a 'graduate to real trading' button?"**
   Answer: They can add a button; they cannot end the simulation on a neutral ledger. A CEX's simulator ends in a deposit to the CEX; TradingView's ends in a broker referral. Tide's ends in an account the learner owns, a credential any XRPL app can read, and a venue with no swap fee. The moat is the credential plus the crowd: track records accumulate on-chain, and leagues and classrooms make the crowd sticky. The competition agent should confirm no incumbent offers a funded on-chain account at graduation.

7. **"Where are your users and volume today?"**
   Answer: We do not put traction numbers in the deck by policy (they are seed data or too early to be meaningful). What we show instead is what is live on mainnet at tidetrade.xyz: funded onboarding, the first cash-prize competition, Live spot on the native DEX, agents under mandate, 1,213 tests, 8 typed workspaces. If the jury wants counters, the `SourceTag` indexer and the Make Waves leaderboard are the source of truth, not our slide.

8. **"Two or three people built this in 90 days. Can this team run a school, a league, a funded-trader programme and a DEX?"**
   Answer: The deck should not claim we can run all four at once. The roadmap is sequenced: education and leagues in Q4 2026 (content and community work on top of a stack that exists), funded traders in H1 2027 (a policy layer on rules already enforced on agents), the DEX after. The 90-day record is the evidence: three stages in production, no smart contract, three separate keys, admin console absent from prod builds, and every claim on the roadmap page verifiable in the code. The "why us" slide should be about that discipline, not about resumes.

Two claims to keep out of the deck until confirmed: prediction markets live in the app, and the exact "active user" definition. Two claims to source before printing: XRPL daily active wallets (14,300) and weekly new wallets (12,400).

---

## Summary (fast read)

1. Make Waves: 90 days, 22 June to 21 Sept 2026, live on mainnet, 50,000 XRP. Source: luma.com/make-waves-on-xrpl.
2. Prize split: 25,000 XRP jury "best overall", 5,000 most users, 5,000 most volume, 1,000 each for 15 projects at 300 active users. Source: thecryptobasic.com 2026-07-13.
3. Half the pool is a jury decision, so the pitch matters as much as the counters.
4. Attribution is by SourceTag; a competitor deduplicates wallets "by activation funder", so present funded onboarding as transparent and human-gated.
5. UNVERIFIED: exact "active user" definition, submission deliverables, demo-day format, Make Waves winners.
6. Ecosystem chart the jury believes: weekly new XRPL wallets flat at 12,400 while tagged tx grow (July 2026); verify before printing.
7. Past XRPL Commons winners: native primitives, one-line pitches, finance or credentials; a "Zero to Users" award exists.
8. Craft rules: assertion headlines, one idea per slide, a real why-now slide, bottom-up market, cover as category claim, team after proof.
9. Judges penalise ambiguity, tours instead of demos, rehashed ideas, and teams who cannot explain their own code.
10. Vision ladder: every future rung must sit on a rung already in production; Tide has four such ladders (risk rules, perps engine, NFTs, funded onboarding).
11. Recommended storyline: A ("the ledger has the exchange, not the crowd") as spine, B ("Learn. Prove. Trade.") as demo middle, C ("merit-based on-ramp") for business and moat.
12. Spine sentence: "Every other simulator stops at the simulation. Tide's ends on the ledger."
13. Five arguments: people not infrastructure; the simulation has consequences; funded onboarding is the trick; one set of rails for humans and agents; the venue at the end.
14. Strongest titles: 1, 3, 6, 8, 10, 12 in section 3.
15. Hardest questions answered in section 4; keep prediction markets and traction numbers out until confirmed.
