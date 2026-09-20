<script setup lang="ts">
import { computed, watchEffect } from "vue";
import CourseArtwork from "../components/learn/CourseArtwork.vue";
import { useTutorial } from "../composables/useTutorial";
import { articlesByCategory } from "../data/learn";
import type { Article, Category, Difficulty } from "../data/learn/types";
import { useI18n } from "../i18n/useI18n";

const emit = defineEmits<{ navigate: [path: string] }>();

const { t, locale } = useI18n({
  en: {
    eyebrow: "Tide School · Free curriculum",
    titleA: "Learn the market.", titleB: "Make waves.",
    subtitle: "A practical path from your first candle to an on-chain track record. Learn the concepts, test every reflex with virtual capital, then compete when you're ready.",
    heroCta: "Explore the path", heroPractice: "Practice in Paper",
    visualFlow: "Paper → skill → proof", outcomeLabel: "Outcome",
    lessons: "Lessons", tracks: "Tracks", cost: "Cost", free: "Free",
    tutLabel: "Your fastest first step",
    tutTitle: "Learn by placing a trade — not by watching one.",
    tutBody: "Ten guided minutes on live market data. Place an order, set a stop and see leverage in motion. The money is virtual; the reflexes are real.",
    tutStart: "Start guided tutorial", tutResume: "Resume · step {n}/{total}", tutRestart: "Run the tutorial again",
    curriculumLabel: "The curriculum", curriculumTitle: "One road. Four tides.",
    curriculumBody: "Each module unlocks the language and instincts you need for the next. Follow the route in order, or jump directly to the lesson you need.",
    jumpTo: "Jump to module", module: "Module {n}", lessonsCount: "{n} lessons",
    lvBeginner: "Foundations", lvIntermediate: "Mechanics", lvAdvanced: "Edge", lvPro: "Proof",
    descBasics: "Read the market, understand orders and learn how Tide works.",
    descPerps: "Explore perps, leverage, long and short without risking real money.",
    descStrategies: "Build a repeatable process for risk, entries and psychology.",
    descPlatform: "Turn practice into competition results and verifiable proof.",
    outcomeBasics: "You can read and place a trade", outcomePerps: "You understand leveraged products",
    outcomeStrategies: "You can execute a trading plan", outcomePlatform: "You are ready to compete",
    readCta: "Open lesson", minutesRead: "{n} min", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
    finishLabel: "Course complete", ctaTitle: "Knowledge becomes skill in the terminal.",
    ctaBody: "Put the framework to work with $10,000 of virtual capital on live crypto markets.",
    ctaTrade: "Open Paper terminal", ctaComps: "Browse competitions",
  },
  fr: {
    eyebrow: "Tide School · Cursus gratuit",
    titleA: "Apprends le marché.", titleB: "Crée la vague.",
    subtitle: "Un parcours pratique, de ta première bougie à un track record on-chain. Comprends les concepts, teste chaque réflexe en capital virtuel, puis participe quand tu es prêt.",
    heroCta: "Explorer le parcours", heroPractice: "Pratiquer en Paper",
    visualFlow: "Paper → réflexes → preuve", outcomeLabel: "Objectif",
    lessons: "Leçons", tracks: "Modules", cost: "Prix", free: "Gratuit",
    tutLabel: "Ton premier pas le plus rapide",
    tutTitle: "Apprends en passant un trade — pas en le regardant.",
    tutBody: "Dix minutes guidées sur les données de marché en direct. Passe un ordre, pose un stop et vois le levier en action. L'argent est virtuel ; les réflexes sont réels.",
    tutStart: "Lancer le tutoriel guidé", tutResume: "Reprendre · étape {n}/{total}", tutRestart: "Refaire le tutoriel",
    curriculumLabel: "Le cursus", curriculumTitle: "Une route. Quatre marées.",
    curriculumBody: "Chaque module débloque le langage et les réflexes nécessaires au suivant. Suis la route dans l'ordre, ou va directement à la leçon qu'il te faut.",
    jumpTo: "Aller au module", module: "Module {n}", lessonsCount: "{n} leçons",
    lvBeginner: "Fondations", lvIntermediate: "Mécaniques", lvAdvanced: "Avantage", lvPro: "Preuve",
    descBasics: "Lis le marché, comprends les ordres et découvre comment Tide fonctionne.",
    descPerps: "Explore perps, levier, long et short sans risquer d'argent réel.",
    descStrategies: "Construis une méthode répétable pour le risque, les entrées et la psychologie.",
    descPlatform: "Transforme ta pratique en résultats et en preuves vérifiables.",
    outcomeBasics: "Tu sais lire et passer un trade", outcomePerps: "Tu comprends les produits à levier",
    outcomeStrategies: "Tu sais exécuter un plan de trading", outcomePlatform: "Tu es prêt à participer",
    readCta: "Ouvrir la leçon", minutesRead: "{n} min", beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé",
    finishLabel: "Parcours terminé", ctaTitle: "La connaissance devient un réflexe dans le terminal.",
    ctaBody: "Mets la méthode en pratique avec 10 000 $ de capital virtuel sur les vrais marchés crypto.",
    ctaTrade: "Ouvrir le terminal Paper", ctaComps: "Voir les compétitions",
  },
});

