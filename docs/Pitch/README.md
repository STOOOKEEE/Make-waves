# Tide pitch (Make Waves 2026 + investors)

Everything pitch-related lives here. Built 2026-09-16 from six research memos and the live product.

| File | What it is |
|---|---|
| `tide-pitch-deck.html` | The deck. 12 slides, no appendix, no source footers (sources and the hard-question answers live in `research/`). Self-contained HTML, Tide brand, 16:9, keyboard driven. Published as a private artifact: https://claude.ai/artifact/Gy1sAyxfBUjYcJBmjCKd94 |
| `STORYLINE.md` | The brief the deck is built from: the one sentence, the five load-bearing arguments, the arc, and the honesty corrections versus the roadmap page. |
| `research/01-storytelling-hackathon.md` | Make Waves prizes and judging, pitch craft, three storylines, candidate titles, the eight hard questions. |
| `research/02-market-business.md` | Sourced market numbers, funded-trader industry, perps and prediction markets, revenue lines, bottom-up TAM/SAM/SOM, cost of funding a wallet versus CAC benchmarks. |
| `research/03-xrpl-why-now.md` | XRPL state Q2 2026, the DEX gap, Ripple's institutional roadmap, XRPL front-ends, wallet and reserve facts, comparable on-ramp plays. |
| `research/04-competition-moat.md` | Competitor landscape in five groups, the 2x2, moat rating, risks and mitigations. |
| `research/05-product-claims-demo.md` | Claim-by-claim audit against `main` and production, 3-minute demo storyboard, the wallet-funding argument, vision ladder, team facts. |
| `research/06-deck-design-system.md` | Layout catalogue, CSS base and SVG recipes derived from `docs/BRAND.md`. |
| `assets/` | Product screenshots (tidetrade.xyz, 16 Sept 2026) and the logo used by the deck. |

## Presenting

- Arrow keys or space to advance, `Home` / `End`, `N` toggles speaker notes, `F` fullscreen, `P` prints (one slide per landscape page, use "Save as PDF").
- The URL hash is the slide number (`#5` is the funded-account slide), so any slide can be deep-linked.
- Five-minute cut: cover, problem, insight, product, the unlock, business model, vision, closing (slides 1, 2, 3, 4, 5, 8, 10, 12).
- The ask has no amount yet: set it on slide 11 (speaker notes carry the wording) before the investor version goes out.
- Demo runs alongside the deck, not inside it. Storyboard and the live / pre-recorded split are in `research/05-product-claims-demo.md` section 2.

## Before submission (from the claim audit)

1. Redeploy `main` to production: the `#/roadmap` page and the 33-step tutorial ids are not in the 27 Aug build.
2. Prediction markets are not in the code. The deck lists them under "Next, Q4 2026". Flip to present tense only if they ship before 21 Sept.
3. Align `docs/PITCH.md` and the roadmap page with the code: one wallet funded with 1.21 XRP (not 2.22 XRP, two wallets, AccountDelete), 33 tutorial steps (not 19), 1,224 tests (not 1,213), leverage up to 20x in the terminal.
4. Fund a real prize pot on the live competition before the demo, or do not say "cash prize" out loud.
5. Re-verify the Messari and Evernorth Q2 2026 figures (2.44 M tx/day, 16,587 accounts, 1,111 order-book traders, $482.9 M DEX volume) against the primary reports before printing.
6. Keep an account already past the wallet gate for the live paper order; pre-record the wallet claim, the NFT claim, the agent chat and the Live swap.
