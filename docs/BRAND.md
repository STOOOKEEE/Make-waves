---
version: alpha
name: TIDE
description: >-
  Design system de TIDE — plateforme de paper trading et de compétition de
  trading crypto/web3. Esthétique « terminal éditorial » : aplat bleu cornflower,
  typographie display tout-capitales, panneaux sombres en bento, data en
  monospace. Inspiration phantom.land. Mode sombre par défaut.

colors:
  # — Marque & surfaces
  blue: "#4F6AFF"            # accent primaire / fond app / CTA / états actifs
  blueDark: "#3F57E6"        # variante pressée / hover du bleu
  panel: "#16161B"           # surface des cartes (sur le bleu)
  panel2: "#1F1F26"          # surface enfoncée / hover de ligne / inputs
  # — Texte
  text: "#FFFFFF"            # texte primaire
  soft: "rgba(255,255,255,0.6)"   # texte secondaire / labels
  muted: "rgba(255,255,255,0.38)" # texte tertiaire / désactivé
  # — Lignes
  line: "rgba(255,255,255,0.08)"  # hairline standard
  line2: "rgba(255,255,255,0.16)" # bordure renforcée / contour de pill
  # — Sémantique (RÉSERVÉ à la donnée, jamais décoratif)
  up: "#BFF6CE"             # gain / P&L positif / long / courbes en hausse
  down: "#FFB9AC"          # perte / P&L négatif / short
  gold: "#FFD66B"          # récompenses / cagnottes / podium

typography:
  fontFamilies:
    display: '"Archivo", Helvetica, Arial, sans-serif'   # titres & UI
    mono: '"JetBrains Mono", ui-monospace, monospace'    # TOUS les chiffres & labels
  giant:                 # hero pleine page (landing)
    fontFamily: "{typography.fontFamilies.display}"
    fontSize: "clamp(54px, 12.4vw, 210px)"
    fontWeight: 900
    lineHeight: "0.86"
    letterSpacing: "-0.035em"
    textTransform: uppercase
  h1:                    # titre de page (app)
    fontFamily: "{typography.fontFamilies.display}"
    fontSize: "clamp(34px, 5vw, 64px)"
    fontWeight: 900
    lineHeight: "0.92"
    letterSpacing: "-0.035em"
    textTransform: uppercase
  h2:                    # titre de section
    fontFamily: "{typography.fontFamilies.display}"
    fontSize: "clamp(28px, 4.4vw, 58px)"
    fontWeight: 800
    lineHeight: "0.94"
    letterSpacing: "-0.03em"
  h3:                    # titre de carte / composant
    fontFamily: "{typography.fontFamilies.display}"
    fontSize: "18px"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "{typography.fontFamilies.display}"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "1.4"
  bodyLg:                # paragraphes landing
    fontFamily: "{typography.fontFamilies.display}"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "1.55"
  label:                 # eyebrow / micro-label technique
    fontFamily: "{typography.fontFamilies.mono}"
    fontSize: "10.5px"
    fontWeight: 500
    letterSpacing: "0.12em"
    textTransform: uppercase
  number:                # prix, %, soldes, classement
    fontFamily: "{typography.fontFamilies.mono}"
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "-0.02em"

spacing:
  xs: 6px
  sm: 8px
  md: 14px      # gouttière standard de la grille bento
  lg: 22px      # padding intérieur des cartes / page
  xl: 40px      # padding des grands blocs (hero, featured)
  containerMax: 1500px
  appbarHeight: 64px

rounded:
  sm: 8px       # petits boutons, badges, mark logo
  md: 12px      # inputs, boutons d'ordre, mini-cartes
  lg: 18px      # cartes principales
  pill: 100px   # pills, CTA, segmented control, chips
  full: 50%     # avatars, pastilles

