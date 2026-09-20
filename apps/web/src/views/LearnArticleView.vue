<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  getArticle,
  localizedArticles,
  localizedCategories,
  relatedArticles,
} from "../data/learn";
import type { Category } from "../data/learn/types";
import { tableOfContents } from "../data/learn/toc";
import { useI18n } from "../i18n/useI18n";
import { useArticleSeo } from "../composables/useSeo";
import ArticleBody from "../components/learn/ArticleBody.vue";
import CourseArtwork from "../components/learn/CourseArtwork.vue";

const props = defineProps<{ slug: string | undefined }>();
const emit = defineEmits<{ navigate: [path: string] }>();

const { t, locale, intlLocale } = useI18n({
  en: {
    home: "Tide School", minutes: "{n} min read", updated: "Updated {d}", onThisPage: "In this lesson",
    notFoundTitle: "Lesson not found", notFoundBody: "This lesson doesn't exist (yet). Head back to Tide School.",
    back: "← All lessons", ctaTitle: "Ready to put it to work?", ctaBody: "Open the terminal and trade it with virtual capital — zero risk.",
    ctaTrade: "Open Paper terminal", ctaComps: "Browse competitions", relatedTitle: "Your next move",
    lessonOf: "Lesson {n} of {total}", progress: "Course progress", freeCourse: "Free · bilingual course",
    practiceLabel: "Practice what you learn", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
  },
  fr: {
    home: "Tide School", minutes: "{n} min de lecture", updated: "Mis à jour le {d}", onThisPage: "Dans cette leçon",
    notFoundTitle: "Leçon introuvable", notFoundBody: "Cette leçon n'existe pas (encore). Retourne à Tide School.",
    back: "← Toutes les leçons", ctaTitle: "Prêt à passer à la pratique ?", ctaBody: "Ouvre le terminal et trade avec du capital virtuel — zéro risque.",
    ctaTrade: "Ouvrir le terminal Paper", ctaComps: "Voir les compétitions", relatedTitle: "La suite du parcours",
    lessonOf: "Leçon {n} sur {total}", progress: "Progression du cursus", freeCourse: "Cours gratuit · bilingue",
    practiceLabel: "Mets la leçon en pratique", beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé",
  },
});

const article = computed(() => getArticle(props.slug, locale.value));
const allArticles = computed(() => localizedArticles(locale.value));
const articlePosition = computed(() => {
  const index = allArticles.value.findIndex((item) => item.slug === props.slug);
  return index < 0 ? 1 : index + 1;
});
const courseProgress = computed(() => `${(articlePosition.value / allArticles.value.length) * 100}%`);
const related = computed(() => props.slug ? relatedArticles(props.slug, locale.value) : []);
const toc = computed(() => article.value ? tableOfContents(article.value.blocks) : []);

const categoryLabel = computed<Record<Category, string>>(() => {
  const map = {} as Record<Category, string>;
  for (const category of localizedCategories(locale.value)) map[category.id] = category.label;
  return map;
});

const updatedLabel = computed(() => {
  const currentArticle = article.value;
  if (!currentArticle) return "";
  const date = new Date(currentArticle.updated + "T00:00:00");
  return t("updated", { d: date.toLocaleDateString(intlLocale.value, { year: "numeric", month: "short", day: "numeric" }) });
});

useArticleSeo(article, locale);

const activeId = ref("");
let observer: IntersectionObserver | null = null;

function observeHeadings(): void {
  observer?.disconnect();
  if (typeof IntersectionObserver === "undefined") return;
  const elements = toc.value.map((entry) => document.getElementById(entry.id)).filter((element): element is HTMLElement => element !== null);
  if (!elements.length) return;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) activeId.value = entry.target.id;
  }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });
  elements.forEach((element) => observer?.observe(element));
}

function scrollTo(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  activeId.value = id;
}

onMounted(() => setTimeout(observeHeadings, 0));
watch([() => props.slug, locale], () => setTimeout(observeHeadings, 0));
onBeforeUnmount(() => observer?.disconnect());
function open(slug: string): void { emit("navigate", `/learn/${slug}`); }
</script>

