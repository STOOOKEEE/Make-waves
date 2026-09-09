<script setup lang="ts">
/*
 * Règlement complet + la case d'acceptation.
 *
 * Le règlement est long par construction : c'est ce qui rend la condition
 * suspensive et le droit d'annulation opposables. Il est donc replié par
 * défaut, mais la CASE reste toujours visible, hors du repli : on ne peut pas
 * demander à quelqu'un d'accepter un texte dont la case est enterrée dedans.
 */
import { computed } from "vue";
import { TERMS, TERMS_VERSION } from "../../data/giveaway-terms";
import { locale } from "../../i18n/locale";
import { useGiveawayTerms } from "../../composables/useGiveawayTerms";
import { useI18n } from "../../i18n/useI18n";

const terms = useGiveawayTerms();

const { t } = useI18n({
  en: {
    label: "The fine print, in full",
    title: "Rules of the operation",
    lead: "Twenty-four articles, because a conditional prize and a right to cancel are only worth what is written down. The condition itself is Article 3 and it is also stated at the top of this page.",
    open: "Read the full rules",
    close: "Close the rules",
    version: "Version {v}",
    article: "Article {n}",
    accept: "I have read and accept the rules of the operation, including the condition in Article 3: the prize is awarded only if Tide wins the Make Waves grand prize.",
    acceptedNote: "Accepted. You can enter.",
    requiredNote: "Accepting the rules is required before entering.",
  },
  fr: {
    label: "Les petites lignes, en entier",
    title: "Règlement de l'opération",
    lead: "Vingt-quatre articles, parce qu'un lot conditionnel et un droit d'annulation ne valent que ce qui est écrit. La condition elle-même est l'article 3, et elle est aussi annoncée en haut de cette page.",
    open: "Lire le règlement complet",
    close: "Fermer le règlement",
    version: "Version {v}",
    article: "Article {n}",
    accept: "J'ai lu et j'accepte le règlement de l'opération, y compris la condition de l'article 3 : le lot n'est attribué que si Tide remporte le grand prix Make Waves.",
    acceptedNote: "Accepté. Tu peux participer.",
    requiredNote: "L'acceptation du règlement est requise avant de participer.",
  },
});

const articles = computed(() =>
  TERMS.map((article, index) => ({
    id: article.id,
    number: index + 1,
    title: article.title[locale.value],
    paragraphs: article.paragraphs.map((p) => p[locale.value]),
  })),
);

function onToggle(event: Event): void {
  terms.setAccepted((event.target as HTMLInputElement).checked);
}
</script>

<template>
  <section class="terms">
    <div class="terms-head">
      <p class="lab">{{ t("label") }}</p>
      <h2>{{ t("title") }}</h2>
      <p class="terms-lead">{{ t("lead") }}</p>
      <p class="terms-version lab">{{ t("version", { v: TERMS_VERSION }) }}</p>
    </div>

    <details class="terms-doc">
      <summary>
        <span class="closed">{{ t("open") }}</span>
        <span class="opened">{{ t("close") }}</span>
      </summary>
      <ol class="terms-list">
        <li v-for="article in articles" :id="`terms-${article.id}`" :key="article.id">
          <p class="lab">{{ t("article", { n: article.number }) }}</p>
          <h3>{{ article.title }}</h3>
          <p v-for="(paragraph, i) in article.paragraphs" :key="i">{{ paragraph }}</p>
        </li>
      </ol>
    </details>

    <label class="terms-accept" :class="{ on: terms.accepted.value }">
      <input
        type="checkbox"
        :checked="terms.accepted.value"
        @change="onToggle"
      />
      <span class="box" aria-hidden="true"></span>
      <span class="text">{{ t("accept") }}</span>
    </label>
    <p class="terms-state lab">
      {{ terms.accepted.value ? t("acceptedNote") : t("requiredNote") }}
    </p>
  </section>
</template>

<style scoped>
.terms { display: grid; gap: 26px; }
.terms-head h2 { margin-top: 16px; font-size: clamp(28px, 3.6vw, 50px); font-weight: 900; line-height: .96; letter-spacing: -.035em; text-transform: uppercase; }
.terms-lead { max-width: 620px; margin-top: 16px; font-size: 15px; line-height: 1.55; color: var(--soft); }
.terms-version { margin-top: 14px; }

.terms-doc { border-top: 1px solid var(--line3); border-bottom: 1px solid var(--line3); }
.terms-doc summary { padding: 24px 0; font-family: var(--disp); font-size: 18px; font-weight: 800; letter-spacing: -.01em; cursor: pointer; list-style: none; }
.terms-doc summary::-webkit-details-marker { display: none; }
.terms-doc summary::after { content: "+"; float: right; font-family: var(--mono); font-weight: 400; color: var(--soft); }
.terms-doc[open] summary::after { content: "\2212"; }
.terms-doc summary .opened, .terms-doc[open] summary .closed { display: none; }
.terms-doc[open] summary .opened { display: inline; }

/* Le règlement est long : on le rend défilable dans son propre cadre pour que
   la case d'acceptation, elle, reste à portée immédiate. */
.terms-list { max-height: 60vh; overflow-y: auto; margin: 0 0 30px; padding: 0 8px 0 0; list-style: none; counter-reset: none; }
.terms-list li { max-width: 780px; padding: 22px 0; border-top: 1px solid var(--line); }
.terms-list li:first-child { border-top: 0; padding-top: 0; }
.terms-list h3 { margin: 8px 0 10px; font-size: 17px; font-weight: 800; letter-spacing: -.01em; }
.terms-list p:not(.lab) { margin-top: 9px; font-size: 14px; line-height: 1.65; color: var(--soft); }

.terms-accept { display: grid; grid-template-columns: auto 1fr; gap: 14px; align-items: start; max-width: 760px; padding: 20px 22px; border: 1px solid var(--line2); border-radius: 16px; cursor: pointer; transition: border-color .2s, background .2s; }
.terms-accept:hover { border-color: var(--line3); }
.terms-accept.on { border-color: var(--gold); background: rgba(255, 214, 107, .06); }
/* La case native est masquée mais reste focalisable au clavier : le carré
   dessiné en dessous porte l'anneau de focus. */
.terms-accept input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.terms-accept .box { width: 22px; height: 22px; margin-top: 1px; border: 1px solid var(--line3); border-radius: 6px; transition: background .2s, border-color .2s; }
.terms-accept.on .box { border-color: var(--gold); background: var(--gold); }
.terms-accept.on .box::after { content: ""; display: block; width: 6px; height: 11px; margin: 3px auto; border: solid var(--panel); border-width: 0 2px 2px 0; transform: rotate(45deg); }
.terms-accept input:focus-visible ~ .box { outline: 2px solid var(--text); outline-offset: 3px; }
.terms-accept .text { font-size: 14px; line-height: 1.6; }
.terms-state { color: var(--mut2); }
.terms-accept.on ~ .terms-state { color: var(--gold); }

@media (max-width: 620px) {
  .terms-accept { padding: 16px 16px; }
  .terms-list { max-height: none; }
}
</style>
