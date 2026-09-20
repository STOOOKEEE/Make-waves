# Tide pitch deck: design system

> Research note 06 (deck design). Scope: the visual and technical system of the deck, not its content.
> Source of truth for the brand: `docs/BRAND.md` and `apps/web/src/styles/tokens.css`. Everything below derives from them.
> Written 2026-09-16.

---

## 1. What the best decks do, and what transfers to Tide

Studied: the Slidebean teardown of the Airbnb deck, the five minute hackathon structure used at ETHGlobal style events, and the editorial style of Linear, Vercel, Ramp and phantom.land marketing pages (large assertion type, dense data in monospace, dark panels, almost no decoration).

Rules that survive contact with the Tide brand:

| Rule | Where it comes from | Tide application |
|---|---|---|
| The title is the argument, never a label | Slidebean, "headers should function as assertions" | Every slide title is a full sentence in Archivo 900 uppercase. "Market" is banned as a title; "The ledger has liquidity, not traders" is the title. |
| One idea per slide, each statement on one line | Slidebean, hacktribe | Body copy is at most three lines of 16 to 22 px at 1920 wide. If a slide needs a paragraph, it is two slides. |
| Ten seconds per slide on a first read | qubit.capital investor reading data | Every number is in JetBrains Mono, large, and readable from four metres. Nothing under 20 px on the stage except mono labels. |
| Demo slides show a journey, not a feature list | hacktribe | Screenshot slides show start state, key action, result, cropped tight, with numbered callouts. |
| Competition is a two axis map, us top right | Slidebean | A 2x2 map: "stops at simulation vs ends in real capital" against "stock game vs today's instruments". |
| Market sizing narrows from big to serviceable | Airbnb original | A funnel whose widths are proportional to the numbers, no pie charts. |
| Consistent typeface, palette, layout; decoration removed | all sources | Two typefaces, one strong colour, dark panels, grain. No icons packs, no gradients, no shadows. |
| Five to seven slides for a five minute pitch, fourteen for a reading deck | hacktribe, Slidebean | Build the full reading deck; mark a "five minute cut" of slides with a data attribute so the presenter can skip. |

Editorial rules borrowed from phantom.land and the Tide landing:

- Asymmetry over centring. Titles sit left, numbers sit right, white space is a design element.
- Scale contrast. One giant title next to a tiny mono eyebrow is the signature move.
- Panels float. Dark `#16161B` cards on the blue ground with a 14 px gutter; the blue breathes between them.
- Colour is semantic. Mint `#BFF6CE` only on a gain, long or upward curve. Coral `#FFB9AC` only on a loss or short. Gold `#FFD66B` only on a prize. Amber `#FF9D3C` only to mark the Live mode. Never as decoration, never as a chart series for a non semantic quantity.
- Grain over everything at 4 percent, `mix-blend-mode: overlay`.

Brand constraints restated as deck constraints:

- Hook titles: Archivo 800 or 900, uppercase, tracking `-0.035em`, line height 0.86 to 0.92.
- Explanatory titles over five words that are not hooks: sentence case, Archivo 700 (the BRAND.md pedagogy exception).
- All numbers, labels, axes, table cells: JetBrains Mono.
- Text never below 20 px on a 1920 stage except mono eyebrow labels at 17 px uppercase.
- No em dashes anywhere in copy. Use a period, a colon or a middle dot.

---

## 2. Stage and scaling model

The deck is authored at a fixed 1920 by 1080 stage. The stage is scaled uniformly to fit the viewport with `transform: scale()`. Because scaling is uniform, a layout that fits at 1920 by 1080 fits at 1280 by 720 with the same proportions; there is no reflow, so there is no overflow.

```
viewport 1280x720          viewport 1920x1080         viewport 2560x1440 (letterbox)
+--------------------+     +----------------------+   +------------------------------+
| stage scale .667   |     | stage scale 1        |   |   blue    stage 1.333   blue |
+--------------------+     +----------------------+   +------------------------------+
```

Safe area: 96 px padding on all sides of the stage. Content lives inside 1728 by 888.

Vertical rhythm inside the safe area:

```
y   0    eyebrow (mono 17px)
y  40    title block (up to 3 lines of h1 at 112px, or 1 line of giant at 200px)
y 420    body / visual zone
y 840    footer row: slide counter left, source note right (mono 15px)
```

---

## 3. Layout catalogue

Legend: `[E]` eyebrow, `[T]` title, `[B]` body, `[N]` big number, `[P]` panel, `[V]` visual.

### 3.1 Cover

```
+----------------------------------------------------------------------+
| (o) TIDE                                    FOR XRPL · MAKE WAVES 26 |
|                                                                      |
|                                                                      |
|  THE XRP LEDGER                                                      |
|  HAS THE EXCHANGE.                                                   |
|  TIDE BRINGS                                                         |
|  THE TRADERS.                                          tidetrade.xyz |
|                                                                      |
|  Learn. Prove. Trade.                    [live pill]  XRPL MAINNET   |
+----------------------------------------------------------------------+
```

CSS: `.slide.cover .h-giant` at 200 px, four lines max, left aligned, bottom anchored (`justify-content:flex-end`). Logo mark 56 px top left. The mark and the wordmark are the only white elements above the title. Ground is the blue; no panel on the cover.

