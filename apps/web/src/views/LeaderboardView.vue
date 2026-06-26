<script setup lang="ts">
/*
 * LeaderboardView — classement de la saison.
 * Carte saison (cagnotte + compte à rebours) + podium top 3 + table.
 * La table est hybride : si l'API renvoie des entrées réelles on les mappe,
 * sinon on génère le même mock que la page statique d'origine. On ajoute
 * toujours « ta ligne » en bas, à l'identique du source.
 */

import { computed, onMounted, ref } from "vue";
import type { TideClient } from "@tide/client";
import { useCountdown } from "../composables/useCountdown";
import { useLeaderboard } from "../composables/useLeaderboard";
import SegControl from "../components/SegControl.vue";

const props = defineProps<{ client: TideClient }>();

// Segmented control (purement visuel, aucun fetch au changement).
const scope = ref("Saison 04");
const scopeOptions = ["Saison 04", "All-time", "Amis"];

// Compte à rebours de la saison (remplace le tick « secondes seules » du source).
const { dd, hh, mm, ss } = useCountdown({ days: 4, hours: 11, mins: 38, secs: 52 });

// Recherche purement visuelle.
const search = ref("");

// Données du leaderboard (sûr si l'API est down : capté dans lb.error).
const lb = useLeaderboard(props.client);
onMounted(async () => {
  try {
    await lb.load();
  } catch {
    /* le composable capte déjà dans lb.error ; on absorbe par sécurité */
  }
});

// Capital de départ paper (référence pour le rendement).
const START_EQUITY = 100_000;

// Palette d'avatars (mêmes couleurs que le source).
const cols = [
  "#FFD66B",
  "#BFF6CE",
  "#FFB9AC",
  "#9d7bff",
  "#4F6AFF",
  "#67e8f9",
  "#fca5f1",
  "#a3e635",
];

// Noms du mock d'origine.
const names = [
  "quant_viper",
  "degen_maxi",
  "satoshi_heir",
  "liquid_zen",
  "night_fader",
  "apex_owl",
  "moon_archer",
  "delta_one",
  "gigachadx",
  "veld_trades",
  "cold_storage",
  "pump_sensei",
  "lambo_soon",
  "risk_off",
  "sigma_quant",
  "onchain_oni",
  "yield_hawk",
  "frosty_bid",
  "tape_reader",
  "alpha_djinn",
];

interface BoardRow {
  rank: number;
  name: string;
  address: string;
  avatar: string;
  color: string;
  ret: string;
  pnl: string;
  trades: string;
  win: string;
  prize: string;
  rankClass: string;
}

// Rendement du mock (parabole décroissante du source).
function mockRet(i: number): string {
  return (150 - i * 6 - i * i * 0.05).toFixed(1);
}

// Récompense par paliers : top 3 fixe, top 50 dégressif, sinon « — ».
function prizeFor(rank: number): string {
  const prizeT = [15000, 8000, 4000];
  if (rank <= 3) {
    return "$" + (prizeT[rank - 1] ?? 0).toLocaleString("en-US");
  }
  if (rank <= 50) {
    return "$" + Math.max(150, 800 - rank * 12).toLocaleString("en-US");
  }
  return "—";
}

// Classe de rang (or sur le top 3).
function rankClassFor(rank: number): string {
  return rank <= 3 ? "t" + rank : "";
}