components:
  card:
    backgroundColor: "{colors.panel}"
    borderRadius: "{rounded.lg}"
  buttonWhite:           # CTA primaire
    backgroundColor: "{colors.text}"
    color: "{colors.blue}"
    borderRadius: "{rounded.pill}"
    fontWeight: 700
  buttonLine:            # CTA secondaire
    backgroundColor: transparent
    borderColor: "rgba(255,255,255,0.4)"
    color: "{colors.text}"
    borderRadius: "{rounded.pill}"
  tabActive:             # onglet de nav actif
    backgroundColor: "{colors.text}"
    color: "{colors.blue}"
  tabIdle:
    color: "{colors.soft}"
  seg:                   # segmented control (conteneur)
    backgroundColor: "rgba(255,255,255,0.14)"
    borderRadius: "{rounded.pill}"
  segActive:
    backgroundColor: "{colors.text}"
    color: "{colors.blue}"
  walletPill:
    backgroundColor: "{colors.text}"
    color: "{colors.blue}"
    borderRadius: "{rounded.pill}"
  rankChip:
    borderColor: "rgba(255,255,255,0.3)"
    borderRadius: "{rounded.pill}"
  input:
    borderColor: "{colors.line}"
    borderRadius: "{rounded.md}"
    focusBorderColor: "{colors.blue}"
    valueFont: "{typography.fontFamilies.mono}"
  statusLive:
    backgroundColor: "rgba(191,246,206,0.16)"
    color: "{colors.up}"
  statusSoon:
    backgroundColor: "rgba(79,106,255,0.2)"
    color: "#AAB8FF"
  statusEnded:
    backgroundColor: "rgba(255,255,255,0.08)"
    color: "{colors.muted}"
  orderBuy:              # bouton Acheter / placer un long
    backgroundColor: "{colors.up}"
    color: "#06231A"
    borderRadius: "{rounded.md}"
  orderSell:             # bouton Vendre / placer un short
    backgroundColor: "{colors.down}"
    color: "#2A0A06"
    borderRadius: "{rounded.md}"

motion:
  ease: "cubic-bezier(0.16, 1, 0.3, 1)"
  reveal: "translateY(20-30px) + opacity, déclenché par IntersectionObserver"
  durations: { fast: 0.2s, base: 0.3s, slow: 0.9s }
---

## Overview

**TIDE** est une plateforme de **paper trading** et de **compétition de trading
crypto/web3** : on trade un capital fictif sur de vrais marchés, on grimpe au
classement, on encaisse des récompenses on-chain.

Le système visuel est un **« terminal éditorial »** : la rigueur d'un terminal
de trading (data dense, monospace, panneaux sombres) croisée avec l'audace d'un
site éditorial primé (typographie display monumentale tout-capitales, asymétrie,
beaucoup de respiration). Référence de ton : **phantom.land**.

- **Personnalité** : confiant, compétitif, technique, un brin adrénaline. Jamais
  corporate ni « fintech timide ».
- **Public** : traders crypto, dégens stratèges, compétiteurs.
- **Émotion visée** : confiance immédiate + envie d'en découdre.
- **Mode** : sombre par défaut. Le **bleu cornflower** est le socle, pas un accent
  ponctuel — c'est le fond de l'app et l'âme de la marque.
- **Marque** : wordmark **TIDE** + une marque en losange (triangle « pic »).

## Colors

Palette restreinte et disciplinée. **Une seule couleur de marque forte** (le
bleu) ; le reste est neutre + une sémantique stricte.

| Rôle | Token | Valeur | Usage |
|---|---|---|---|
| Marque / fond | `blue` | `#4F6AFF` | Fond de l'app, CTA, états actifs, liens, dernier prix |
| Marque (hover) | `blueDark` | `#3F57E6` | Pressé / variante |
| Surface | `panel` | `#16161B` | Cartes posées sur le bleu |
| Surface −1 | `panel2` | `#1F1F26` | Inputs, hover de ligne, mini-cartes |
| Texte | `text` | `#FFFFFF` | Texte primaire |
| Texte 2 | `soft` | `rgba(255,255,255,.6)` | Labels, secondaire |
| Texte 3 | `muted` | `rgba(255,255,255,.38)` | Désactivé, méta |
| Ligne | `line` | `rgba(255,255,255,.08)` | Hairlines |
| Ligne + | `line2` | `rgba(255,255,255,.16)` | Bordures, contours de pills |
| **Gain** | `up` | `#BFF6CE` | P&L positif, long, courbe en hausse |
| **Perte** | `down` | `#FFB9AC` | P&L négatif, short |
| **Récompense** | `gold` | `#FFD66B` | Cagnottes, podium, prix |

