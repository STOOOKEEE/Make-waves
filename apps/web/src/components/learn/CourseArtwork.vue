<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ slug: string }>();

const kind = computed(() => {
  const kinds: Record<string, string> = {
    "what-is-trading": "trading",
    "reading-a-chart": "chart",
    "order-types": "orders",
    "order-book-spread": "book",
    "how-tide-works": "tide",
    "what-is-a-perpetual": "perp",
    "leverage-and-margin": "leverage",
    "long-and-short": "directions",
    "take-profit-stop-loss": "exits",
    "risk-management-101": "risk",
    "trend-following": "trend",
    "mean-reversion-ranges": "range",
    "breakout-trading": "breakout",
    "trading-psychology": "mind",
    "winning-competitions": "podium",
    "on-chain-track-record": "chain",
  };
  return kinds[props.slug] ?? "trading";
});

const uid = computed(() => props.slug.replace(/[^a-z0-9]/g, ""));
</script>

<template>
  <svg
    class="course-artwork"
    viewBox="0 0 360 220"
    role="img"
    :aria-label="slug.replaceAll('-', ' ')"
  >
    <defs>
      <linearGradient :id="`wash-${uid}`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7286ff" stop-opacity=".7" />
        <stop offset="1" stop-color="#4f6aff" stop-opacity=".08" />
      </linearGradient>
      <filter :id="`glow-${uid}`" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <pattern :id="`grid-${uid}`" width="22" height="22" patternUnits="userSpaceOnUse">
        <path d="M22 0H0V22" fill="none" stroke="#fff" stroke-opacity=".055" />
      </pattern>
    </defs>

    <rect width="360" height="220" :fill="`url(#grid-${uid})`" />
    <circle cx="286" cy="44" r="62" fill="#4f6aff" opacity=".12" />
    <circle cx="286" cy="44" r="28" fill="#7387ff" opacity=".14" :filter="`url(#glow-${uid})`" />

    <g v-if="kind === 'trading'" class="ink">
      <path class="ghost" d="M58 158 C92 145 112 154 139 119 S194 101 217 76 262 69 301 43" />
      <path class="line" d="M58 158 C92 145 112 154 139 119 S194 101 217 76 262 69 301 43" />
      <path class="fill-blue" d="M286 43l19 0-9-17z" />
      <circle class="node" cx="58" cy="158" r="10" />
      <circle class="node" cx="139" cy="119" r="10" />
      <circle class="node" cx="217" cy="76" r="10" />
    </g>

    <g v-else-if="kind === 'chart'" class="ink candles">
      <path class="axis" d="M48 172H315M48 50V172" />
      <g transform="translate(74 0)"><path d="M0 84v63"/><rect y="99" width="18" height="32" rx="3"/></g>
      <g transform="translate(116 0)"><path d="M0 66v74"/><rect class="blue" y="78" width="18" height="45" rx="3"/></g>
      <g transform="translate(158 0)"><path d="M0 92v55"/><rect y="103" width="18" height="29" rx="3"/></g>
      <g transform="translate(200 0)"><path d="M0 48v81"/><rect class="blue" y="64" width="18" height="48" rx="3"/></g>
      <g transform="translate(242 0)"><path d="M0 61v57"/><rect y="72" width="18" height="30" rx="3"/></g>
      <g transform="translate(284 0)"><path d="M0 34v70"/><rect class="blue" y="47" width="18" height="41" rx="3"/></g>
    </g>

    <g v-else-if="kind === 'orders'" class="ink orders">
      <rect class="panel" x="48" y="54" width="118" height="112" rx="18" />
      <rect class="panel active" x="194" y="54" width="118" height="112" rx="18" />
      <circle class="node" cx="107" cy="91" r="14" />
      <path class="line small" d="M78 126h58M78 143h40" />
      <path class="line small" d="M220 89h64M220 110h64M220 131h40" />
      <path class="fill-blue" d="M278 144l14-14 14 14-14 14z" />
    </g>

    <g v-else-if="kind === 'book'" class="ink book">
      <path class="axis" d="M180 39v142" />
      <path class="ask" d="M168 56H89M168 82H56M168 108H105" />
      <path class="bid" d="M192 126h62M192 152h108M192 178h82" />
      <circle class="node" cx="180" cy="117" r="12" />
      <path class="line small" d="M61 56v0M57 82v0M106 108v0M254 126v0M300 152v0M274 178v0" />
    </g>

    <g v-else-if="kind === 'tide'" class="ink">
      <path class="ghost" d="M42 128c41-57 76-57 117 0s76 57 117 0 63-54 87-43" />
      <path class="line" d="M42 128c41-57 76-57 117 0s76 57 117 0 63-54 87-43" />
      <circle class="node" cx="78" cy="93" r="18" />
      <circle class="node" cx="196" cy="147" r="18" />
      <circle class="node" cx="307" cy="91" r="18" />
      <path class="fill-blue" d="M70 93l8-8 8 8-8 8zM188 147l8-8 8 8-8 8zM299 91l8-8 8 8-8 8z" />
    </g>

    <g v-else-if="kind === 'perp'" class="ink">
      <path class="ghost" d="M93 110a87 67 0 1 1 23 45" />
      <path class="line" d="M93 110a87 67 0 1 1 23 45" />
      <path class="fill-blue" d="M101 153l23-7-8 22z" />
      <circle class="panel" cx="183" cy="109" r="47" />
      <path class="line small" d="M149 111h68M183 77v65" />
      <circle class="node" cx="183" cy="109" r="12" />
    </g>

    <g v-else-if="kind === 'leverage'" class="ink leverage">
      <path class="axis" d="M46 174H316" />
      <rect class="panel" x="61" y="132" width="42" height="42" rx="7" />
      <rect class="panel" x="119" y="105" width="42" height="69" rx="7" />
      <rect class="panel active" x="177" y="76" width="42" height="98" rx="7" />
      <rect class="panel active" x="235" y="42" width="42" height="132" rx="7" />
      <path class="line" d="M81 113l57-30 58-26 62-34" />
      <path class="fill-blue" d="M248 20l20-3-8 19z" />
    </g>

    <g v-else-if="kind === 'directions'" class="ink">
      <path class="ghost" d="M53 160C91 134 118 112 151 65" />
      <path class="line" d="M53 160C91 134 118 112 151 65" />
      <path class="fill-blue" d="M143 67l17-14 2 22z" />
      <path class="ghost" d="M207 60c38 24 68 50 101 100" />
      <path class="line" d="M207 60c38 24 68 50 101 100" />
      <path class="fill-white" d="M298 157l19 15-3-24z" />
      <circle class="node" cx="180" cy="110" r="20" />
    </g>

    <g v-else-if="kind === 'exits'" class="ink exits">
      <path class="axis dash" d="M45 54h272M45 167h272" />
      <path class="ghost" d="M45 137c38-20 56-12 82-44s52 52 82 13 55 4 107-35" />
      <path class="line" d="M45 137c38-20 56-12 82-44s52 52 82 13 55 4 107-35" />
      <circle class="node" cx="127" cy="93" r="10" />
      <circle class="node" cx="209" cy="106" r="10" />
      <path class="fill-blue" d="M300 54h17v17h-17z" />
      <path class="fill-white" d="M300 150h17v17h-17z" />
    </g>

    <g v-else-if="kind === 'risk'" class="ink risk">
      <path class="panel active" d="M180 35l91 32v49c0 52-38 72-91 91-53-19-91-39-91-91V67z" />
      <path class="line" d="M139 119l27 27 58-66" />
      <circle class="node" cx="180" cy="111" r="56" />
    </g>

    <g v-else-if="kind === 'trend'" class="ink">
      <path class="axis" d="M45 177H316" />
      <path class="ghost" d="M48 164l48-31 39 12 51-52 40 15 65-66" />
      <path class="line" d="M48 164l48-31 39 12 51-52 40 15 65-66" />
      <path class="fill-blue" d="M283 39l21-8-7 22z" />
      <circle class="node" cx="96" cy="133" r="8" /><circle class="node" cx="186" cy="93" r="8" /><circle class="node" cx="291" cy="42" r="8" />
    </g>

    <g v-else-if="kind === 'range'" class="ink">
      <path class="axis dash" d="M46 55h270M46 168h270" />
      <path class="ghost" d="M49 112c24-75 56-75 82 0s57 75 84 0 57-75 96 0" />
      <path class="line" d="M49 112c24-75 56-75 82 0s57 75 84 0 57-75 96 0" />
      <circle class="node" cx="90" cy="58" r="9" /><circle class="node" cx="173" cy="165" r="9" /><circle class="node" cx="258" cy="58" r="9" />
    </g>

    <g v-else-if="kind === 'breakout'" class="ink">
      <path class="axis dash" d="M43 100h274" />
      <path class="ghost" d="M44 159c32-43 50 3 80-37s54 30 79-9 51 4 87-67" />
      <path class="line" d="M44 159c32-43 50 3 80-37s54 30 79-9 51 4 87-67" />
      <circle class="node" cx="236" cy="101" r="12" />
      <path class="fill-blue" d="M281 48l17-14 2 22z" />
      <path class="beam" d="M236 174V63" />
    </g>

    <g v-else-if="kind === 'mind'" class="ink mind">
      <path class="axis" d="M180 55v112M97 91h166" />
      <path class="line small" d="M97 91l-42 63h84zM263 91l-42 63h84z" />
      <circle class="node" cx="180" cy="54" r="24" />
      <path class="panel active" d="M145 166h70l14 22h-98z" />
      <circle class="fill-blue" cx="84" cy="134" r="13" /><circle class="fill-white" cx="276" cy="134" r="13" />
    </g>

    <g v-else-if="kind === 'podium'" class="ink podium">
      <rect class="panel" x="53" y="132" width="76" height="51" rx="10" />
      <rect class="panel active" x="142" y="87" width="76" height="96" rx="10" />
      <rect class="panel" x="231" y="116" width="76" height="67" rx="10" />
      <path class="line" d="M180 36l12 24 27 4-20 19 5 27-24-13-24 13 5-27-20-19 27-4z" />
      <circle class="node" cx="180" cy="135" r="14" />
    </g>

    <g v-else class="ink chain">
      <g transform="translate(45 0)"><rect class="panel" y="78" width="72" height="72" rx="20"/><circle class="node" cx="36" cy="114" r="13"/></g>
      <g transform="translate(144 0)"><rect class="panel active" y="78" width="72" height="72" rx="20"/><circle class="node" cx="36" cy="114" r="13"/></g>
      <g transform="translate(243 0)"><rect class="panel" y="78" width="72" height="72" rx="20"/><circle class="node" cx="36" cy="114" r="13"/></g>
      <path class="line small" d="M117 114h27M216 114h27" />
      <path class="fill-blue" d="M134 106l12 8-12 8zM233 106l12 8-12 8z" />
      <path class="axis dash" d="M64 174h232" />
    </g>
  </svg>
