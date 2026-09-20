<script setup lang="ts">
import { computed } from "vue";
import type { ChapterId } from "../../data/tutorial";

const props = defineProps<{ chapter: ChapterId; stepId: string }>();

const kind = computed(() => {
  if (["candles", "the-price", "the-book", "pick-a-market"].includes(props.stepId)) return "read";
  if (["leverage", "liquidation", "liquidation-room"].includes(props.stepId)) return "leverage";
  if (["stop-loss", "take-profit", "position-sizing", "risk-budget", "run-the-plan"].includes(props.stepId)) return "risk";
  if (["limit-order", "limit-price", "market-order", "execution", "side", "amount", "percent-buttons", "summary", "first-buy"].includes(props.stepId)) return "order";
  return props.chapter;
});
</script>

<template>
  <svg class="concept" viewBox="0 0 240 160" aria-hidden="true">
    <defs>
      <pattern id="tutorial-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0H0V20" fill="none" stroke="#fff" stroke-opacity=".055" />
      </pattern>
      <filter id="tutorial-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
    </defs>
    <rect width="240" height="160" rx="22" fill="#151722" />
    <rect width="240" height="160" rx="22" fill="url(#tutorial-grid)" />
    <circle cx="190" cy="36" r="34" fill="#4f6aff" opacity=".2" filter="url(#tutorial-glow)" />

    <g v-if="kind === 'why'" class="draw">
      <path class="halo" d="M24 116c34-55 61-55 92 0s59 55 99-13" />
      <path class="line" d="M24 116c34-55 61-55 92 0s59 55 99-13" />
      <circle class="node" cx="49" cy="83" r="10" /><circle class="node" cx="116" cy="116" r="10" /><circle class="node" cx="191" cy="113" r="10" />
      <path class="solid" d="M203 92l18 7-14 13z" />
    </g>

    <g v-else-if="kind === 'read'" class="draw candles">
      <path class="axis" d="M24 130H218M24 30v100" />
      <g transform="translate(47)"><path d="M0 67v48"/><rect y="76" width="14" height="28" rx="2"/></g>
      <g transform="translate(82)"><path d="M0 45v65"/><rect class="blue" y="57" width="14" height="36" rx="2"/></g>
      <g transform="translate(117)"><path d="M0 76v42"/><rect y="84" width="14" height="25" rx="2"/></g>
      <g transform="translate(152)"><path d="M0 34v72"/><rect class="blue" y="48" width="14" height="42" rx="2"/></g>
      <g transform="translate(187)"><path d="M0 52v54"/><rect y="61" width="14" height="32" rx="2"/></g>
    </g>

    <g v-else-if="kind === 'order' || kind === 'orders'" class="draw">
      <rect class="panel" x="24" y="34" width="82" height="94" rx="15" />
      <path class="small" d="M42 55h46M42 73h34M42 105h46" />
      <circle class="node" cx="64" cy="91" r="9" />
      <path class="line" d="M110 81h50" /><path class="solid" d="M151 72l17 9-17 9z" />
      <rect class="panel active" x="164" y="48" width="52" height="66" rx="14" />
      <path class="small" d="M178 67h24M178 82h24M178 97h16" />
    </g>

    <g v-else-if="kind === 'leverage' || kind === 'perps'" class="draw">
      <path class="axis" d="M24 130h194" />
      <rect class="panel" x="38" y="98" width="28" height="32" rx="6" />
      <rect class="panel" x="79" y="78" width="28" height="52" rx="6" />
      <rect class="panel active" x="120" y="57" width="28" height="73" rx="6" />
      <rect class="panel active" x="161" y="31" width="28" height="99" rx="6" />
      <path class="halo" d="M50 82l43-25 41-17 43-27" />
      <path class="line" d="M50 82l43-25 41-17 43-27" />
      <path class="solid" d="M170 12l18-5-7 18z" />
    </g>

    <g v-else-if="kind === 'risk'" class="draw">
      <path class="panel active" d="M120 19l68 24v37c0 39-29 54-68 68-39-14-68-29-68-68V43z" />
      <path class="line" d="M87 82l21 21 45-51" />
      <circle class="node wide" cx="120" cy="78" r="43" />
    </g>

    <g v-else class="draw">
      <circle class="node wide" cx="120" cy="80" r="54" />
      <circle class="node" cx="120" cy="80" r="34" />
      <path class="line" d="M95 80l17 18 35-42" />
      <path class="halo" d="M42 130h156" />
    </g>
  </svg>
</template>

<style scoped>
.concept { display:block;width:100%;height:100% }
.draw * { vector-effect:non-scaling-stroke }
.line,.halo,.small { fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round }
.halo { stroke:#4f6aff;stroke-width:16;opacity:.18 }
.small { stroke-width:2;stroke-opacity:.72 }
.axis { fill:none;stroke:#fff;stroke-opacity:.18;stroke-width:1.5 }
.node { fill:#111318;stroke:#fff;stroke-width:2.5 }.node.wide{stroke:#7184ff;stroke-opacity:.55}
.solid { fill:#4f6aff }.panel{fill:#1c1f2c;stroke:#fff;stroke-opacity:.22;stroke-width:1.5}.panel.active{fill:#4f6aff;stroke-opacity:.7}
.candles path{stroke:#fff;stroke-width:1.5}.candles rect{fill:#fff}.candles rect.blue{fill:#4f6aff;stroke:#aeb8ff}
</style>
