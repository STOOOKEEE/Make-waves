<script setup lang="ts">
import type { TideClient } from "@tide/client";
import { useWallet } from "../composables/useWallet";

/* Modale globale de signature Xaman : QR + deeplink + état. Pilotée par le
 * singleton useWallet (connexion de wallet OU swap Live). */
const props = defineProps<{ client: TideClient }>();
const { open, phase, title, signRequest, error, chooseXaman, chooseGem, close } =
  useWallet(props.client);
</script>

<template>
  <div v-if="open" class="ov" @click.self="close">
    <div class="modal">
      <div class="head">
        <span>{{ title }}</span>
        <button class="x" @click="close">✕</button>
      </div>

      <div v-if="phase === 'choose'" class="choose">
        <button class="wbtn" @click="chooseXaman">
          <span class="wlogo xaman">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg>
          </span>
          <span class="wtxt"><b>Xaman</b><span>Scan a QR with the mobile app</span></span>
        </button>
        <button class="wbtn" @click="chooseGem">
          <span class="wlogo gem">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" fill="#fff"/></svg>
          </span>
          <span class="wtxt"><b>GemWallet</b><span>Sign with the browser extension</span></span>
        </button>
      </div>
      <div v-else-if="phase === 'pending' && signRequest" class="body">
        <img :src="signRequest.qrPng" alt="Xaman QR" class="qr" />
        <a :href="signRequest.signUrl" target="_blank" rel="noopener" class="open">Open in Xaman →</a>
        <p class="hint">Scan with the Xaman app to sign — non-custodial.</p>
      </div>
      <div v-else-if="phase === 'pending'" class="msg">Creating request…</div>
      <div v-else-if="phase === 'signed'" class="msg ok">✓ Signed</div>
      <div v-else-if="phase === 'rejected'" class="msg ko">✕ Rejected in Xaman</div>
      <div v-else-if="phase === 'error'" class="msg ko">{{ error }}</div>
    </div>
  </div>
</template>

<style scoped>
.ov {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal {
  width: min(360px, 92vw);
  background: #14141a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 18px 20px 24px;
  color: #fff;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 16px;
}
.x {
  background: none;
  border: none;
  color: #8a8a93;
  cursor: pointer;
  font-size: 16px;
}
.body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.qr {
  width: 220px;
  height: 220px;
  border-radius: 12px;
  background: #fff;
}
.open {
  font-weight: 700;
  color: #bff6ce;
  text-decoration: none;
}
.hint {
  font-size: 12px;
  color: #8a8a93;
  text-align: center;
  margin: 0;
}
.msg {
  text-align: center;
  padding: 28px 0;
  font-weight: 700;
}
.msg.ok {
  color: #bff6ce;
}
.msg.ko {
  color: #ffb9ac;
}
.choose {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wbtn {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 13px;
  text-align: left;
  padding: 13px 15px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1b1b22;
  color: #fff;
  cursor: pointer;
}
.wbtn:hover {
  border-color: #bff6ce;
}
.wlogo {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wlogo.xaman {
  background: #3052ff;
}
.wlogo.gem {
  background: linear-gradient(135deg, #4f6aff, #2bd4c0);
}
.wtxt {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wtxt b {
  font-size: 15px;
}
.wtxt span {
  font-size: 12px;
  color: #8a8a93;
}
</style>