const LEVEL_META: { id: Category; tagKey: string; descKey: string; outcomeKey: string }[] = [
  { id: "basics", tagKey: "lvBeginner", descKey: "descBasics", outcomeKey: "outcomeBasics" },
  { id: "perps", tagKey: "lvIntermediate", descKey: "descPerps", outcomeKey: "outcomePerps" },
  { id: "strategies", tagKey: "lvAdvanced", descKey: "descStrategies", outcomeKey: "outcomeStrategies" },
  { id: "platform", tagKey: "lvPro", descKey: "descPlatform", outcomeKey: "outcomePlatform" },
];

interface RoadStop extends Article { side: "left" | "right"; index: number }
interface RoadLevel { id: Category; n: string; label: string; tag: string; desc: string; outcome: string; path: string; stops: RoadStop[] }

function makeRoadPath(count: number): string {
  let d = "M 500 0";
  let previousX = 500;
  let previousY = 0;
  for (let i = 0; i < count; i += 1) {
    const x = i % 2 === 0 ? 400 : 600;
    const y = 115 + i * 230;
    const mid = (previousY + y) / 2;
    d += ` C ${previousX} ${mid}, ${x} ${mid}, ${x} ${y}`;
    previousX = x;
    previousY = y;
  }
  const endY = count * 230;
  const mid = (previousY + endY) / 2;
  return `${d} C ${previousX} ${mid}, 500 ${mid}, 500 ${endY}`;
}

const roadmap = computed<RoadLevel[]>(() => {
  const groups = articlesByCategory(locale.value);
  let articleIndex = 0;
  return LEVEL_META.map((level, levelIndex) => {
    const group = groups.find((item) => item.id === level.id);
    const stops = (group?.articles ?? []).map((article, index) => ({
      ...article,
      side: (index % 2 === 0 ? "left" : "right") as "left" | "right",
      index: articleIndex++,
    }));
    return { id: level.id, n: String(levelIndex + 1).padStart(2, "0"), label: group?.label ?? level.id,
      tag: t(level.tagKey), desc: t(level.descKey), outcome: t(level.outcomeKey), path: makeRoadPath(stops.length), stops };
  });
});

const lessonCount = computed(() => roadmap.value.reduce((total, level) => total + level.stops.length, 0));
const tutorial = useTutorial();
const tutorialCta = computed(() => {
  if (tutorial.status.value === "done") return t("tutRestart");
  if (tutorial.isResumable.value) return t("tutResume", { n: tutorial.index.value + 1, total: tutorial.total });
  return t("tutStart");
});

function difficultyLabel(difficulty: Difficulty): string { return t(difficulty); }
function open(slug: string): void { emit("navigate", `/learn/${slug}`); }
function scrollToCurriculum(): void { document.getElementById("curriculum")?.scrollIntoView({ behavior: "smooth" }); }
watchEffect(() => { document.title = `Tide School — ${t("titleA")} ${t("titleB")} | TIDE`; });
</script>

