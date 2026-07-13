// Rendu SÛR d'un sous-ensemble de markdown inline (gras `**…**` + code `` `…` ``)
// pour la sortie du LLM du chat agent. Renvoie des segments typés que le
// composant rend via des bindings `{{ }}` (échappés par Vue) → aucun `v-html`,
// aucun risque XSS. Les retours à la ligne sont conservés par le CSS
// (`white-space: pre-wrap`), donc on ne traite ici que l'inline.

/** Segment de texte inline : brut, gras ou code. */
export interface InlineSeg {
  readonly t: "text" | "bold" | "code";
  readonly v: string;
}

/**
 * Découpe `src` en segments gras/code/texte. Un `**…**` mal fermé ou un
 * back-tick orphelin reste du texte brut (rendu littéral, jamais interprété).
 */
export function parseInline(src: string): InlineSeg[] {
  const segs: InlineSeg[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) segs.push({ t: "text", v: src.slice(last, m.index) });
    if (m[1] !== undefined) segs.push({ t: "bold", v: m[1] });
    else if (m[2] !== undefined) segs.push({ t: "code", v: m[2] });
    last = re.lastIndex;
  }
  if (last < src.length) segs.push({ t: "text", v: src.slice(last) });
  return segs;
}
