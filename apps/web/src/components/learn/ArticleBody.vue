<script setup lang="ts">
/* Rend le corps d'un article (blocs typés) avec les tokens du design system.
 * Aucun v-html : le gras `**…**` et le code `` `…` `` sont parsés en segments
 * sûrs et rendus via <strong>/<code>. Suit docs/BRAND.md (bleu = seul accent,
 * mono pour les nombres, pas d'ombres, contraste panel/panel2). */
import type { Block } from "../../data/learn/types";
import { headingId } from "../../data/learn/toc";

defineProps<{ blocks: Block[] }>();

interface Seg {
  kind: "text" | "b" | "code";
  text: string;
}

const INLINE = /\*\*(.+?)\*\*|`(.+?)`/g;

/** Découpe une chaîne en segments (texte / gras / code) sans injection HTML. */
function parseInline(s: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(s)) !== null) {
    if (m.index > last) {
      segs.push({ kind: "text", text: s.slice(last, m.index) });
    }
    if (m[1] !== undefined) {
      segs.push({ kind: "b", text: m[1] });
    } else if (m[2] !== undefined) {
      segs.push({ kind: "code", text: m[2] });
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    segs.push({ kind: "text", text: s.slice(last) });
  }
  return segs;
}
</script>

<template>
  <div class="body">
    <template v-for="(block, i) in blocks" :key="i">
      <h2 v-if="block.type === 'h'" :id="headingId(block.text)" class="b-h">
        {{ block.text }}
      </h2>

      <p v-else-if="block.type === 'p'" class="b-p">
        <template v-for="(seg, j) in parseInline(block.text)" :key="j">
          <strong v-if="seg.kind === 'b'">{{ seg.text }}</strong>
          <code v-else-if="seg.kind === 'code'" class="mono">{{ seg.text }}</code>
          <template v-else>{{ seg.text }}</template>
        </template>
      </p>

      <ul v-else-if="block.type === 'list'" class="b-list">
        <li v-for="(item, j) in block.items" :key="j">
          <template v-for="(seg, k) in parseInline(item)" :key="k">
            <strong v-if="seg.kind === 'b'">{{ seg.text }}</strong>
            <code v-else-if="seg.kind === 'code'" class="mono">{{ seg.text }}</code>
            <template v-else>{{ seg.text }}</template>
          </template>
        </li>
      </ul>

      <ol v-else-if="block.type === 'steps'" class="b-steps">
        <li v-for="(item, j) in block.items" :key="j">
          <span class="num mono">{{ String(j + 1).padStart(2, "0") }}</span>
          <span class="txt">
            <template v-for="(seg, k) in parseInline(item)" :key="k">
              <strong v-if="seg.kind === 'b'">{{ seg.text }}</strong>
              <code v-else-if="seg.kind === 'code'" class="mono">{{ seg.text }}</code>
              <template v-else>{{ seg.text }}</template>
            </template>
          </span>
        </li>
      </ol>

      <div
        v-else-if="block.type === 'callout'"
        class="b-callout"
        :class="block.variant"
      >
        <div v-if="block.title" class="c-title mono">{{ block.title }}</div>
        <p>
          <template v-for="(seg, j) in parseInline(block.text)" :key="j">
            <strong v-if="seg.kind === 'b'">{{ seg.text }}</strong>
            <code v-else-if="seg.kind === 'code'" class="mono">{{ seg.text }}</code>
            <template v-else>{{ seg.text }}</template>
          </template>
        </p>
      </div>

      <div v-else-if="block.type === 'example'" class="b-example">
        <div class="e-title lab">{{ block.title }}</div>
        <div class="e-rows">
          <div v-for="(row, j) in block.rows" :key="j" class="e-row">
            <span class="k">{{ row.k }}</span>
            <span class="v mono">{{ row.v }}</span>
          </div>
        </div>
      </div>

      <blockquote v-else-if="block.type === 'quote'" class="b-quote">
        {{ block.text }}
      </blockquote>

      <hr v-else-if="block.type === 'divider'" class="b-divider" />
    </template>
  </div>
</template>

<style scoped>
.body {
  font-size: 16.5px;
}
.b-h {
  font-family: var(--disp);
  font-weight: 800;
  text-transform: uppercase;
  font-size: clamp(23px, 3vw, 31px);
  letter-spacing: -0.03em;
  line-height: 1.02;
  margin: 52px 0 18px;
  scroll-margin-top: 84px;
}
.b-p {
  font-size: 16.5px;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.88);
  margin: 0 0 20px;
}
.b-p strong,
.b-list strong,
.b-steps strong,
.b-callout strong {
  font-weight: 800;
  color: #fff;
}
code.mono {
  background: var(--panel2);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 1px 6px;
  font-size: 0.86em;
  color: #fff;
}

/* liste à puces */
.b-list {
  list-style: none;
  margin: 0 0 22px;
  padding: 0;
}
.b-list li {
  position: relative;
  padding-left: 22px;
  font-size: 16px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.86);
  margin-bottom: 12px;
}
.b-list li::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 11px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--blue);
}

/* étapes numérotées */
.b-steps {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  counter-reset: step;
}
.b-steps li {
  display: flex;
  gap: 16px;
  align-items: baseline;
  padding: 16px 0;
  border-top: 1px solid var(--line);
}
.b-steps .num {
  color: var(--blue);
  font-weight: 700;
  font-size: 13px;
  flex: 0 0 auto;
}
.b-steps .txt {
  font-size: 16px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.86);
}

/* encart (callout) */
.b-callout {
  border: 1px solid var(--line2);
  border-left-width: 3px;
  border-radius: 14px;
  padding: 20px 22px;
  margin: 24px 0;
  background: var(--panel2);
}
.b-callout p {
  font-size: 15.5px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.86);
}
.b-callout .c-title {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 8px;
  color: var(--soft);
}
.b-callout.info {
  border-left-color: var(--blue);
}
.b-callout.tip {
  border-left-color: var(--blue);
}
.b-callout.warn {
  border-left-color: var(--live);
}
.b-callout.warn .c-title {
  color: var(--live);
}

/* exemple chiffré (worked example) */
.b-example {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 20px 22px;
  margin: 24px 0;
  background: var(--panel);
}
.b-example .e-title {
  margin-bottom: 12px;
  color: var(--soft);
}
.b-example .e-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}
.b-example .e-row:first-child {
  border-top: none;
}
.b-example .e-row .k {
  font-size: 14px;
  color: var(--soft);
}
.b-example .e-row .v {
  font-weight: 700;
  font-size: 15px;
  text-align: right;
}

/* citation */
.b-quote {
  border-left: 3px solid var(--blue);
  padding: 4px 0 4px 22px;
  margin: 28px 0;
  font-family: var(--disp);
  font-weight: 600;
  font-size: clamp(18px, 2.4vw, 22px);
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: #fff;
}

.b-divider {
  border: none;
  border-top: 1px solid var(--line);
  margin: 32px 0;
}
</style>