### 3.2 Assertion (one sentence, nothing else)

```
+----------------------------------------------------------------------+
| [E] THE INSIGHT                                                      |
|                                                                      |
|                                                                      |
|      EVERY SIMULATOR                                                 |
|      STOPS AT THE                                                    |
|      SIMULATION.                                                     |
|                                                                      |
|                                                                      |
|                                                    [footnote mono]   |
+----------------------------------------------------------------------+
```

Used for the hook, the insight, the "why now" pivot, and the closing line. Title at 176 to 200 px, max three lines, max seven words. The one place the title may be centred vertically. Optional single word in `--gold` or `--up` only if it carries a semantic meaning (a prize, a gain).

### 3.3 Big number

```
+----------------------------------------------------------------------+
| [E] MARKET · CRYPTO DERIVATIVES                                      |
| [T] The crowd trades perps. XRPL has none of that crowd.             |
|                                                                      |
|   +------------------------+  +------------------------+             |
|   | 24H PERP VOLUME        |  | XRPL DEX 24H VOLUME    |             |
|   |                        |  |                        |             |
|   |  $XXX B                |  |  $XX M                 |             |
|   |  source · date         |  |  source · date         |             |
|   +------------------------+  +------------------------+             |
|                                                     ratio callout    |
+----------------------------------------------------------------------+
```

`.kpi` panel: label mono 17 px uppercase, number mono 700 at 136 px, source line mono 15 px in `--mut2`. Two to three KPIs max. When comparing magnitudes, add the ratio as a mono line ("1 to 1,000") rather than a third bar.

### 3.4 Two column argument

```
+----------------------------------------------------------------------+
| [E] THE PROBLEM                                                      |
| [T] The ledger has liquidity,           |  +--------------------+    |
|     not traders.                        |  | [P] evidence       |    |
|                                         |  |  bar chart / quote |    |
| [B] three lines max                     |  |  or screenshot     |    |
|                                         |  +--------------------+    |
|                                         |                            |
|  · point one (mono bullet)              |                            |
|  · point two                            |                            |
+----------------------------------------------------------------------+
```

Grid `1fr 1fr` with 40 px gap. Left column: title 96 px, body 24 px, up to three mono bullets using `·`. Right column: one panel with one visual. Never two visuals.

### 3.5 Three step flow (Learn / Prove / Trade)

```
+----------------------------------------------------------------------+
| [E] THE PRODUCT                                                      |
| [T] One terminal. Three stages.                                      |
|                                                                      |
| +----------------+  ->  +----------------+  ->  +----------------+   |
| | 01 LEARN       |      | 02 PROVE       |      | 03 TRADE  LIVE |   |
| | h3             |      | h3             |      | h3   (amber)   |   |
| | 2 lines body   |      | 2 lines body   |      | 2 lines body   |   |
| | k: v   k: v    |      | k: v   k: v    |      | k: v   k: v    |   |
| +----------------+      +----------------+      +----------------+   |
|   free · no wallet        virtual capital         real XRP, tagged   |
+----------------------------------------------------------------------+
```

Grid `1fr auto 1fr auto 1fr`; `.flow-arrow` is a 40 px wide SVG chevron in `--soft`. The third panel carries the `.tag-live` pill in amber: this is the one allowed use of `--live` in the deck. Mono key value rows at 20 px in the panel footer.

### 3.6 Funnel

```
+----------------------------------------------------------------------+
| [E] MARKET                                                           |
| [T] Sized from the people, not the volume.                           |
|                                                                      |
|   ##########################################  label   N   source     |
|        ################################       label   N   source     |
|             ######################            label   N   source     |
|                  ##########                   label   N   source     |
|                                                                      |
| [B] one line on the method                                           |
+----------------------------------------------------------------------+
```

Bars are centred, widths proportional to `log10(N)` when values span more than two orders of magnitude, linear otherwise; say which in the footnote. Bars are `--panel`; the narrowest one, the serviceable market, is white with blue text. Labels right aligned in a fixed 560 px lane so numbers stack.

### 3.7 Competitor matrix

Two variants. The 2x2 map is preferred; the table is the appendix.

```
2x2 map                                     Table
+------------------------------------+      +------------------+----+----+----+
|  ends in real capital              |      |                  | TV | Ex | Ti |
|        ^                           |      | Real prices      | x  | x  | x  |
|        |             (o) TIDE      |      | Perps + spot     |    | x  | x  |
|        |                           |      | Prediction mkts  |    |    | x  |
|  ------+---------------->          |      | Ends in funded   |    |    | x  |
|        |  stock game   today's     |      |   XRPL account   |    |    |    |
|  TradingView  Investopedia         |      | On chain record  |    |    | x  |
|  stops at simulation               |      +------------------+----+----+----+
+------------------------------------+
```

Map: axes are hairlines in `--line2`, axis labels mono 17 px, competitor dots 14 px in `--soft` with names in mono, Tide is the logo mark at 48 px, top right. Table: header row mono, checks drawn as a 12 px white square, empties as a 12 px `--line2` outline. No ticks and crosses in colour.

