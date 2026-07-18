function badgeSvg(title: string, proof: string, accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Tide ${title}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#526dff"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs>
<rect width="1024" height="1024" rx="92" fill="#0b1019"/>
<circle cx="752" cy="282" r="180" fill="url(#g)" opacity=".18"/>
<path d="M-30 700C125 570 255 820 410 650s260 30 410-120 220-90 280-160" fill="none" stroke="url(#g)" stroke-width="30" stroke-linecap="round"/>
<text x="82" y="124" fill="#7589ff" font-family="ui-monospace,monospace" font-size="34" font-weight="700" letter-spacing="12">TIDE</text>
<text x="82" y="820" fill="#f8fbff" font-family="Inter,Arial,sans-serif" font-size="82" font-weight="800">${title}</text>
<text x="86" y="884" fill="#8da0b8" font-family="ui-monospace,monospace" font-size="27" letter-spacing="4">XRPL MAINNET · ${proof}</text>
<rect x="82" y="925" width="860" height="2" fill="#26334b"/>
<text x="82" y="970" fill="#526dff" font-family="ui-monospace,monospace" font-size="22">PROOF OF PRACTICE</text>
</svg>`;
}

export const TEN_TRADES_SVG = badgeSvg("TEN TRADES", "MOMENTUM BADGE", "#16d7c8");
export const FIRST_COMPETITION_SVG = badgeSvg(
  "FIRST COMPETITION",
  "ARENA BADGE",
  "#ffb84d",
);