**Règles d'or :**
- `up` (menthe) et `down` (corail) sont **exclusivement sémantiques** — réservés
  aux chiffres P&L, sens des positions, bougies, courbes. **Jamais décoratifs.**
- `gold` est réservé à l'argent à gagner (cagnottes, classement, médailles).
- Sur fond `up`/`down`, le texte passe en encre foncée (`#06231A` / `#2A0A06`)
  pour le contraste.
- Pas de dégradés tape-à-l'œil : seulement de discrets *glow* radiaux bleus et un
  léger linear-gradient sur les blocs « featured ».

## Typography

Deux familles, contraste maximal.

- **Archivo** (display & UI) — grotesque neutre proche d'Helvetica. Les titres
  sont **lourds (800–900), tout en capitales, tracking serré** (`-0.035em`).
- **JetBrains Mono** (data) — **tout chiffre passe en mono** : prix, %, soldes,
  classement, countdowns. Les micro-labels techniques aussi (uppercase, tracking
  ouvert `0.12–0.14em`).

Hiérarchie : `giant` (hero) → `h1` (page) → `h2` (section) → `h3` (carte) →
`body`/`bodyLg` → `label`/`number`. **Contraste d'échelle** assumé : un titre
énorme à côté d'un petit label mono. Pas de texte sous **10.5px** sauf en
capitales mono pour un effet stylistique.

## Layout

Grille **bento** : des **panneaux `panel` sombres flottant sur le fond bleu**, le
bleu respirant dans les gouttières.

- **Gouttière** standard : `md` (14px). **Padding** carte/page : `lg` (22px),
  grands blocs : `xl` (40px).
- **Conteneur** : `max-width` ≈ 1500px, centré.
- **App-bar** sticky de 64px, posée directement sur le bleu (transparente).
- **Dashboard** : grille 3 colonnes `watchlist | centre | ordre` qui s'effondre
  en colonnes empilées sous 1200px puis 780px.
- **Tables** (positions, avoirs, classement) : colonnes en **lanes verticales
  alignées** (slots à largeur fixe pour rangs/icônes/actions), `grid` partagé
  entre l'en-tête et les lignes.
- Sections de page révélées au scroll, échelonnées.

## Elevation & Depth

La profondeur vient du **contraste de surface**, pas des ombres.

- Hiérarchie : `blue` (fond) < `panel` (carte) < `panel2` (enfoncé/hover).
- **Pas d'ombres portées 2010s.** Au plus un *glow* radial bleu très diffus
  derrière les blocs vedettes, et un **grain film** global (`.grain`,
  `opacity .04`, `mix-blend-mode: overlay`).
- Le sticky/blur n'est utilisé que sur des overlays (modal `backdrop-filter`).

## Shapes

Rayons cohérents par échelle :

- `sm` **8px** — petits boutons, badges, mark du logo.
- `md` **12px** — inputs, boutons d'ordre, mini-cartes.
- `lg` **18px** — cartes principales (le rayon signature).
- `pill` **100px** — pills, CTA, segmented control, chips, avatars d'action.
- `full` **50%** — avatars, pastilles d'état.

## Components

Inventaire des composants récurrents (définis dans `app.css` + pages).

- **App-bar / Nav** — wordmark + marque losange à gauche, onglets pills au centre
  (actif = pill blanche/texte bleu), chip de rang + équité + **wallet pill** à
  droite. *(`.appbar`, `.tabs`, `.wallet`, `.rankchip`)*
- **Boutons** — `buttonWhite` (primaire, pill blanche), `buttonLine` (secondaire,
  contour), `btn-dark`. Sur la landing : `pill-cta` blanche + **boutons
  magnétiques** (`data-mag`).
- **Card** — surface `panel`, rayon `lg`, `overflow:hidden`. Unité de base de
  tout le layout bento.
- **Segmented control** (`.seg`) — conteneur translucide + indicateur qui glisse ;
  dans le dashboard, l'indicateur est un fond blanc animé. Sert aux filtres de
  période, scopes de classement, filtres de compétitions.