### 3.8 Roadmap timeline (now / next / then / later)

```
+----------------------------------------------------------------------+
| [E] ROADMAP                                                          |
| [T] From a first lesson to real capital on XRPL.                     |
|                                                                      |
|  o======o----------o----------o                                      |
|  NOW     NEXT       THEN       LATER                                 |
|  SEP 26  Q4 26      H1 27      2027                                  |
|  +-----+ +-------+  +-------+  +-------+                             |
|  |live | |video  |  |funded |  |token- |                             |
|  |list | |coach  |  |traders|  |ised   |                             |
|  |     | |leagues|  |repute |  |DEX    |                             |
|  +-----+ +-------+  +-------+  +-------+                             |
+----------------------------------------------------------------------+
```

`.timeline` is a 4 px rail; the segment up to NOW is white (shipped), the rest is `--line2`. Milestone dots 16 px. The NOW column panel gets a white 1 px border to read as "in production". Three bullets per column, mono, 20 px.

### 3.9 Screenshot with callouts

```
+----------------------------------------------------------------------+
| [E] LIVE AT TIDETRADE.XYZ                                            |
| [T] Same terminal, one toggle.                                       |
|  +--------------------------------------------------+   (1) callout |
|  |                                                  |   one line    |
|  |   product screenshot, cropped to the deck,       |               |
|  |   no browser chrome, 18 px radius, 1px --line2   |   (2) callout |
|  |                                                  |   one line    |
|  |                                                  |               |
|  +--------------------------------------------------+   (3) callout |
+----------------------------------------------------------------------+
```

Screenshot occupies 62 percent width; callouts are numbered white circles 28 px with blue digits, matching circles overlaid on the image at absolute positions. Three callouts max. If the screenshot is a Live mode screen, the callout on the mode bar may be amber.

### 3.10 Ledger flow (transaction by transaction)

The "why we fund wallets" diagram. Drawn as three account nodes and tagged transaction edges.

```
+----------------------------------------------------------------------+
| [E] WHY TIDE FUNDS THE FIRST ACCOUNT                                 |
| [T] 2.22 XRP turns a visitor into a mainnet account.                 |
|                                                                      |
|  [FUNDER]  --Payment 2.22 XRP-->  [STARTER]  --Payment 1.21 XRP-->  [KEPT]   |
|   hot wallet                     encrypted key      ^                  ^      |
|                                       |             |  NFTokenMint     |      |
|                                       |             |  Offer · Accept  |      |
|                                       +--AccountDelete 0.2 XRP, rest-->+      |
|                                                                               |
|  every edge carries SourceTag        cost to Tide 2.22 XRP · learner keeps ~2 |
+----------------------------------------------------------------------+
```

Nodes: `.panel` 260 by 140 with a mono label and an address style eyebrow (`r…`). Edges: SVG paths 2 px in white with a small mono label on a `--panel2` chip; the AccountDelete edge loops below and is dashed. Amount labels mono 700. The learner's kept account node has a white border. See section 5.6 for the SVG.

### 3.11 Team

```
+----------------------------------------------------------------------+
| [E] WHY US                                                           |
| [T] Two people, one shipping rhythm.                                 |
|                                                                      |
|  +---------------------------+   +---------------------------+       |
|  | [ photo 200x200, 18px r ] |   | [ photo ]                 |       |
|  | NAME            (mono)    |   | NAME                      |       |
|  | role · one line           |   | role · one line           |       |
|  | proof · one line          |   | proof · one line          |       |
|  +---------------------------+   +---------------------------+       |
|                                                                      |
|  mono strip: 1,213 tests · 8 workspaces · mainnet only · 0 as any    |
+----------------------------------------------------------------------+
```

Photos greyscale with a blue multiply is acceptable but optional; never a gradient overlay. The mono strip at the bottom is the engineering credibility line.

### 3.12 Closing

```
+----------------------------------------------------------------------+
| (o) TIDE                                                             |
|                                                                      |
|  EVERY LEARNER                                                       |
|  BECOMES AN                                                          |
|  XRPL ACCOUNT.                                                       |
|                                                                      |
|  tidetrade.xyz          [ Open the terminal ]  [ Tide School ]       |
|                                                            @handle   |
+----------------------------------------------------------------------+
```

Mirror of the cover: giant title, white pill CTA and a line pill, mono URL. A QR code (pure SVG, generated offline) may sit bottom right at 160 px if the deck is projected.

---

## 4. CSS base (self contained, drop into the deck HTML)

Companion HTML skeleton:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">

<div class="deck" id="deck">
  <section class="slide cover" data-cut="5min">…</section>
  <section class="slide">…</section>