// Avatar = 2 premières lettres du nom, en majuscules.
function avatarFor(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// Lignes mock fidèles au générateur du source (20 lignes).
function mockRows(): BoardRow[] {
  const out: BoardRow[] = [];
  for (let i = 0; i < 20; i++) {
    const rank = i + 1;
    const r = mockRet(i);
    const nm = names[i] ?? "trader_" + rank;
    const pnl = Math.round(Number(r) * 900);
    const trades = 210 - i * 7;
    const win = (72 - i * 0.9).toFixed(0);
    const prize = prizeFor(rank);
    out.push({
      rank,
      name: nm,
      address: `0x${(i * 7 + 10).toString(16)}…${(i * 13 + 33).toString(16)}${rank}`,
      avatar: avatarFor(nm),
      color: cols[i % cols.length] ?? "#fff",
      ret: "+" + r + "%",
      pnl: "+$" + pnl.toLocaleString("en-US"),
      trades: String(trades),
      win: win + "%",
      prize,
      rankClass: rankClassFor(rank),
    });
  }
  return out;
}

// Lignes réelles : on mappe les LeaderboardEntry de l'API.
function realRows(): BoardRow[] {
  return lb.entries.value.map((entry, i) => {
    const retNum = ((entry.equity - START_EQUITY) / START_EQUITY) * 100;
    const retStr = (retNum >= 0 ? "+" : "") + retNum.toFixed(1);
    return {
      rank: entry.rank,
      name: entry.userId,
      address: "0x…",
      avatar: avatarFor(entry.userId),
      color: cols[i % cols.length] ?? "#fff",
      ret: retStr + "%",
      pnl: (entry.pnl >= 0 ? "+$" : "-$") + Math.abs(entry.pnl).toLocaleString("en-US"),
      trades: "—",
      win: "—",
      prize: prizeFor(entry.rank),
      rankClass: rankClassFor(entry.rank),
    };
  });
}

// Source de vérité : réel si dispo, sinon mock.
const rows = computed<BoardRow[]>(() =>
  lb.entries.value.length > 0 ? realRows() : mockRows(),
);

// Libellé de comptage : « Affichage 1–N sur 12 480 » (N = lignes hors ta ligne).
const countLabel = computed(
  () => `Affichage 1–${rows.value.length} sur 12 480`,
);
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>Classement</h1>
        <p>Saison 04 · le rendement décide de tout. 12 480 traders en lice.</p>
      </div>
      <SegControl v-model="scope" :options="scopeOptions" />
    </div>

    <!-- saison + podium -->
    <div class="toprow">
      <div v-reveal class="card season">
        <div>
          <span class="lab">Cagnotte de la saison</span>
          <div class="pot">$50,000</div>
          <div class="potc">USDC + NFT de saison · top 50</div>
        </div>
        <div class="cd">
          <div><div class="v">{{ dd }}</div><div class="l">Jours</div></div>
          <div><div class="v">{{ hh }}</div><div class="l">Heures</div></div>
          <div><div class="v">{{ mm }}</div><div class="l">Min</div></div>
          <div><div class="v">{{ ss }}</div><div class="l">Sec</div></div>
        </div>
      </div>
      <div v-reveal class="card podium">
        <div class="pod p2">
          <div class="av" style="background: #bff6ce">DM</div>
          <div class="rk">RANG 02</div>
          <div class="nm">degen_maxi</div>
          <div class="ad">0x19…ab88</div>
          <div class="ret">+118.3%</div>
          <div class="prize">$8,000</div>
        </div>
        <div class="pod p1">
          <div class="crown">👑</div>
          <div class="av" style="background: #ffd66b">QV</div>
          <div class="rk">RANG 01</div>
          <div class="nm">quant_viper</div>
          <div class="ad">0x7a…34f1</div>
          <div class="ret">+142.8%</div>
          <div class="prize">$15,000</div>
        </div>
        <div class="pod p3">
          <div class="av" style="background: #ffb9ac">SH</div>
          <div class="rk">RANG 03</div>
          <div class="nm">satoshi_heir</div>
          <div class="ad">0xc4…7d20</div>
          <div class="ret">+97.6%</div>
          <div class="prize">$4,000</div>
        </div>
      </div>
    </div>

    <div class="controls">
      <div class="srch">
        <span class="soft">⌕</span>
        <input v-model="search" placeholder="Rechercher un trader ou un wallet…" />
      </div>
      <div class="lab">{{ countLabel }}</div>
    </div>

    <!-- table -->
    <div v-reveal class="card board">
      <div class="lhead">
        <div>Rang</div>
        <div>Trader</div>
        <div>Rendement</div>
        <div class="h-hide">PnL</div>
        <div class="h-hide">Trades</div>
        <div class="h-hide">Win</div>
        <div>Récompense</div>
      </div>
      <div>
        <div
          v-for="row in rows"
          :key="row.rank + '-' + row.name"
          class="lrow"
          :class="row.rankClass"
        >
          <div class="rk">{{ row.rank }}</div>
          <div class="who">
            <span class="av" :style="{ background: row.color }">{{ row.avatar }}</span>
            <span>
              <b>{{ row.name }}</b>
              <span>{{ row.address }}</span>
            </span>
          </div>
          <div class="ret">{{ row.ret }}</div>
          <div class="num c-hide">{{ row.pnl }}</div>
          <div class="num c-hide">{{ row.trades }}</div>
          <div class="num c-hide">{{ row.win }}</div>
          <div class="prize" :class="{ no: row.prize === '—' }">{{ row.prize }}</div>
        </div>

        <!-- ta ligne (statique, fidèle au source) -->
        <div class="lrow me">
          <div class="rk">18</div>
          <div class="who">
            <span class="av" style="background: #fff">P</span>
            <span>
              <b>toi — 0xPilote.eth</b>
              <span>↑ 6 rangs aujourd'hui</span>
            </span>
          </div>
          <div class="ret">+28.9%</div>
          <div class="num c-hide">+$26,041</div>
          <div class="num c-hide">206</div>
          <div class="num c-hide">69%</div>
          <div class="prize">$584</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toprow {
  display: grid;
  grid-template-columns: 1.2fr 2fr;
  gap: 14px;
  margin-bottom: 14px;
}
@media (max-width: 980px) {
  .toprow {
    grid-template-columns: 1fr;
  }
}

/* season card */
.season {
  padding: 26px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 230px;
}
.season .lab {
  margin-bottom: 12px;
}
.season .pot {
  font-family: var(--mono);
  font-weight: 700;
  font-size: clamp(48px, 6vw, 72px);
  letter-spacing: -0.04em;
  line-height: 0.9;
}
.season .potc {
  color: var(--soft);
  font-size: 14px;
  margin-top: 8px;
}
.cd {
  display: flex;
  gap: 8px;
  margin-top: 22px;
}
.cd div {
  flex: 1;
  text-align: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 4px;
}
.cd .v {
  font-family: var(--mono);
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}
.cd .l {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--soft);
  margin-top: 6px;
}

