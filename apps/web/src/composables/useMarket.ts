import { onMounted, onUnmounted, ref } from "vue";

/*
 * useMarket — moteur de marché ILLUSTRATIF (marche aléatoire) pour animer
 * l'écran de trading : prix qui tick, bougies, carnet d'ordres. Données de
 * démonstration — clairement étiquetées dans l'UI ; remplaçables par le vrai
 * feed XRPL plus tard. Honore prefers-reduced-motion (ralentit le tick).
 */

export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
}
export interface BookLevel {
  price: number;
  size: number;
  depth: number; // 0..1 (pour la barre)
}

function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function useMarket(start = 2.9412, candleCount = 44) {
  const price = ref(start);
  const open = ref(start);
  const dir = ref<"up" | "down" | "flat">("flat");
  const changePct = ref(0);
  const candles = ref<Candle[]>([]);
  const bids = ref<BookLevel[]>([]);
  const asks = ref<BookLevel[]>([]);
  const high = ref(start);
  const low = ref(start);
  const volume = ref(rnd(1.4, 2.6));

  let p = start;
  let cur: Candle = { o: p, h: p, l: p, c: p };
  let stepInCandle = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  // Historique initial
  function seed(): void {
    const hist: Candle[] = [];
    let q = start * 0.96;
    for (let i = 0; i < candleCount; i++) {
      const o = q;
      const c = o * (1 + rnd(-0.012, 0.014));
      const h = Math.max(o, c) * (1 + rnd(0, 0.006));
      const l = Math.min(o, c) * (1 - rnd(0, 0.006));
      hist.push({ o, h, l, c });
      q = c;
    }
    candles.value = hist;
    p = q;
    price.value = p;
    open.value = hist[0]!.o;
    cur = { o: p, h: p, l: p, c: p };
    rebuildBook();
  }

  function rebuildBook(): void {
    const spread = p * 0.0004;
    const mk = (sign: number): BookLevel[] =>
      Array.from({ length: 7 }, (_, i) => {
        const lvl = p + sign * (spread + i * p * 0.0006);
        const size = rnd(120, 1800) * (1 - i / 9);
        return { price: lvl, size, depth: Math.max(0.16, 1 - i / 7 + rnd(-0.1, 0.1)) };
      });
    asks.value = mk(1).reverse();
    bids.value = mk(-1);
  }

  function tick(): void {
    const prev = p;
    p = p * (1 + rnd(-0.0022, 0.0023));
    dir.value = p > prev ? "up" : p < prev ? "down" : "flat";
    price.value = p;
    high.value = Math.max(high.value, p);
    low.value = Math.min(low.value, p);
    changePct.value = ((p - open.value) / open.value) * 100;
    volume.value += rnd(0, 0.004);

    cur.c = p;
    cur.h = Math.max(cur.h, p);
    cur.l = Math.min(cur.l, p);
    stepInCandle += 1;
    if (stepInCandle >= 4) {
      candles.value = [...candles.value.slice(1), { ...cur }];
      cur = { o: p, h: p, l: p, c: p };
      stepInCandle = 0;
    } else {
      candles.value = [...candles.value.slice(0, -1), { ...cur }];
    }
    rebuildBook();
  }

  function startEngine(): void {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    timer = setInterval(tick, reduced ? 2400 : 900);
  }

  onMounted(() => {
    seed();
    startEngine();
  });
  onUnmounted(() => clearInterval(timer));

  return { price, dir, changePct, candles, bids, asks, high, low, volume };
}