</div>
<div class="grain" aria-hidden="true"></div>
<div class="progress" aria-hidden="true"><i></i></div>
<div class="counter mono" aria-live="polite"><span id="cur">01</span> / <span id="tot">00</span></div>
```

```css
/* ===== TIDE DECK · base ===== */
:root {
  --blue: #4f6aff; --blue-dk: #3f57e6;
  --panel: #16161b; --panel2: #1f1f26;
  --text: #ffffff; --soft: rgba(255,255,255,.6); --mut2: rgba(255,255,255,.38);
  --line: rgba(255,255,255,.08); --line2: rgba(255,255,255,.16); --line3: rgba(255,255,255,.22);
  --up: #bff6ce; --down: #ffb9ac; --gold: #ffd66b; --live: #ff9d3c;
  --disp: "Archivo", Helvetica, Arial, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
  --ease: cubic-bezier(.16,1,.3,1);
  --W: 1920; --H: 1080; --pad: 96px; --gap: 14px; --r: 18px;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--blue); color: var(--text);
  font-family: var(--disp); font-weight: 500; overflow: hidden; }
html { color-scheme: dark; }

/* ---- stage: authored at 1920x1080, scaled uniformly ---- */
.deck { position: fixed; inset: 0; }
.slide {
  position: absolute; top: 50%; left: 50%;
  width: calc(var(--W) * 1px); height: calc(var(--H) * 1px);
  padding: var(--pad);
  transform: translate(-50%, -50%) scale(var(--s, 1));
  transform-origin: center;
  display: none; flex-direction: column; background: var(--blue);
  overflow: hidden;
}
.slide.active { display: flex; }

/* ---- type scale (px on the 1920 stage) ---- */
.eyebrow, .label { font-family: var(--mono); font-size: 17px; font-weight: 500;
  letter-spacing: .12em; text-transform: uppercase; color: var(--soft); }
.eyebrow { margin: 0 0 40px; display: flex; gap: 22px; align-items: center; }
.eyebrow::before { content: ""; width: 10px; height: 10px; background: var(--text);
  transform: rotate(45deg); display: inline-block; }
.h-giant { font-size: 200px; font-weight: 900; line-height: .86; letter-spacing: -.035em;
  text-transform: uppercase; margin: 0; max-width: 1600px; }
.h1 { font-size: 112px; font-weight: 900; line-height: .92; letter-spacing: -.035em;
  text-transform: uppercase; margin: 0 0 40px; max-width: 1500px; }
.h1.sentence { text-transform: none; font-weight: 800; letter-spacing: -.03em; font-size: 96px; }
.h2 { font-size: 58px; font-weight: 800; line-height: .94; letter-spacing: -.03em; margin: 0 0 22px; }
.h3 { font-size: 30px; font-weight: 800; letter-spacing: -.01em; margin: 0 0 12px; }
.lead { font-size: 26px; line-height: 1.4; max-width: 1100px; color: var(--text); margin: 0; }
.body { font-size: 22px; line-height: 1.45; max-width: 900px; color: var(--soft); margin: 0; }
.mono { font-family: var(--mono); }
.num { font-family: var(--mono); font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.num.xl { font-size: 136px; line-height: 1; }
.num.lg { font-size: 72px; line-height: 1; }
.num.md { font-size: 36px; line-height: 1; }
.foot { position: absolute; left: var(--pad); right: var(--pad); bottom: 48px;
  display: flex; justify-content: space-between; font-family: var(--mono);
  font-size: 15px; color: var(--mut2); letter-spacing: .06em; }
.up { color: var(--up); } .down { color: var(--down); } .gold { color: var(--gold); }

/* ---- surfaces ---- */
.panel { background: var(--panel); border-radius: var(--r); padding: 40px; overflow: hidden;
  position: relative; }
.panel.sunken { background: var(--panel2); }
.panel.outlined { box-shadow: inset 0 0 0 1px var(--line2); }   /* the only "shadow": a hairline */
.panel.white { background: var(--text); color: var(--blue); }
.grid-bento { display: grid; gap: var(--gap); }
.grid-bento.cols-2 { grid-template-columns: 1fr 1fr; }
.grid-bento.cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-bento.cols-4 { grid-template-columns: repeat(4, 1fr); }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; flex: 1; }
.fill { flex: 1; min-height: 0; }

/* ---- kpi ---- */
.kpi { display: flex; flex-direction: column; gap: 18px; min-height: 300px; justify-content: space-between; }
.kpi .label { color: var(--soft); }
.kpi .num { color: var(--text); }
.kpi .src { font-family: var(--mono); font-size: 15px; color: var(--mut2); letter-spacing: .04em; }

/* ---- pills, tags ---- */
.pill { display: inline-flex; align-items: center; gap: 10px; padding: 12px 22px; border-radius: 100px;
  font-family: var(--mono); font-size: 17px; letter-spacing: .08em; text-transform: uppercase;
  border: 1px solid rgba(255,255,255,.4); color: var(--text); }
.pill.solid { background: var(--text); color: var(--blue); border-color: var(--text); font-weight: 700; }
.pill.dark { background: var(--panel); border-color: var(--panel); }
.tag-live { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 100px;
  background: rgba(255,157,60,.16); color: var(--live); font-family: var(--mono);
  font-size: 15px; letter-spacing: .1em; text-transform: uppercase; }
.tag-live::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--live);
  animation: blink 1.6s infinite; }
.tag-on { composes: tag-live; }  /* alias, not supported natively: copy .tag-live and swap colour to --up */
@keyframes blink { 50% { opacity: .3; } }

