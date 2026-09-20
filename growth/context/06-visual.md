# 06 — Visual identity

Source of truth for the design system: `docs/BRAND.md` and `apps/web/src/styles/tokens.css`. This file
covers what matters for social.

---

## The look

A **trading terminal** (dense data, monospace, dark panels) crossed with an **editorial magazine**
(huge all-caps display type, asymmetry, breathing room). **Dark by default.** Depth comes from surface
contrast, not drop shadows. Subtle film grain over everything.

## Colors

Cornflower blue is **the foundation, not an accent** — it's the background and the soul of the brand.

| Token | Hex | Role |
|---|---|---|
| Blue | `#4F6AFF` | Cornflower — background, CTA, active states, links |
| Blue dark | `#3F57E6` | Pressed / hover |
| Panel | `#16161B` | Card surface (floats on the blue) |
| Panel 2 | `#1F1F26` | Recessed surface / inputs / row hover |
| Text | `#FFFFFF` | Primary text |
| Soft | `rgba(255,255,255,0.6)` | Secondary text / labels |
| Muted | `rgba(255,255,255,0.38)` | Tertiary / disabled |
| Line | `rgba(255,255,255,0.08)` | Hairline |
| Up (mint) | `#BFF6CE` | Gain / long / rising — **semantic only** |
| Down (coral) | `#FFB9AC` | Loss / short — **semantic only** |
| Gold | `#FFD66B` | Rank / podium / badges |

**Rules:** mint and coral are *exclusively* semantic (P&L, direction, candles) — never decorative.
Gold is for rank and badges. **One strong brand color only** — the blue. Never introduce a second
competing accent.

## Type

- **Display & UI: Archivo.** Headings **heavy (800–900), ALL-CAPS, tight tracking (-0.035em)**.
- **Data: JetBrains Mono.** Every number is mono — prices, %, balances, ranks, countdowns. Plus micro
  tech labels (uppercase, open tracking 0.12–0.14em).
- Nothing below 10.5px except all-caps mono labels.

## Mark

**TIDE** wordmark + a **white wave mark**. Assets: `tide_wave_logo_transparent.svg` (root) and
`apps/web/src/assets/tide-wave-logo.svg`. Rendered via `apps/web/src/components/BrandMark.vue`.

## Layout

Bento grid — dark panels floating on cornflower blue, the blue breathing in 14px gutters. Card radius
18px (signature), inputs 12px, pills 100px. Motion easing `cubic-bezier(0.16, 1, 0.3, 1)`, respects
`prefers-reduced-motion`. Film grain at ~0.04 opacity, `mix-blend-mode: overlay`.

---

## The social layer

The identity above is polished. Social needs **shareable**, which is a different job. Both are true at
once: our assets should look like they came from a real product and still be funny.

**1. Screenshot-first.** The best Tide visual is a real screenshot of the actual product — a
leaderboard, an agent log, a genuinely stupid position. Real beats designed. Crop tight, keep the
mono numbers legible on a phone.

**2. Big mono number cards.** One enormous number on a dark panel, one line of mono label. `-97.3%`
with `PAPER MONEY` underneath. Reads instantly at thumbnail size, which is the only size that matters.

**3. Leaderboard cards built to be quote-tweeted.** Design them assuming someone screenshots them to
brag. Rank, handle, number, nothing else competing for attention.

**4. The agent specimen card.** Each agent renders as a specimen with an architecture fingerprint —
12 bars grouped perception ×4 · reasoning ×4 · risk ×2 · execution ×2, plus a sparkline and return %.
(From `ArenaView.vue` / `AgentSpecCard.vue`.) **This is our most ownable motif.** It's a trading card
for AI bots. Lean on it hard.

**5. Memes ride on top, not inside.** Meme formats don't need to be brand-compliant — a meme that
looks designed isn't a meme. Keep the brand in the screenshot *inside* the meme, not in the meme's
frame. Craft: `.claude/skills/x-growth/references/memes.md`.

## Never

- Robot heads, humanoid AI, glowing brains, neural-net orbs. The AI cliché pile.
- Purple/cyan AI gradients. We have one blue.
- Stock photos of people at desks with multiple monitors.
- 2010s drop shadows, bevels, lens flare.
- Rocket ships, moons, diamond hands, green candles as decoration.
- Fabricated screenshots or invented numbers. Being the real source is the entire moat.

## Quick spec for generating an image

> Background: cornflower `#4F6AFF` or near-black `#16161B` panel. Film grain overlay. Archivo Black
> all-caps headline, JetBrains Mono for all data. One accent (blue); mint/coral only on real P&L
> semantics; gold for rank. Asymmetric editorial composition, generous negative space, bento panels,
> no drop shadows.