/* podium */
.podium {
  padding: 26px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  align-items: end;
}
@media (max-width: 620px) {
  .podium {
    grid-template-columns: 1fr;
  }
}
.pod {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  position: relative;
}
.pod.p1 {
  background: linear-gradient(180deg, rgba(255, 214, 107, 0.16), transparent);
  border-color: rgba(255, 214, 107, 0.4);
  transform: translateY(-14px);
}
.pod .crown {
  font-size: 22px;
  margin-bottom: 6px;
}
.pod .av {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  margin: 0 auto 12px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 17px;
  color: #0a0a0a;
}
.pod .rk {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--soft);
  letter-spacing: 0.1em;
}
.pod .nm {
  font-weight: 800;
  font-size: 17px;
  margin: 4px 0 2px;
}
.pod .ad {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--soft);
}
.pod .ret {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 26px;
  margin-top: 12px;
  color: var(--up);
  letter-spacing: -0.02em;
}
.pod .prize {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--gold);
  margin-top: 6px;
}

/* controls */
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.srch {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 100px;
  padding: 10px 16px;
  min-width: 240px;
}
.srch input {
  background: none;
  border: none;
  color: #fff;
  font-family: var(--mono);
  font-size: 12.5px;
  outline: none;
  width: 100%;
}
.srch input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

/* table */
.board {
  padding: 0;
}
.lhead,
.lrow {
  display: grid;
  grid-template-columns: 64px 1.8fr 1fr 1fr 0.8fr 0.9fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 16px 22px;
}
.lhead {
  border-bottom: 1px solid var(--line);
}
.lhead div {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mut2);
}
.lrow {
  border-bottom: 1px solid var(--line);
  transition: background 0.15s;
}
.lrow:hover {
  background: var(--panel2);
}
.lrow.me {
  background: rgba(79, 106, 255, 0.16);
}
.lrow:last-child {
  border-bottom: none;
}
.lrow .rk {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 18px;
}
.lrow.t1 .rk,
.lrow.t2 .rk,
.lrow.t3 .rk {
  color: var(--gold);
}
.lrow .who {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.lrow .av {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 12px;
  color: #0a0a0a;
}
.lrow .who b {
  font-weight: 700;
  font-size: 15px;
  display: block;
}
.lrow .who span {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--soft);
}
.lrow .ret {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 16px;
  color: var(--up);
}
.lrow .num {
  font-family: var(--mono);
  font-size: 13.5px;
}
.lrow .prize {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 13.5px;
  color: var(--gold);
}
.lrow .prize.no {
  color: var(--mut2);
  font-weight: 400;
}
.movement {
  font-family: var(--mono);
  font-size: 11px;
}
@media (max-width: 820px) {
  .lhead .h-hide,
  .lrow .c-hide {
    display: none;
  }
  .lhead,
  .lrow {
    grid-template-columns: 48px 2fr 1fr 1fr;
  }
}
</style>