/* ---- bullets (mono middle dot) ---- */
.dots { list-style: none; margin: 22px 0 0; padding: 0; display: grid; gap: 12px; }
.dots li { font-size: 22px; line-height: 1.4; padding-left: 34px; position: relative; color: var(--text); }
.dots li::before { content: "·"; position: absolute; left: 0; top: -2px; font-family: var(--mono);
  font-size: 30px; color: var(--soft); }

/* ---- flow (three step) ---- */
.flow { display: grid; grid-template-columns: 1fr 48px 1fr 48px 1fr; gap: 22px; align-items: stretch; flex: 1; }
.flow .panel { display: flex; flex-direction: column; }
.flow .idx { font-family: var(--mono); font-size: 17px; letter-spacing: .12em; color: var(--soft); margin-bottom: 22px; }
.flow .kv { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 22px;
  font-family: var(--mono); font-size: 18px; border-top: 1px solid var(--line); padding-top: 18px; }
.flow .kv b { color: var(--text); font-weight: 700; } .flow .kv span { color: var(--soft); }
.flow-arrow { align-self: center; width: 48px; height: 48px; color: var(--soft); }

/* ---- timeline ---- */
.timeline { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--gap); padding-top: 64px; flex: 1; }
.timeline::before { content: ""; position: absolute; left: 0; right: 0; top: 22px; height: 4px; background: var(--line2); border-radius: 2px; }
.timeline::after { content: ""; position: absolute; left: 0; width: var(--done, 12%); top: 22px; height: 4px; background: var(--text); border-radius: 2px; }
.timeline .col { position: relative; }
.timeline .col::before { content: ""; position: absolute; top: -50px; left: 0; width: 16px; height: 16px;
  border-radius: 50%; background: var(--line2); }
.timeline .col.now::before { background: var(--text); }
.timeline .when { font-family: var(--mono); font-size: 17px; letter-spacing: .12em; text-transform: uppercase; color: var(--soft); margin-bottom: 14px; }
.timeline .when b { color: var(--text); margin-right: 12px; }
.timeline .col.now .panel { box-shadow: inset 0 0 0 1px rgba(255,255,255,.6); }
.timeline .panel ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px;
  font-family: var(--mono); font-size: 19px; line-height: 1.3; }

/* ---- table (competitor) ---- */
.table { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 20px; }
.table th, .table td { text-align: left; padding: 18px 22px; border-bottom: 1px solid var(--line); }
.table th { font-size: 16px; letter-spacing: .12em; text-transform: uppercase; color: var(--soft); font-weight: 500; }
.table td.c { text-align: center; }
.table .yes { display: inline-block; width: 14px; height: 14px; background: var(--text); border-radius: 2px; }
.table .no { display: inline-block; width: 14px; height: 14px; border: 1px solid var(--line2); border-radius: 2px; }
.table tr.us td { background: rgba(255,255,255,.06); }

/* ---- screenshot ---- */
.shot { border-radius: var(--r); overflow: hidden; box-shadow: inset 0 0 0 1px var(--line2); position: relative; background: var(--panel); }
.shot img { display: block; width: 100%; height: auto; }
.callout { position: absolute; width: 32px; height: 32px; border-radius: 50%; background: var(--text); color: var(--blue);
  font-family: var(--mono); font-weight: 700; font-size: 17px; display: grid; place-items: center; }
.callouts { display: grid; gap: 22px; align-content: start; }
.callouts li { list-style: none; display: grid; grid-template-columns: 32px 1fr; gap: 16px; align-items: start; font-size: 22px; line-height: 1.35; }

/* ---- logo mark (inline svg wrapper) ---- */
.mark { width: 56px; height: 56px; display: inline-block; vertical-align: middle; }
.wordmark { font-weight: 900; letter-spacing: -.02em; font-size: 34px; text-transform: uppercase; }

/* ---- chrome: grain, progress, counter ---- */
.grain { pointer-events: none; position: fixed; inset: 0; opacity: .04; mix-blend-mode: overlay; z-index: 9;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
.progress { position: fixed; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,.12); z-index: 10; }
.progress i { display: block; height: 100%; width: 0; background: var(--text); transition: width .3s var(--ease); }
.counter { position: fixed; right: 24px; bottom: 16px; font-size: 13px; letter-spacing: .12em; color: var(--soft); z-index: 10; }

/* ---- reveal ---- */
.rv { opacity: 0; transform: translateY(24px); transition: opacity .9s var(--ease), transform .9s var(--ease); }
.slide.active .rv { opacity: 1; transform: none; }
.slide.active .rv:nth-child(2) { transition-delay: .08s; }
.slide.active .rv:nth-child(3) { transition-delay: .16s; }
.slide.active .rv:nth-child(4) { transition-delay: .24s; }
.slide.active .rv:nth-child(5) { transition-delay: .32s; }
.slide.active .rv:nth-child(n+6) { transition-delay: .4s; }
.draw path { stroke-dasharray: 2000; stroke-dashoffset: 2000; }
.slide.active .draw path { animation: draw 1.6s var(--ease) forwards .2s; }
@keyframes draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .rv, .progress i { transition: none; } .rv { opacity: 1; transform: none; }
  .draw path { stroke-dashoffset: 0; animation: none; } .tag-live::before { animation: none; }
}