- **Status badges** — `statusLive` (menthe + point clignotant), `statusSoon`
  (bleu), `statusEnded` (gris). Pour l'état des compétitions.
- **Chips** — `rankChip` (contour blanc), tags de filtre (pill contour → actif
  blanc).
- **Inputs & ticket d'ordre** — champ à bordure `line`, focus `blue`, valeur en
  mono ; toggle **Acheter/Vendre** (`orderBuy`/`orderSell`), type Marché/Limite/
  Stop, raccourcis 25/50/75/100 %, réglage de levier, résumé live, bouton placer.
- **Tables** — positions, avoirs, carnet d'ordres, classement : en-tête `line` +
  lignes `line`, hover `panel2`, chiffres en mono, ligne « toi » surlignée bleue.
- **Chart chandeliers** (dashboard) — SVG généré, bougies `up`/`down`, grille
  `line`, ligne de dernier prix bleue, animation d'apparition bougie par bougie.
  Courbe d'équité / sparklines : tracé `up` qui se **dessine** (stroke-dashoffset).
- **Donut / anneau** (portefeuille) — répartition d'actifs, anneau de win-rate.
- **Modal multi-étapes** (`competition.html`) — overlay flouté, points de
  progression, étapes Wallet → Règles (checkbox) → Succès.
- **Landing-only** — `giant` hero animé (lignes qui montent), **marquee** cinétique
  (texte plein + contour `-webkit-text-stroke`), **sticker** rond rotatif,
  app-bar en `mix-blend-mode: difference`, barre de progression de scroll.

## Do's and Don'ts

**À faire**
- Garder **le bleu comme unique accent fort** ; tout le reste neutre.
- Mettre **tout chiffre en JetBrains Mono** (prix, %, soldes, classement).
- Poser des **cartes `panel` sur le bleu** avec gouttière 14px (bento).
- Réserver **menthe/corail au P&L** et l'**or aux récompenses**.
- Aligner les colonnes de tableau en **lanes** (slots à largeur fixe).
- Animer avec l'easing maison `cubic-bezier(.16,1,.3,1)` ; reveals au scroll.
- Respecter `prefers-reduced-motion`.

**À éviter**
- ❌ Menthe / corail / or en **décoration** (réservés à la sémantique).
- ❌ Empiler des **ombres portées** ou des dégradés voyants (style 2010s).
- ❌ Texte sous **10.5px** hors capitales mono.
- ❌ Mélanger d'autres polices que Archivo + JetBrains Mono.
- ❌ Introduire un **second accent fort** qui concurrence le bleu.
- ❌ Titres en bas-de-casse léger : les titres sont **lourds & capitales**.

---

## Annexe — Structure du projet

| Fichier | Rôle |
|---|---|
| `app.css` | Base partagée : tokens (`:root`), app-bar, cartes, pills, helpers. Source de vérité. |
| `comps.js` | Données des compétitions (`window.COMPS`, `getComp(id)`), partagées liste/détail. |
| `index.html` | Landing (style phantom.land, hero `giant`, marquee, manifeste, CTA). |
| `dashboard.html` | Terminal de trading (chart, ticket d'ordre, carnet, positions, watchlist). |
| `portfolio.html` | Portefeuille (KPIs, courbe d'équité, donut, avoirs, stats). |
| `leaderboard.html` | Classement (saison, podium, table, ta ligne). |
| `competitions.html` | Liste des compétitions (vedette + grille filtrable, cartes cliquables). |
| `competition.html` | Détail compétition + flux d'inscription (modal 3 étapes). |

**Patterns de motion** (réutiliser tels quels) :
- **Reveal** : classe `.rv` → `.in` via `IntersectionObserver`, delays échelonnés.
- **Compteurs** : `data-count` animé en `easeOutCubic`.
- **Tracés SVG** : `stroke-dasharray/offset` pour les courbes qui se dessinent.
- **Easing** unique : `--ease: cubic-bezier(.16,1,.3,1)`.
- **Grain** + (landing) curseur supprimé, blend-mode sur la nav.
