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
  font-size: 17px;
  counter-reset: article-section;
}
.b-h {
  position: relative;
  font-family: var(--disp);
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(29px, 3.8vw, 45px);
  letter-spacing: -0.045em;
  line-height: .94;
  margin: 70px 0 24px;
  padding-top: 22px;
  border-top: 1px solid rgba(255, 255, 255, .13);
  scroll-margin-top: 84px;
  counter-increment: article-section;
}
.b-h::before {
  content: counter(article-section, decimal-leading-zero);
  display: block;
  margin-bottom: 12px;
  color: var(--blue);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
}
.b-p {
  font-size: 17px;
  line-height: 1.82;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 24px;
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
  font-size: 16.5px;
  line-height: 1.68;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 14px;
}
.b-list li::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 11px;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: #fff;
  transform: rotate(45deg);
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
  padding: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, .12);
}
.b-steps .num {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, .2);
  border-radius: 50%;
  color: #fff;
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
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 18px;
  padding: 26px 28px;
  margin: 30px 0;
  background: rgba(255, 255, 255, .055);
}
.b-callout::after {
  content: "";
  position: absolute;
  width: 120px;
  height: 120px;
  right: -55px;
  top: -65px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 50%;
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
  box-shadow: inset 3px 0 var(--blue);
}
.b-callout.tip {
  box-shadow: inset 3px 0 #fff;
}
.b-callout.warn {
  box-shadow: inset 3px 0 var(--live);
}
.b-callout.warn .c-title {
  color: var(--live);
}

/* exemple chiffré (worked example) */
.b-example {
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 18px;
  padding: 26px 28px;
  margin: 30px 0;
  background: #191c27;
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
  padding: 13px 0;
  border-top: 1px solid rgba(255, 255, 255, .1);
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
  position: relative;
  border: 0;
  padding: 34px 0 34px 48px;
  margin: 38px 0;
  font-family: var(--disp);
  font-weight: 600;
  font-size: clamp(22px, 3vw, 31px);
  line-height: 1.25;
  letter-spacing: -0.025em;
  color: #fff;
}
.b-quote::before {
  content: "“";
  position: absolute;
  left: 0;
  top: 10px;
  color: var(--blue);
  font-family: Georgia, serif;
  font-size: 76px;
  line-height: 1;
}

.b-divider {
  border: none;
  border-top: 1px solid var(--line);
  margin: 32px 0;
}

@media (max-width: 620px) {
  .b-h { margin-top: 54px; }
  .b-p { font-size: 16px; line-height: 1.72; }
  .b-callout, .b-example { padding: 22px 20px; }
  .b-quote { padding-left: 36px; }
}
</style>