/* ---- print: one slide per landscape page ---- */
@page { size: 1920px 1080px; margin: 0; }
@media print {
  html, body { overflow: visible; height: auto; background: var(--blue); }
  .deck { position: static; }
  .slide { display: flex !important; position: relative; top: auto; left: auto; transform: none;
    page-break-after: always; break-after: page; }
  .slide:last-child { page-break-after: auto; }
  .grain, .progress, .counter { display: none; }
  .rv { opacity: 1; transform: none; } .draw path { stroke-dashoffset: 0; animation: none; }
}
```

Navigation script (keeps the URL hash per slide, scales the stage, and prints on request):

```js
(() => {
  const slides = [...document.querySelectorAll(".slide")];
  const bar = document.querySelector(".progress i");
  const cur = document.getElementById("cur"), tot = document.getElementById("tot");
  const pad = n => String(n).padStart(2, "0");
  tot.textContent = pad(slides.length);
  let i = 0;

  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    document.documentElement.style.setProperty("--s", s.toFixed(4));
  }
  function show(n, push = true) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((el, k) => el.classList.toggle("active", k === i));
    bar.style.width = ((i + 1) / slides.length * 100) + "%";
    cur.textContent = pad(i + 1);
    if (push) history.replaceState(null, "", "#" + (i + 1));
  }
  function fromHash() { const n = parseInt(location.hash.slice(1), 10); show(isNaN(n) ? 0 : n - 1, false); }

  addEventListener("resize", fit);
  addEventListener("hashchange", fromHash);
  addEventListener("keydown", e => {
    if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(e.key)) { e.preventDefault(); show(i + 1); }
    else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); show(i - 1); }
    else if (e.key === "Home") show(0);
    else if (e.key === "End") show(slides.length - 1);
    else if (e.key === "f") document.documentElement.requestFullscreen?.();
    else if (e.key === "p") print();
  });
  addEventListener("click", e => { if (!e.target.closest("a,button")) show(i + 1); });
  fit(); fromHash();
})();
```

Notes on the base:

- `.slide` is `display:none` unless active, so only one 1920 by 1080 stage is laid out at a time; `transform` scaling keeps text crisp.
- Reveal delays use `:nth-child` on `.rv` siblings so any slide gets a stagger without inline styles.
- The stroke draw animation uses a fixed dash length of 2000 units; longer paths need a larger value on the element.
- Fonts: Archivo 700, 800, 900 and JetBrains Mono 500, 700 from Google Fonts. If the deck must work offline, download the two families and inline them as `@font-face` with base64 WOFF2; the fallback stack is already in the tokens.
- `composes` is not native CSS. The `.tag-on` line is a reminder to copy the rule; delete it in the final file.

---

## 5. Visual recipes (pure SVG and CSS)

All recipes use a 1000 wide viewBox so they scale inside any panel. Colours through CSS variables via `fill="currentColor"` or `var(--x)` in style attributes. Every axis and value label is mono at 17 to 20 px stage size.

### 5.1 Bar comparison with a broken axis

For two values that differ by orders of magnitude (a CEX daily volume against the XRPL DEX daily volume), a linear chart hides the smaller bar and a log chart hides the gap. Use a broken axis: the tall bar is cut with a zigzag and its true value is written on top.

```html
<svg viewBox="0 0 1000 420" class="chart" font-family="JetBrains Mono, monospace">
  <!-- baseline -->
  <line x1="60" y1="360" x2="940" y2="360" stroke="var(--line2)" stroke-width="2"/>
  <!-- tall bar, broken -->
  <rect x="180" y="40" width="220" height="320" fill="var(--panel2)"/>
  <polygon points="180,150 236,130 292,150 348,130 400,150 400,170 348,150 292,170 236,150 180,170" fill="var(--blue)"/>
  <text x="290" y="28" text-anchor="middle" fill="#fff" font-size="30" font-weight="700">$XXX B</text>
  <text x="290" y="395" text-anchor="middle" fill="var(--soft)" font-size="17" letter-spacing="2">VENUE A · 24H</text>
  <!-- small bar, true scale relative to the visible stub -->
  <rect x="600" y="336" width="220" height="24" fill="#fff"/>
  <text x="710" y="316" text-anchor="middle" fill="#fff" font-size="30" font-weight="700">$XX M</text>
  <text x="710" y="395" text-anchor="middle" fill="var(--soft)" font-size="17" letter-spacing="2">XRPL DEX · 24H</text>
  <!-- ratio callout -->
  <text x="940" y="200" text-anchor="end" fill="var(--soft)" font-size="20">ratio ≈ 1 : N</text>