<template>
  <div class="page learn-article">
    <template v-if="article">
      <nav class="crumb lab" aria-label="Breadcrumb">
        <a href="#/learn" @click.prevent="emit('navigate', '/learn')">{{ t("home") }}</a>
        <span>/</span><span>{{ categoryLabel[article.category] }}</span>
        <span>/</span><span class="current">{{ String(articlePosition).padStart(2, "0") }}</span>
      </nav>

      <header class="article-hero">
        <div class="hero-copy">
          <div class="hero-kicker lab">{{ t("lessonOf", { n: String(articlePosition).padStart(2, "0"), total: allArticles.length }) }}</div>
          <div class="meta lab">
            <span>{{ categoryLabel[article.category] }}</span><i></i><span>{{ t(article.difficulty) }}</span><i></i><span class="mono">{{ t("minutes", { n: article.minutes }) }}</span>
          </div>
          <h1>{{ article.title }}</h1>
          <p>{{ article.dek }}</p>
          <div class="hero-foot lab"><span>{{ updatedLabel }}</span><span>{{ t("freeCourse") }}</span></div>
        </div>
        <div class="hero-art"><CourseArtwork :slug="article.slug" /></div>
      </header>

      <div class="reading-grid">
        <aside class="course-rail">
          <div class="course-rail-inner">
            <div class="lab">{{ t("progress") }}</div>
            <div class="progress-copy"><b class="mono">{{ String(articlePosition).padStart(2, "0") }}</b><span class="mono">/ {{ allArticles.length }}</span></div>
            <div class="progress-track"><i :style="{ width: courseProgress }"></i></div>
            <a href="#/learn" class="rail-back lab" @click.prevent="emit('navigate', '/learn')">{{ t("back") }}</a>
          </div>
        </aside>

        <main class="article-paper">
          <ArticleBody :blocks="article.blocks" />
          <section class="practice-card" v-reveal>
            <div>
              <span class="lab">{{ t("practiceLabel") }}</span>
              <h2>{{ t("ctaTitle") }}</h2>
              <p>{{ t("ctaBody") }}</p>
            </div>
            <div class="cta-acts">
              <button class="btn btn-white" @click="emit('navigate', '/dashboard')">{{ t("ctaTrade") }} <span aria-hidden="true">↗</span></button>
              <button class="btn btn-line" @click="emit('navigate', '/competitions')">{{ t("ctaComps") }}</button>
            </div>
          </section>
        </main>

        <aside v-if="toc.length" class="toc">
          <div class="toc-inner">
            <div class="lab toc-head">{{ t("onThisPage") }}</div>
            <ul>
              <li v-for="entry in toc" :key="entry.id">
                <button :class="{ on: activeId === entry.id }" @click="scrollTo(entry.id)">{{ entry.text }}</button>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <section v-if="related.length" class="related">
        <div class="related-head"><span class="lab">{{ t("relatedTitle") }}</span><span class="mono">{{ related.length.toString().padStart(2, "0") }}</span></div>
        <div class="related-grid">
          <article v-for="next in related" :key="next.slug" class="related-card" tabindex="0" @click="open(next.slug)" @keydown.enter="open(next.slug)">
            <div class="related-art"><CourseArtwork :slug="next.slug" /></div>
            <div class="related-copy"><span class="lab">{{ categoryLabel[next.category] }} · {{ t("minutes", { n: next.minutes }) }}</span><h3>{{ next.title }}</h3><b aria-hidden="true">↗</b></div>
          </article>
        </div>
      </section>
    </template>

    <div v-else class="notfound">
      <span class="mono">404</span><h2>{{ t("notFoundTitle") }}</h2><p>{{ t("notFoundBody") }}</p>
      <button class="btn btn-white" @click="emit('navigate', '/learn')">{{ t("back") }}</button>
    </div>
  </div>
</template>

