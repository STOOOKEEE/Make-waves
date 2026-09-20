# Make Waves submission form (2026-09-16, education-first version)

## Short Description

Tide is a free, bilingual trading school on the XRP Ledger. Learn with virtual money before risking your own, prove it in competitions, and leave with a funded XRPL account. Live on mainnet.

## Description (max 5000)

TIDE TEACHES PEOPLE TO TRADE BEFORE THEY RISK A SINGLE CENT.

Every year a new generation discovers trading, and most of it learns the hard way: 74 to 89% of retail accounts lose money, and over $150 billion of crypto positions were liquidated in 2025, mostly held by people never taught what leverage does. The places where a beginner could practise do not help: a school stock game ends at a score, an exchange demo ends at "now deposit", and every XRPL front-end starts at "connect a funded wallet". Nobody teaches first.

Tide is, first and foremost, an education project. A free, bilingual school (EN/FR), open to anyone, with no account, no wallet and no money required to start. Its job is to make sure that the first time someone trades with real money, they already know what a stop-loss is, what a liquidation looks like, and how much of their capital they should ever put on one idea.

Tide is built on the XRP Ledger, live on mainnet, because it is a ledger where a school can afford to give every learner a real account. Every simulator stops at the simulation. Tide's ends on the ledger.

LEARN. PROVE. TRADE. (all live at tidetrade.xyz)

01 - Learn. Tide School: 16 lessons across four tracks, written for someone who has never placed an order, from what a market is to how leverage liquidates you. A 33-step guided tutorial on live prices: place a first order, open a 10x perp and watch it get liquidated with fake money, then learn to size a position at 1% risk. The tutorial cannot write to the server by construction; nothing here touches a wallet.

02 - Prove. $10,000 of virtual capital on real prices and real order books: crypto spot on the top 250 markets, perpetuals with leverage, market and limit orders, take-profit and stop-loss, maker and taker fees. A leaderboard, competitions with on-chain tickets and the prize paid in XRP on the ledger, and milestones (first trade, first competition) minted as soulbound NFTs: a track record the learner owns.

03 - Trade. When they are ready, and only then, the same terminal flips to Live and signs a real spot swap on the native XRPL DEX through Xaman or GemWallet, non-custodial, XRP against RLUSD, with best execution across the order book and the AMM. Every transaction carries Tide's SourceTag. Tide takes no fee on swaps: the school never profits from a learner's trades.

WHY WE FUND EVERY LEARNER'S FIRST XRPL ACCOUNT

Our learners come from a lesson, not from an exchange. Many have never held crypto and some cannot afford to buy any just to try. On XRPL, six steps and real money stand between them and lesson one: install a wallet, write down a seed phrase, open an exchange account and pass KYC, buy XRP, withdraw it, lock 1 XRP as reserve. For a free school, that wall is a paywall, and it excludes exactly the people education is for.

So Tide pays the entry. On the learner's first explicit click, Tide generates the account, encrypts its key (AES-256-GCM, never sent to the browser) and funds it with 1.21 XRP from a dedicated hot wallet: the base reserve, the NFT page and a fee margin. Until the account is funded, the backend refuses every paper order. The first real fill unlocks the First Trade badge, minted as a soulbound NFT into that account. Nothing is submitted to the ledger before the human trades, no volume is auto-generated, caps are enforced (total and daily, re-read before every Payment), one XRPL address per person, three separate keys (hot funder, NFT issuer, cold recovery). Someone who already owns a wallet connects Xaman or GemWallet instead; Tide never holds their key.

It costs Tide about $1.55 per learner, and the XRP stays in the learner's balance. Every learner leaves with something real: a funded XRPL account and a track record on the ledger, earned by learning, not bought.

HUMANS AND AI AGENTS UNDER THE SAME RULES

Tide is MCP-native: an agent from Claude Desktop, Cursor or the in-app chat trades through the same 20 tools a human uses, under a signed mandate (max capital, daily loss, trades per day, leverage) enforced by the server before every call, with a kill switch. Beginners learn next to bots that follow the risk rules they are taught.

HOW IT SUSTAINS ITSELF

Learning stays free. Tide earns only where the score has consequences: tournament buy-ins today, classrooms, hosted competitions and an AI coach in Q4 2026, funded-trader evaluations in H1 2027, and later a venue of its own.

ROADMAP

Now: the free school, funded onboarding, on-chain-ticketed competitions, Live spot on the native DEX, AI agents under mandate. Q4 2026: video lessons and workshops, the AI coach, weekly leagues, Tide for classrooms (every student gets a funded XRPL account), prediction markets in paper. H1 2027: funded traders and an open on-chain credential. 2027: tokenised stocks as they land on XRPL, and TideTrade, the perpetuals venue of the XRP Ledger.

Full vision and roadmap, with the on-chain flow transaction by transaction: https://tidetrade.xyz/#/roadmap

## Technical Description (max 1000)

Tide is a free trading school first; the on-chain layer exists so that learning ends in something real. Front: Vue 3 + Vite + strict TypeScript. Back: Node + Fastify + SQLite, a pure domain package (paper, positions, competitions, payouts), xrpl.js builders for every tagged tx, @tide/mcp (20 tools, server-side mandate guard). 1,224 tests.

Native primitives only, no smart contract, no bridge, no oracle: OfferCreate + AMM (Live spot, best execution, slippage bound), Payment + Memos (tickets, payouts), SignerListSet (multisig prize pool), XLS-20 mint/offer/accept (soulbound badges), RLUSD quote, SourceTag on every tx.

Why we fund wallets: learners arrive from a lesson with no wallet and no XRP; the 1 XRP reserve would turn a free school into a paywall. Tide creates the account, encrypts the key (AES-256-GCM), funds 1.21 XRP; no paper order until funded, NFT only after a real fill, caps, one address per person, three keys.

Flow, tx by tx: https://tidetrade.xyz/#/roadmap