</svg>
```

Rule: the small bar height must be proportional to the value against the visible stub of the tall bar (the part below the break), so that the ratio is honest within the visible region. Put the axis break note in the footer: "axis broken; values as labelled".

### 5.2 Funnel with proportional widths

Widths are computed, not drawn by eye. For values `v[i]`, width `w[i] = Wmax * f(v[i]) / f(v[0])` where `f` is identity (linear) or `log10` (when spans exceed two orders). State the mapping in the footer.

```html
<svg viewBox="0 0 1000 400" font-family="JetBrains Mono, monospace">
  <!-- widths computed offline: w = [900, 620, 380, 160] -->
  <rect x="50"  y="20"  width="900" height="70" rx="12" fill="var(--panel)"/>
  <rect x="190" y="110" width="620" height="70" rx="12" fill="var(--panel)"/>
  <rect x="310" y="200" width="380" height="70" rx="12" fill="var(--panel)"/>
  <rect x="420" y="290" width="160" height="70" rx="12" fill="#fff"/>
  <g fill="#fff" font-size="22" font-weight="700" text-anchor="middle">
    <text x="500" y="65">LABEL A · N</text>
    <text x="500" y="155">LABEL B · N</text>
    <text x="500" y="245">LABEL C · N</text>
    <text x="500" y="335" fill="var(--blue)">TIDE SAM · N</text>
  </g>
</svg>
```

Alternative when labels do not fit inside a narrow bar: bars left aligned at `x=50`, labels in a right lane at `x=980` with `text-anchor="end"`.

### 5.3 Equity curve

A single polyline in `--up` that draws itself. Only use mint if the curve ends above its start; if the story is a drawdown, use `--down`. Grid lines are hairlines.

```html
<svg viewBox="0 0 1000 300" class="draw">
  <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--up)" stop-opacity=".22"/><stop offset="1" stop-color="var(--up)" stop-opacity="0"/>
  </linearGradient></defs>
  <g stroke="var(--line)" stroke-width="1">
    <line x1="0" y1="75" x2="1000" y2="75"/><line x1="0" y1="150" x2="1000" y2="150"/><line x1="0" y1="225" x2="1000" y2="225"/>
  </g>
  <path d="M0,230 L80,214 L160,226 L240,190 L320,198 L400,160 L480,168 L560,120 L640,132 L720,96 L800,104 L880,70 L1000,58 V300 H0 Z" fill="url(#fill)" stroke="none"/>
  <path d="M0,230 L80,214 L160,226 L240,190 L320,198 L400,160 L480,168 L560,120 L640,132 L720,96 L800,104 L880,70 L1000,58" fill="none" stroke="var(--up)" stroke-width="3" stroke-linejoin="round"/>
</svg>
```

A curve on a deck must be real data or clearly labelled as an illustration in the footer ("illustrative shape, not a track record"). BRAND.md forbids presenting paper performance as traction.

### 5.4 2x2 positioning map

```html
<svg viewBox="0 0 1000 620" font-family="JetBrains Mono, monospace" font-size="17" letter-spacing="2">
  <line x1="500" y1="40" x2="500" y2="580" stroke="var(--line2)" stroke-width="2"/>
  <line x1="60" y1="310" x2="940" y2="310" stroke="var(--line2)" stroke-width="2"/>
  <g fill="var(--soft)">
    <text x="500" y="24" text-anchor="middle">ENDS IN REAL CAPITAL ON CHAIN</text>
    <text x="500" y="608" text-anchor="middle">STOPS AT THE SIMULATION</text>
    <text x="60" y="300">STOCK GAME</text>
    <text x="940" y="300" text-anchor="end">TODAY'S INSTRUMENTS</text>
  </g>
  <!-- competitors: dot + name -->
  <g fill="#fff">
    <circle cx="180" cy="470" r="8" fill="var(--soft)"/><text x="200" y="476">Investopedia sim</text>
    <circle cx="330" cy="420" r="8" fill="var(--soft)"/><text x="350" y="426">TradingView paper</text>
    <circle cx="700" cy="440" r="8" fill="var(--soft)"/><text x="720" y="446">Exchange testnets</text>
    <circle cx="640" cy="520" r="8" fill="var(--soft)"/><text x="660" y="526">Trading games</text>
    <circle cx="300" cy="180" r="8" fill="var(--soft)"/><text x="320" y="186">Funded trader firms</text>
  </g>
  <!-- Tide: the logo mark, top right -->
  <g transform="translate(790,120)">
    <circle r="30" fill="#fff"/>
    <text x="44" y="8" fill="#fff" font-weight="700" font-size="22">TIDE</text>
  </g>
</svg>
```

Replace the white circle with the inline logo mark path once extracted from `Logo.png` (vectorise once, reuse everywhere).

### 5.5 Stepped timeline (SVG variant of the CSS `.timeline`)

```html
<svg viewBox="0 0 1000 120" font-family="JetBrains Mono, monospace" font-size="17" letter-spacing="2">
  <line x1="20" y1="40" x2="980" y2="40" stroke="var(--line2)" stroke-width="4" stroke-linecap="round"/>
  <line x1="20" y1="40" x2="140" y2="40" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  <g fill="var(--line2)">
    <circle cx="20" cy="40" r="9" fill="#fff"/><circle cx="340" cy="40" r="9"/><circle cx="660" cy="40" r="9"/><circle cx="980" cy="40" r="9"/>
  </g>
  <g fill="#fff" font-weight="700">
    <text x="20" y="90">NOW</text><text x="340" y="90">NEXT</text><text x="660" y="90">THEN</text><text x="980" y="90" text-anchor="end">LATER</text>
  </g>
  <g fill="var(--soft)">
    <text x="20" y="112">SEP 2026</text><text x="340" y="112">Q4 2026</text><text x="660" y="112">H1 2027</text><text x="980" y="112" text-anchor="end">2027</text>
  </g>