<style scoped>
.learn-article { --article-ink:#111318; padding-bottom:80px; }
.crumb { display:flex;align-items:center;gap:9px;padding:18px 3px;color:rgba(255,255,255,.56) }
.crumb a,.crumb .current{color:#fff}.crumb a:hover{opacity:.7}
.article-hero { min-height:500px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(390px,.65fr);overflow:hidden;border-radius:28px;color:#fff;background:var(--article-ink);position:relative }
.article-hero::before { content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(90deg,#000,transparent 65%) }
.hero-copy { position:relative;z-index:2;align-self:center;padding:clamp(36px,6vw,82px) }
.hero-kicker{color:#aeb8ff;margin-bottom:16px}.meta{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.58)}.meta i{width:4px;height:4px;border-radius:50%;background:var(--blue)}
.hero-copy h1 { max-width:900px;margin-top:22px;font-size:clamp(42px,6vw,84px);font-weight:900;line-height:.88;letter-spacing:-.055em;text-transform:uppercase }
.hero-copy>p { max-width:720px;margin-top:26px;color:rgba(255,255,255,.7);font-size:clamp(17px,1.6vw,21px);line-height:1.52 }
.hero-foot { display:flex;gap:25px;margin-top:30px;padding-top:18px;border-top:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.47) }
.hero-art { position:relative;z-index:1;min-height:500px;background:radial-gradient(circle at 50% 50%,rgba(79,106,255,.18),transparent 58%) }
.hero-art :deep(svg){transform:scale(1.16)}

.reading-grid { max-width:1320px;margin:48px auto 0;display:grid;grid-template-columns:170px minmax(0,760px) minmax(190px,1fr);gap:36px;align-items:start }
.course-rail-inner,.toc-inner{position:sticky;top:88px}.course-rail .lab{color:rgba(255,255,255,.62)}.progress-copy{display:flex;align-items:baseline;gap:6px;margin-top:10px}.progress-copy b{font-size:34px}.progress-copy span{color:rgba(255,255,255,.5);font-size:12px}.progress-track{height:4px;margin-top:12px;overflow:hidden;border-radius:5px;background:rgba(255,255,255,.18)}.progress-track i{display:block;height:100%;background:#fff}.rail-back{display:block;margin-top:22px;line-height:1.4;transition:opacity .2s}.rail-back:hover{opacity:.65}
.article-paper { min-width:0;padding:clamp(34px,5vw,72px);border-radius:26px;color:#fff;background:var(--article-ink) }
.practice-card { margin-top:58px;padding:30px;border:1px solid rgba(255,255,255,.13);border-radius:20px;background:linear-gradient(135deg,rgba(79,106,255,.34),rgba(79,106,255,.08)) }
.practice-card .lab{color:#c9d0ff}.practice-card h2{max-width:520px;margin-top:9px;font-size:clamp(26px,3vw,40px);line-height:.95;letter-spacing:-.035em;text-transform:uppercase}.practice-card p{max-width:520px;margin-top:10px;color:rgba(255,255,255,.66);font-size:15px;line-height:1.5}.cta-acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
.toc-head{margin-bottom:13px;color:rgba(255,255,255,.64)}.toc ul{list-style:none;border-left:1px solid rgba(255,255,255,.2)}.toc button{width:100%;padding:8px 0 8px 15px;margin-left:-1px;border:0;border-left:2px solid transparent;text-align:left;color:rgba(255,255,255,.58);background:none;font-size:13px;line-height:1.35;transition:.2s}.toc button:hover,.toc button.on{color:#fff}.toc button.on{border-left-color:#fff}
.related { max-width:1180px;margin:74px auto 0 }.related-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.related-head .mono{font-size:22px;font-weight:800;color:rgba(255,255,255,.45)}.related-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.related-card{display:grid;grid-template-columns:180px 1fr;min-height:160px;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:22px;color:#fff;background:var(--article-ink);cursor:pointer;outline:none;transition:transform .3s var(--ease),border-color .2s}.related-card:hover,.related-card:focus-visible{transform:translateY(-5px);border-color:rgba(255,255,255,.5)}.related-art{background:#151722;border-right:1px solid rgba(255,255,255,.1)}.related-copy{position:relative;padding:24px}.related-copy .lab{color:rgba(255,255,255,.47)}.related-copy h3{margin-top:10px;max-width:300px;font-size:20px;line-height:1.08;letter-spacing:-.025em}.related-copy b{position:absolute;right:20px;bottom:18px;color:var(--blue);font-size:22px}
.notfound{max-width:640px;margin:60px auto;padding:60px;border-radius:28px;text-align:center;color:#fff;background:var(--article-ink)}.notfound>span{font-size:60px;font-weight:800;color:var(--blue)}.notfound h2{margin-top:12px;font-size:32px;text-transform:uppercase}.notfound p{margin:12px 0 24px;color:rgba(255,255,255,.62)}
@media(max-width:1180px){.reading-grid{grid-template-columns:minmax(0,760px) minmax(190px,1fr);justify-content:center}.course-rail{display:none}.article-hero{grid-template-columns:1fr 38%}.related{padding-inline:16px}}
@media(max-width:900px){.article-hero{grid-template-columns:1fr}.hero-art{min-height:260px}.hero-art :deep(svg){transform:none}.reading-grid{grid-template-columns:minmax(0,760px)}.toc{display:none}.article-paper{border-radius:22px}.related-grid{grid-template-columns:1fr}}
@media(max-width:620px){.learn-article{padding-inline:14px}.crumb{font-size:9px}.article-hero{border-radius:22px}.hero-copy{padding:34px 24px}.hero-copy h1{font-size:clamp(38px,12vw,58px)}.hero-foot{flex-direction:column;gap:7px}.hero-art{min-height:210px}.reading-grid{margin-top:14px}.article-paper{padding:30px 22px}.related{padding:0}.related-card{grid-template-columns:120px 1fr}.related-copy{padding:18px}.related-copy h3{font-size:17px}}
</style>
