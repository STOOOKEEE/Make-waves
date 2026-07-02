/* ===== TIDE School — illustrations ASCII (monospace) =====
 * Remplace les emojis. Chaque leçon a une vignette dessinée en glyphes
 * monospace-safe (box-drawing, blocs pleins, ╱╲, ▲▼) — cohérente avec le
 * « terminal éditorial » (JetBrains Mono). Rendu dans un <pre>.
 * Une entrée par slug ; jointes par \n pour préserver l'alignement.
 */

const A: Record<string, string[]> = {
  "what-is-trading": [
    "    ▲                    ▲   ",
    "    │    ██      ██      │   ",
    " ██ │    ██  ██  ██  ██  │   ",
    " ██ ██   ██  ██  ██  ██  ██  ",
    "─╱╲──────────────────────╱╲─",
    " BUY LOW    ·    SELL HIGH   ",
  ],
  "reading-a-chart": [
    "      │              │      ",
    "   │  █       │      █      ",
    "   █  █   │   █   │  █      ",
    " │ █  █ │ █   █   █  █ │    ",
    " █ █  █ █ █   █   █  █ █    ",
    "─┴─┴──┴─┴─┴───┴───┴──┴─┴─── ",
    " open   high   low   close  ",
  ],
  "order-types": [
    " ┌────────┐   ┌────────┐ ",
    " │ MARKET │   │ LIMIT  │ ",
    " └────────┘   └────────┘ ",
    "   ┌────┐  ┌────┐  ┌────┐",
    "   │ TP │  │ SL │  │QTY │",
    "   └────┘  └────┘  └────┘",
  ],
  "order-book-spread": [
    " ASK 108 ▓▓▓▓▓▓ ",
    " ASK 107 ▓▓▓▓   ",
    " ASK 106 ▓▓     ",
    "──── spread ─────────",
    " BID 105 ▒▒▒    ",
    " BID 104 ▒▒▒▒▒  ",
    " BID 103 ▒▒▒▒▒▒▒",
  ],
  "how-tide-works": [
    " ┌── PAPER ──┐    ┌── LIVE ──┐ ",
    " │ ▒▒▒▒▒▒▒▒▒ │    │ █████████ │ ",
    " │  virtual  │ -> │ on-chain  │ ",
    " └───────────┘    └───────────┘ ",
    "   practice  ->  prove  ->  go  ",
  ],
  "what-is-a-perpetual": [
    "  ╭────────╮       ╭────────╮ ",
    " ╱   SPOT   ╲     ╱   PERP   ╲",
    "│  you own   │   │  contract  │",
    " ╲  the coin╱     ╲  no expiry╱",
    "  ╰────────╯       ╰────────╯ ",
    "   ··  funding keeps it fair  ··",
  ],
  "leverage-and-margin": [
    " margin  ▏ $1k               ",
    " 10x     ▏▓▓▓▓▓▓▓▓▓▓  $10k   ",
    "────────────────────────────",
    " +5% -> +50%    −10% -> −100%",
    "         (!)  liquidation     ",
  ],
  "long-and-short": [
    "   LONG                SHORT   ",
    "    ▲                    │     ",
    "    │    ╱╲              │  ╱╲  ",
    "    │   ╱  ╲             ▼ ╱  ╲ ",
    " ──╱╲──╱────╲        ──╱╲╱────╲",
    "   up = profit        down = profit",
  ],
  "take-profit-stop-loss": [
    " ··· TP  +10% ················ [+]",
    "          ╱╲      ╱╲              ",
    " ──── entry ──╱──╲──╱──────────  ",
    "         ╱      ╲╱                ",
    " ··· SL  −5%  ················ [-]",
  ],
  "risk-management-101": [
    "      ┌─────────┐    ",
    "      │  RISK    │   ",
    "      │   1%     │   ",
    "      └────┬─────┘   ",
    "  size = risk ÷ stop ",
    "  reward : risk = 2:1",
  ],
  "trend-following": [
    "                    ███  ",
    "               ███ ╱     ",
    "          ███ ╱  ╱       ",
    "     ███ ╱  ╱  ╱   higher highs",
    "    ╱  ╱  ╱  ╱     higher lows ",
    "───────────────────────────── ",
  ],
  "mean-reversion-ranges": [
    "── resistance ───────────────",
    "    ╲    ╱╲    ╱╲    ╱╲       ",
    "     ╲  ╱  ╲  ╱  ╲  ╱  ╲      ",
    "      ╲╱    ╲╱    ╲╱          ",
    "── support ──────────────────",
    "   buy low   ·   sell high   ",
  ],
  "breakout-trading": [
    "───────────┬──────── resistance",
    "           │ ▲                 ",
    "   ╱╲      │ █  BREAKOUT ->     ",
    "  ╱  ╲   ╱ │ █                  ",
    " ╱    ╲ ╱  │ █                  ",
    "───────────────── volume ▓▓▓▓  ",
  ],
  "trading-psychology": [
    "  fear <──────────> greed  ",
    "        ╲         ╱        ",
    "         ╲       ╱         ",
    "        ┌─▼─────▼─┐        ",
    "        │  PLAN   │        ",
    "        └─────────┘        ",
    "   discipline > emotion    ",
  ],
  "winning-competitions": [
    "          ___             ",
    "         (   )  trophy    ",
    "          |_|             ",
    "     ┌──┐ ███ ┌──┐        ",
    "     │ 2│ ███ │ 3│        ",
    "    ─┴──┴─███─┴──┴─       ",
    "   pool · rake · split    ",
  ],
  "on-chain-track-record": [
    "  ┌───┐    ┌───┐    ┌───┐ ",
    "  │ ▓ │ -> │ ▓ │ -> │ ▓ │ ",
    "  └───┘    └───┘    └───┘ ",
    "  signed · tagged · public",
    "     SourceTag == XRPL    ",
  ],
};

/** Art ASCII d'une leçon (chaîne multi-ligne), ou vide si inconnue. */
export function articleArt(slug: string): string {
  const lines = A[slug];
  return lines ? lines.join("\n") : "";
}