<template>
  <div class="page learn">
    <section class="learn-hero" aria-labelledby="learn-title">
      <div class="hero-copy">
        <div class="lab hero-label">{{ t("eyebrow") }}</div>
        <h1 id="learn-title"><span>{{ t("titleA") }}</span><em>{{ t("titleB") }}</em></h1>
        <p>{{ t("subtitle") }}</p>
        <div class="hero-actions">
          <button class="btn btn-white" type="button" @click="scrollToCurriculum">{{ t("heroCta") }} <span aria-hidden="true">↓</span></button>
          <button class="btn hero-link" type="button" @click="emit('navigate', '/dashboard')">{{ t("heroPractice") }} <span aria-hidden="true">↗</span></button>
        </div>
        <dl class="hero-stats">
          <div><dt class="lab">{{ t("lessons") }}</dt><dd class="mono">{{ lessonCount }}</dd></div>
          <div><dt class="lab">{{ t("tracks") }}</dt><dd class="mono">04</dd></div>
          <div><dt class="lab">{{ t("cost") }}</dt><dd>{{ t("free") }}</dd></div>
        </dl>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div>
        <img src="/learn/tide-school-journey.png" alt="" />
        <span class="visual-note lab">{{ t("visualFlow") }}</span>
      </div>
    </section>

    <a class="tutorial-card" href="#/tutorial" @click.prevent="emit('navigate', '/tutorial')" v-reveal>
      <span class="tutorial-index mono">00</span>
      <div class="tutorial-copy"><span class="lab">{{ t("tutLabel") }}</span><h2>{{ t("tutTitle") }}</h2><p>{{ t("tutBody") }}</p></div>
      <span class="tutorial-cta"><span class="tutorial-play" aria-hidden="true">▶</span><span>{{ tutorialCta }}</span></span>
    </a>

    <section id="curriculum" class="curriculum-head" v-reveal>
      <div><span class="lab">{{ t("curriculumLabel") }}</span><h2>{{ t("curriculumTitle") }}</h2></div>
      <div class="curriculum-aside">
        <p>{{ t("curriculumBody") }}</p>
        <nav :aria-label="t('jumpTo')" class="module-nav">
          <a v-for="level in roadmap" :key="level.id" :href="`#level-${level.id}`" class="mono">{{ level.n }}</a>
        </nav>
      </div>
    </section>

    <div class="journey">
      <section v-for="level in roadmap" :id="`level-${level.id}`" :key="level.id" class="level">
        <header class="level-head" v-reveal>
          <div class="level-number mono">{{ level.n }}</div>
          <div class="level-title"><span class="lab">{{ t("module", { n: level.n }) }} · {{ level.tag }}</span><h2>{{ level.label }}</h2></div>
          <p class="level-desc">{{ level.desc }}</p>
          <div class="level-outcome"><span class="outcome-mark" aria-hidden="true">✓</span><span><small class="lab">{{ t("outcomeLabel") }}</small>{{ level.outcome }}</span></div>
        </header>

        <div class="level-route" :style="{ '--stop-count': level.stops.length }">
          <svg class="road-line" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
            <path class="road-edge" :d="level.path" /><path class="road-surface" :d="level.path" /><path class="road-dash" :d="level.path" />
          </svg>
          <article v-for="stop in level.stops" :key="stop.slug" class="stop" :class="stop.side" v-reveal>
            <button class="checkpoint mono" type="button" :aria-label="stop.title" @click="open(stop.slug)">{{ String(stop.index + 1).padStart(2, "0") }}</button>
            <div class="lesson-card" role="link" tabindex="0" @click="open(stop.slug)" @keydown.enter="open(stop.slug)" @keydown.space.prevent="open(stop.slug)">
              <div class="lesson-art"><CourseArtwork :slug="stop.slug" /></div>
              <div class="lesson-copy">
                <div class="lesson-meta"><span class="difficulty mono">{{ difficultyLabel(stop.difficulty) }}</span><span class="mono">{{ t("minutesRead", { n: stop.minutes }) }}</span></div>
                <h3>{{ stop.title }}</h3><p>{{ stop.dek }}</p>
                <span class="lesson-go">{{ t("readCta") }} <b aria-hidden="true">↗</b></span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <section class="finish-card" v-reveal>
      <div class="finish-mark" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="finish-copy"><span class="lab">{{ t("finishLabel") }}</span><h2>{{ t("ctaTitle") }}</h2><p>{{ t("ctaBody") }}</p></div>
      <div class="finish-actions">
        <button class="btn btn-white" @click="emit('navigate', '/dashboard')">{{ t("ctaTrade") }} <span aria-hidden="true">↗</span></button>
        <button class="btn btn-line" @click="emit('navigate', '/competitions')">{{ t("ctaComps") }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.learn { --learn-ink:#111318; padding-bottom:80px; }
.learn-hero { min-height:620px; display:grid; grid-template-columns:minmax(0,.92fr) minmax(460px,1.08fr); overflow:hidden; position:relative; border:1px solid rgba(255,255,255,.14); border-radius:30px; background:radial-gradient(circle at 76% 18%,rgba(79,106,255,.2),transparent 32%),var(--learn-ink); }
.learn-hero::before { content:""; position:absolute; inset:0; pointer-events:none; background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px); background-size:42px 42px; mask-image:linear-gradient(90deg,#000,transparent 72%); }
.hero-copy { position:relative; z-index:2; align-self:center; padding:clamp(42px,6vw,86px); }
.hero-label { color:#aeb8ff; margin-bottom:22px; }
.hero-copy h1 { display:grid; font-size:clamp(48px,6.6vw,98px); font-weight:900; letter-spacing:-.06em; line-height:.82; text-transform:uppercase; }
.hero-copy h1 em { color:var(--blue); font-style:normal; }
.hero-copy>p { max-width:620px; margin-top:30px; color:rgba(255,255,255,.72); font-size:clamp(16px,1.5vw,20px); line-height:1.55; }
.hero-actions { display:flex; gap:12px; flex-wrap:wrap; margin-top:30px; }
.hero-link { color:#fff; background:transparent; border:1px solid rgba(255,255,255,.23); }
.hero-link:hover { background:rgba(255,255,255,.08); transform:translateY(-2px); }
.hero-stats { display:flex; margin-top:48px; border-top:1px solid rgba(255,255,255,.12); max-width:530px; }
.hero-stats>div { min-width:130px; padding:18px 26px 0 0; margin-right:26px; border-right:1px solid rgba(255,255,255,.12); }
.hero-stats>div:last-child { border:0; }.hero-stats dt{margin-bottom:5px}.hero-stats dd{font-weight:800;font-size:22px}
.hero-visual { position:relative; min-height:620px; display:grid; place-items:center; }
.hero-visual::after { content:""; position:absolute; inset:12% 5% 6%; border:1px solid rgba(255,255,255,.11); border-radius:50%; transform:rotate(-16deg); }
.hero-visual img { position:relative; z-index:2; width:min(760px,118%); max-width:none; transform:translateX(-3%); filter:saturate(.82) contrast(1.03); mix-blend-mode:screen; }
.hero-orbit { position:absolute; border:1px solid rgba(125,145,255,.27); border-radius:50%; }.orbit-one{width:86%;aspect-ratio:1;transform:rotate(16deg)}.orbit-two{width:61%;aspect-ratio:1;transform:rotate(-24deg)}
.visual-note { position:absolute;z-index:3;right:34px;bottom:28px;border:1px solid rgba(255,255,255,.2);border-radius:99px;padding:9px 13px;color:rgba(255,255,255,.78);background:rgba(17,19,24,.62) }
.tutorial-card { display:grid;grid-template-columns:96px minmax(0,1fr) auto;align-items:center;gap:28px;margin:14px 0 92px;padding:30px 34px;border:1px solid rgba(255,255,255,.25);border-radius:24px;background:rgba(255,255,255,.09);transition:background .25s,transform .3s var(--ease) }
.tutorial-card:hover{background:rgba(255,255,255,.14);transform:translateY(-3px)}.tutorial-index{font-size:44px;font-weight:800;color:rgba(255,255,255,.24)}.tutorial-copy .lab{color:rgba(255,255,255,.68)}
.tutorial-copy h2{margin-top:6px;font-size:clamp(23px,2.4vw,34px);line-height:1.02;letter-spacing:-.03em;text-transform:uppercase}.tutorial-copy p{max-width:690px;margin-top:9px;color:rgba(255,255,255,.72);font-size:15px;line-height:1.55}
.tutorial-cta{display:flex;align-items:center;gap:12px;max-width:240px;font-weight:800}.tutorial-play{width:48px;height:48px;display:grid;place-items:center;flex:0 0 auto;color:var(--blue);background:#fff;border-radius:50%;font-size:12px}
.curriculum-head{display:grid;grid-template-columns:1fr minmax(320px,.72fr);gap:80px;align-items:end;max-width:1220px;margin:0 auto 58px;scroll-margin-top:90px}.curriculum-head h2{margin-top:10px;font-size:clamp(44px,7vw,96px);line-height:.84;letter-spacing:-.055em;text-transform:uppercase}
.curriculum-aside p{max-width:500px;color:rgba(255,255,255,.83);font-size:17px;line-height:1.55}.module-nav{display:flex;gap:8px;margin-top:22px}.module-nav a{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.3);border-radius:50%;font-size:11px;transition:.2s}.module-nav a:hover{color:var(--blue);background:#fff;border-color:#fff;transform:translateY(-2px)}
.journey{max-width:1180px;margin:0 auto}.level{scroll-margin-top:84px;margin-bottom:80px}.level-head{display:grid;grid-template-columns:100px minmax(240px,.8fr) minmax(240px,1fr) minmax(230px,.7fr);gap:28px;align-items:center;min-height:150px;padding:26px 30px;border-radius:24px;color:#fff;background:var(--learn-ink);position:relative;z-index:3}
.level-number{font-size:52px;font-weight:800;color:var(--blue)}.level-title .lab{color:#aeb8ff}.level-title h2{font-size:clamp(28px,3.2vw,48px);line-height:.92;letter-spacing:-.04em;text-transform:uppercase;margin-top:7px}.level-desc{color:rgba(255,255,255,.66);font-size:15px;line-height:1.5}
.level-outcome{display:flex;gap:12px;align-items:center;padding-left:24px;border-left:1px solid rgba(255,255,255,.12);font-size:14px;font-weight:700;line-height:1.3}.level-outcome small{display:block;margin-bottom:5px;color:rgba(255,255,255,.42)}.outcome-mark{width:36px;height:36px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;color:var(--blue);background:#fff;font-weight:900}
.level-route{--row-height:230px;--route-height:calc(var(--stop-count) * var(--row-height));position:relative;height:var(--route-height)}.road-line{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}.road-line path{fill:none;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}.road-edge{stroke:rgba(255,255,255,.25);stroke-width:46}.road-surface{stroke:rgba(17,19,24,.92);stroke-width:35}.road-dash{stroke:rgba(255,255,255,.82);stroke-width:2;stroke-dasharray:9 12}
.stop{position:relative;z-index:2;height:var(--row-height);display:grid;grid-template-columns:minmax(0,1fr) 20% minmax(0,1fr);align-items:center}.checkpoint{position:relative;z-index:4;grid-row:1;width:52px;height:52px;display:grid;place-items:center;border:6px solid var(--learn-ink);border-radius:50%;color:var(--blue);background:#fff;font-size:11px;font-weight:800;box-shadow:0 0 0 1px rgba(255,255,255,.55);transition:transform .25s var(--ease)}
.stop.left .checkpoint{grid-column:2;justify-self:start;transform:translateX(-26px)}.stop.right .checkpoint{grid-column:2;justify-self:end;transform:translateX(26px)}.stop.left .checkpoint:hover{transform:translateX(-26px) scale(1.08)}.stop.right .checkpoint:hover{transform:translateX(26px) scale(1.08)}.checkpoint::after{content:"";position:absolute;top:50%;width:54px;height:1px;background:rgba(255,255,255,.46)}.stop.left .checkpoint::after{right:100%}.stop.right .checkpoint::after{left:100%}
.lesson-card{display:grid;grid-template-columns:42% 58%;height:196px;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:22px;color:#fff;background:var(--learn-ink);cursor:pointer;outline:none;transition:transform .3s var(--ease),border-color .25s,background .25s}.lesson-card:hover,.lesson-card:focus-visible{transform:translateY(-6px);border-color:rgba(255,255,255,.52);background:#151824}.stop.left .lesson-card{grid-column:1;margin-right:38px}.stop.right .lesson-card{grid-column:3;margin-left:38px}
.lesson-art{min-width:0;border-right:1px solid rgba(255,255,255,.1);background:#13151d}.lesson-copy{min-width:0;padding:19px 20px 17px;display:flex;flex-direction:column}.lesson-meta{display:flex;justify-content:space-between;gap:10px;color:rgba(255,255,255,.47);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase}.lesson-meta .difficulty{color:#c7ceff}.lesson-copy h3{margin-top:11px;font-size:18px;line-height:1.08;letter-spacing:-.025em}.lesson-copy p{margin-top:7px;color:rgba(255,255,255,.58);font-size:12.5px;line-height:1.42;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.lesson-go{margin-top:auto;color:#fff;font-size:12px;font-weight:800}.lesson-go b{color:var(--blue);margin-left:4px;font-size:15px;transition:transform .2s;display:inline-block}.lesson-card:hover .lesson-go b{transform:translate(3px,-3px)}
.finish-card{max-width:1180px;margin:20px auto 0;padding:clamp(34px,5vw,68px);display:grid;grid-template-columns:130px 1fr auto;align-items:center;gap:42px;border-radius:28px;color:#fff;background:var(--learn-ink)}.finish-mark{width:110px;height:110px;position:relative;display:grid;place-items:center;border:1px solid rgba(255,255,255,.17);border-radius:50%}.finish-mark::before,.finish-mark::after{content:"";position:absolute;border:1px solid rgba(79,106,255,.55);border-radius:50%}.finish-mark::before{inset:13px}.finish-mark::after{inset:28px;background:var(--blue)}.finish-mark span{position:relative;z-index:2;width:4px;height:22px;margin:0 2px;border-radius:4px;background:#fff;display:inline-block;transform-origin:bottom}.finish-mark span:first-child{transform:scaleY(.55)}.finish-mark span:last-child{transform:scaleY(.78)}
.finish-copy .lab{color:#aeb8ff}.finish-copy h2{max-width:650px;margin-top:8px;font-size:clamp(30px,4.2vw,58px);line-height:.92;letter-spacing:-.045em;text-transform:uppercase}.finish-copy p{max-width:570px;margin-top:14px;color:rgba(255,255,255,.64);font-size:15px;line-height:1.5}.finish-actions{display:flex;flex-direction:column;align-items:stretch;gap:10px}.finish-actions .btn{justify-content:center;white-space:nowrap}
@media(max-width:1120px){.learn-hero{grid-template-columns:1fr 46%;min-height:560px}.hero-visual{min-height:560px}.hero-visual img{width:135%}.level-head{grid-template-columns:84px 1fr 1fr}.level-outcome{display:none}.lesson-card{grid-template-columns:1fr;height:206px}.lesson-art{display:none}.lesson-copy{padding:22px}}
@media(max-width:820px){.learn{padding-inline:14px}.learn-hero{grid-template-columns:1fr;min-height:0}.hero-copy{padding:42px 28px 30px}.hero-copy h1{font-size:clamp(44px,13vw,72px)}.hero-visual{min-height:340px;overflow:hidden}.hero-visual img{width:112%;transform:translateY(-2%)}.hero-stats>div{min-width:0;flex:1;margin-right:16px;padding-right:16px}.visual-note{right:18px;bottom:16px}.tutorial-card{grid-template-columns:1fr;gap:16px;margin-bottom:70px;padding:26px}.tutorial-index{display:none}.tutorial-cta{max-width:none}.curriculum-head{grid-template-columns:1fr;gap:24px}.curriculum-head h2{font-size:clamp(43px,13vw,72px)}.level-head{grid-template-columns:62px 1fr;gap:16px;padding:24px 20px}.level-number{font-size:34px}.level-desc{grid-column:1/-1}.level-route{height:auto;padding:20px 0 20px 48px}.level-route::before{content:"";position:absolute;left:22px;top:0;bottom:0;width:16px;border-radius:20px;background:var(--learn-ink);box-shadow:inset 0 0 0 1px rgba(255,255,255,.24)}.level-route::after{content:"";position:absolute;left:29px;top:14px;bottom:14px;border-left:2px dashed rgba(255,255,255,.7)}.road-line{display:none}.stop{height:auto;min-height:0;display:block;margin:20px 0}.checkpoint,.stop.left .checkpoint,.stop.right .checkpoint{position:absolute;left:-49px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-width:4px}.stop.left .checkpoint:hover,.stop.right .checkpoint:hover{transform:translateY(-50%) scale(1.05)}.checkpoint::after{display:none}.lesson-card,.stop.left .lesson-card,.stop.right .lesson-card{margin:0;width:100%;height:auto;min-height:200px}.lesson-art{display:block;min-height:150px;border:0;border-bottom:1px solid rgba(255,255,255,.1)}.finish-card{grid-template-columns:1fr;gap:28px}.finish-mark{width:86px;height:86px}.finish-actions{align-items:flex-start}}
@media(max-width:520px){.hero-copy{padding-inline:22px}.hero-copy>p{font-size:16px}.hero-stats{margin-top:34px}.hero-stats dt{font-size:8px}.hero-stats dd{font-size:17px}.hero-visual{min-height:270px}.hero-visual img{width:126%}.curriculum-head{margin-bottom:34px}.lesson-art{min-height:132px}.finish-actions{width:100%}.finish-actions .btn{width:100%}}
</style>