</svg>
```

### 5.6 Ledger flow: funded onboarding, transaction by transaction

Three nodes, four tagged edges. Straight edges on top, the AccountDelete return loops underneath as a dashed path. Amounts in mono 700.

```html
<svg viewBox="0 0 1000 420" font-family="JetBrains Mono, monospace" font-size="16" letter-spacing="1.5">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#fff"/>
    </marker>
  </defs>
  <!-- nodes -->
  <g>
    <rect x="20"  y="120" width="240" height="120" rx="18" fill="var(--panel)"/>
    <rect x="380" y="120" width="240" height="120" rx="18" fill="var(--panel)"/>
    <rect x="740" y="120" width="240" height="120" rx="18" fill="var(--panel)" stroke="#fff" stroke-width="2"/>
    <g fill="var(--soft)"><text x="40" y="150">TIDE FUNDER</text><text x="400" y="150">STARTER · ENCRYPTED KEY</text><text x="760" y="150">LEARNER'S ACCOUNT</text></g>
    <g fill="#fff" font-size="20" font-weight="700"><text x="40" y="190">hot wallet</text><text x="400" y="190">r…starter</text><text x="760" y="190">r…kept</text></g>
    <g fill="var(--mut2)"><text x="40" y="222">campaign budget only</text><text x="400" y="222">AES-256-GCM</text><text x="760" y="222">holds the NFT</text></g>
  </g>
  <!-- edges (top) -->
  <g stroke="#fff" stroke-width="2" fill="none" marker-end="url(#arr)">
    <path d="M260,180 L378,180"/>
    <path d="M620,180 L738,180"/>
  </g>
  <g fill="#fff" font-weight="700" text-anchor="middle">
    <text x="319" y="166">Payment</text><text x="319" y="204">2.22 XRP</text>
    <text x="679" y="166">Payment</text><text x="679" y="204">1.21 XRP</text>
  </g>
  <!-- issuer edge into kept account -->
  <path d="M860,40 L860,118" stroke="#fff" stroke-width="2" fill="none" marker-end="url(#arr)"/>
  <text x="872" y="70" fill="var(--soft)">NFTokenMint · Offer · Accept</text>
  <text x="872" y="92" fill="var(--soft)">issuer → soulbound First Trade</text>
  <!-- account delete loop (bottom, dashed) -->
  <path d="M500,240 L500,330 L860,330 L860,242" stroke="#fff" stroke-width="2" stroke-dasharray="8 8" fill="none" marker-end="url(#arr)"/>
  <text x="680" y="356" fill="#fff" font-weight="700" text-anchor="middle">AccountDelete · 0.2 XRP · remaining balance</text>
  <!-- footer -->
  <text x="20" y="405" fill="var(--soft)">every edge carries the Tide SourceTag</text>
  <text x="980" y="405" fill="var(--soft)" text-anchor="end">cost to Tide 2.22 XRP · learner keeps the rest</text>
</svg>
```

Placement: the SVG sits in a `.panel` spanning the full safe width at 1728 by 560. Below it, one `.lead` line: "The account is the first line of the learner's on chain track record."

### 5.7 Number formatting rules for every chart

- Thousands separators, no decimals beyond what the source gives.
- Currency and unit after the number as a suffix in the same mono size ("2.22 XRP", "$10,000").
- Every chart carries a `.foot` line with source and date; a chart without a source is not shipped.
- Percentages only when the base is stated on the slide.

---

## 6. Colour usage matrix for the deck

| Element | Colour | Allowed |
|---|---|---|
| Ground | `--blue` | always |
| Panels | `--panel`, `--panel2` | always |
| Titles, body, bars, nodes | white, `--soft`, `--mut2` | always |
| Emphasis panel (the one thing to look at) | white panel, blue text | one per slide max |
| Gain, long, rising curve | `--up` | only on real or clearly labelled illustrative PnL |
| Loss, short, drawdown | `--down` | same |
| Prize, cash prize, pool | `--gold` | only on money to win |
| Live mode marker | `--live` amber | only on the Live pill and the Live callout |
| Chart series without a semantic | white and `--soft` and `--panel2` | always |
| Tutorial spotlight red | `--guide` | never in the deck |

---

## 7. Checklist before export

- Every title reads as a sentence someone could disagree with.
- Body text fits in three lines at 22 px; if not, cut or split.
- No number outside JetBrains Mono. No colour outside the matrix above.
- Every figure has a source and date in the footer.
- The deck opens at `#1`, arrows work, `p` prints one slide per page, `f` goes fullscreen.
- Tested at 1280 by 720 and 1920 by 1080: scaling only, no reflow.
- No em dash anywhere in the copy (search for the character before shipping).
- The five minute cut (`data-cut="5min"`) is marked on at most eight slides.

Sources consulted for section 1: the Slidebean Airbnb teardown (slidebean.com/blog/airbnb-pitch-deck), hacktribe five minute hackathon structure (hacktribe.co), inknarrates hackathon deck guide, qubit.capital deck design principles, plus the Tide brand documents in this repository.
