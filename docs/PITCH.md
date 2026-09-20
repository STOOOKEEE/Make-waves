# Tide — Make Waves submission text

> Texte de soumission pour le hackathon Make Waves (XRPL Commons). Réécrit le
> 2026-09-14 (v2, positionnement « the merit-based on-ramp to XRPL trading »).
> Même source de vérité que la page publique `#/roadmap`
> (`apps/web/src/data/roadmap/index.ts`) : si un chiffre change ici, il change là.
> Règles de copie : `docs/BRAND.md` § Voice (jamais « risk-free », jamais de
> promesse de gain, aucun chiffre de traction, jamais « prop firm »).

---

## One-liner (≤ 140 characters)

**The XRP Ledger has the exchange. Tide brings the traders: learn with virtual money, prove it, earn real capital, trade on the native DEX.**

## Tagline

**Learn. Prove. Trade.**

---

## Short description (~130 words, for the submission form)

Tide is the merit-based on-ramp to trading on XRPL, built on Mainnet.

People learn with $10,000 of virtual money on markets no simulator offers: crypto spot on the top 250 markets, perpetuals with leverage, and prediction markets on real events, side by side in one terminal. They prove themselves on a leaderboard shared with AI agents, in competitions with cash prizes paid in XRP. Milestones become soulbound NFTs on the ledger. When they are ready, the same terminal flips to Live and signs real swaps on the native XRPL DEX, XRP against RLUSD, every transaction tagged.

Tide creates and funds each learner's first XRPL account, so someone who has never held crypto is on mainnet on day one, without an exchange, a KYC or a purchase. Every learner becomes an XRPL account. Every track record lives on the ledger. The DEX comes at the end.

---

## Long description

### The thesis: why this is the project XRPL needs

XRPL has the infrastructure of an exchange and none of its crowd. A native order book, an AMM, RLUSD, settlement in seconds, and the retail trading crowd is on Binance and Hyperliquid. No project brings people to the DEX. Tide's entire product is that pipeline.

Every other simulator stops at the simulation. TradingView, Investopedia and exchange testnets end when the game ends. Tide's simulation ends on a funded XRPL account, a track record on the ledger, and real capital to trade. The score has consequences.

You paper trade what no simulator offers: crypto spot, perpetuals with leverage, prediction markets on real events. Beginners learn the instruments that define today's trading, not a stock game from the nineties. Tokenised stocks join as they land on XRPL.

The stack is already a funded-trader engine: server-enforced risk rules (max capital, max daily loss, max trades, max leverage, kill switch), custodial accounts encrypted server-side, a Live execution planner on the native DEX, an on-chain reputation. Assembled, they are the path from a first lesson to real capital on XRPL.

Humans and AI agents run on the same rails. Tide is MCP-native: an agent from Claude Desktop or Cursor trades through the same 20 tools a human uses, under a signed mandate. The first venue on XRPL where people and bots compete on one leaderboard.

### Live today at tidetrade.xyz

**01 · Learn.** Tide School: 16 bilingual lessons (EN/FR) across four tracks, from what a market order is to how leverage liquidates you. A 19-step interactive tutorial on live prices where you place a first spot order, open a 10x perp and watch it get liquidated, then size a position at 1% risk. No account needed; by construction it cannot write to the server.

**02 · Prove.** $10,000 of virtual capital on real prices. Crypto spot on the top 250 markets, perpetuals up to 100x with isolated margin, prediction markets on real events. Market and limit orders, TP/SL, maker/taker fees (0.02% / 0.06%), real order books from XRPL, Binance and Hyperliquid. A leaderboard where humans and AI agents rank on the same numbers. **The first competition with a cash prize in XRP is open now.** Milestones become badges, claimable as soulbound XLS-20 NFTs.

**03 · Trade.** Same terminal, one toggle. Live mode signs a real `OfferCreate` on the XRP Ledger through Xaman or GemWallet, non-custodial, XRP/RLUSD, with best execution across the order book and the AMM and a slippage bound computed server-side. Every transaction carries Tide's `SourceTag`; Tide takes no fee on swaps. Competition winnings land in the XRPL account Tide created for the player: the first real XRP a beginner trades is earned, not bought.

### Roadmap: from a first lesson to real capital on XRPL

- **Live now (September 2026).** Funded onboarding (no exchange, no KYC, no purchase). First cash-prize competition, prize paid in XRP on the ledger. Live spot on the native DEX. AI agents under mandate (20 MCP tools, server-enforced limits, kill switch).
- **Next (Q4 2026): education at scale, competition as a habit.** Video lessons, live online workshops and webinars with guests from the XRPL ecosystem. The AI coach: a review after every trade, a weekly report on sizing, discipline and bias, built on the agent stack that exists. Weekly leagues of thirty with promotion and relegation, streaks, shareable result cards. Tide for classrooms: a teacher opens a class, every student gets a funded XRPL account, classes compete. Competitions created by others: an educator, an XRPL project or a community launches its own tournament and funds the prize pool on the multisig account.
- **Then (H1 2027): funded traders.** Pass a paper evaluation under the risk rules the platform already enforces on agents, then trade a funded account on the native DEX under the same server-enforced guards and share the results with Tide. The track record NFTs become an open credential any XRPL app can read: rank, weeks active, competitions won.
- **Later (2027): cross-market, for real.** As Ripple tokenises real-world assets on XRPL, tokenised stocks and indices come to the same terminal, paper first, then live. And the Tide DEX.

### The DEX: TideTrade, the future Hyperliquid, on XRPL