</template>

<style scoped>
.course-artwork {
  display: block;
  width: 100%;
  height: 100%;
}
.ink :is(.line, .ghost, .axis, path, rect, circle) {
  vector-effect: non-scaling-stroke;
}
.line,
.ghost {
  fill: none;
  stroke: #fff;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ghost {
  stroke: #4f6aff;
  stroke-width: 18;
  opacity: .18;
}
.line.small { stroke-width: 3; }
.axis {
  fill: none;
  stroke: #fff;
  stroke-opacity: .25;
  stroke-width: 2;
  stroke-linecap: round;
}
.axis.dash { stroke-dasharray: 7 8; }
.node {
  fill: #111318;
  stroke: #fff;
  stroke-width: 3;
}
.panel {
  fill: #181b27;
  stroke: #fff;
  stroke-opacity: .28;
  stroke-width: 2;
}
.panel.active { fill: #4f6aff; stroke-opacity: .8; }
.fill-blue { fill: #4f6aff; }
.fill-white { fill: #fff; }
.candles path { stroke: #fff; stroke-width: 2; }
.candles rect { fill: #fff; }
.candles rect.blue { fill: #4f6aff; stroke: #aeb8ff; }
.ask,
.bid {
  fill: none;
  stroke-linecap: round;
  stroke-width: 12;
}
.ask { stroke: #fff; opacity: .85; }
.bid { stroke: #4f6aff; }
.beam { stroke: #4f6aff; stroke-width: 4; stroke-dasharray: 7 7; }
</style>