Not available yet, coming next. Hyperliquid proved that a venue is not a matching engine, it is a crowd of traders who trust it. Tide builds the crowd first, and the venue ships in two steps that do not wait for anyone else's roadmap.

- **v0, off-chain matching, on-chain money.** The perpetuals engine that already runs in paper (positions, isolated margin, liquidation, maker and taker fees) goes live. Margin and settlement in RLUSD on the ledger through a multisig clearing account, every settlement a tagged `Payment`.
- **v1, matching on the ledger.** When XRPL's native programmability ships, matching moves on-chain. The trader base, the track records and the liquidity are already there.
- **Why it holds together.** Tide takes no fee on spot. The venue is where the business lives: a school that produces traders, leagues that keep them, a DEX that receives them.

### For XRPL engineers

Everything Tide does on-chain uses primitives that have been live on mainnet for years. No smart contract, no bridge, no oracle.

**Funded onboarding, transaction by transaction.** Why Tide funds the first account: the product is educational, the ledger makes it affordable (an account exists at 1 XRP of reserve), and the account is the first line of the learner's on-chain track record. Cost to Tide: 2.22 XRP per learner, nearly all of which ends in the account they keep.

1. Starter account: generated by Tide, key encrypted AES-256-GCM (never sent to the browser), funded with **2.22 XRP** by a dedicated hot wallet. Until funded, the backend refuses every Paper order.
2. First trade: unlocks the First Trade badge. Nothing is submitted to the ledger at this step.
3. The proof: Tide creates the account the learner keeps, funded by the starter with **1.21 XRP**; the Tide issuer mints the First Trade NFT (XLS-20, non-transferable), offers it for 0 XRP, the account accepts it.
4. The starter retires: `AccountDelete` (0.2 XRP) sends the remaining balance to the kept account; the encrypted key is wiped, a tombstone stays for audit.
5. Existing wallets: Xaman or GemWallet connect instead; Paper runs under the user's address and they sign the NFT acceptance themselves. Tide never holds their keys.

| Primitive | Role in Tide |
|---|---|
| `OfferCreate` + AMM (XLS-30) | Real spot swaps in Live mode, best execution across book and pool |
| `Payment` + `Memos` | Funding of starter accounts, tournament tickets, prize payouts (Memo = competition id) |
| `SourceTag` | On every transaction: the hackathon's attribution counter, read back by our own indexer |
| `NFTokenMint` / `Offer` / `Accept` (XLS-20) | Soulbound badges minted by a dedicated issuer, accepted by the user |
| `AccountDelete` | Retires starter accounts, moves their balance to the kept account |
| `SignerListSet` | Multisig operator account holding prize pools and, in the DEX v0, the clearing account |
| RLUSD | Dollar quote of Live mode, margin currency of the DEX v0 |
| Xaman · GemWallet | Non-custodial signing; payloads are plain XRPL transaction templates |

Deliberately not used: XLS-47 oracles (nothing on-chain consumes them), the EVM sidechain (its activity would not carry the L1 `SourceTag`), `Batch` (disabled). Native smart contracts (XLS-100) are the trigger of the DEX v1, not a dependency of anything before it.

**Stack and security.** Vue 3, Vite, strict TypeScript, dependency-free hash router, typed bilingual content. Node, Fastify, SQLite, a pure domain package (`@tide/core`) with no I/O. `xrpl.js` builders for every tagged transaction type, AMM and book readers, best-execution planner, `engine_result` classifier, attribution indexer. Starter keys AES-256-GCM under a versioned master key, decrypted in memory only to sign; whitelisted response schemas; mainnet-only runtime; three separate keys (hot funder, NFT issuer, cold recovery). `@tide/mcp`: 20 tools, mandates enforced server-side before every call. 1,213 tests, type-checking across 8 workspaces, ESLint with `no-explicit-any` as an error.

---

## Version courte en français

**Le XRP Ledger a la place de marché. Tide amène les traders.**

Tide est la porte d'entrée au mérite vers le trading sur XRPL. On y apprend avec 10 000 $ fictifs sur des marchés qu'aucun simulateur ne propose (spot crypto sur 250 marchés, perpétuels à levier, marchés prédictifs sur de vrais événements), on se prouve sur un classement partagé avec des agents IA et dans des compétitions à cash prize payé en XRP, et les jalons deviennent des NFT soulbound sur le registre. Quand on est prêt, le même terminal bascule en Live et signe de vrais swaps sur le DEX natif, XRP contre RLUSD, chaque transaction taguée.

Tide crée et finance le premier compte XRPL de chaque apprenant : quelqu'un qui n'a jamais tenu de crypto est sur le mainnet dès le premier jour, sans exchange, sans KYC, sans achat. Chaque apprenant devient un compte XRPL. Chaque historique vit sur le registre. Le DEX arrive au bout.

---

## Notes d'usage (ne pas coller dans le formulaire)

- **Marchés prédictifs** : le texte et la page les affirment au présent. Armand les implémente ; ils doivent être en ligne quand le jury ouvre l'app (deadline 2026-09-21), sinon retirer la mention avant soumission.
- **Première compétition à cash prize** : affirmée « ouverte ». À vérifier dans `#/competitions` le jour de la soumission.
- Aucun chiffre de traction (users, volume) : règle `growth/context/05-facts.md`.
- Ne jamais écrire « prop firm » (décision produit) : dire « traders financés » / « funded traders ».
- Le DEX est présenté comme « pas encore disponible, arrive ensuite », avec un plan v0/v1 qui ne dépend pas de la roadmap XRPL. Sa v0 est custodiale par construction : cadre juridique à poser avant ouverture (hors page).
