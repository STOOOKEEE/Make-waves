/* ===== Page « Vision & roadmap » — contenu bilingue + résolveur =====
 * Source unique du pitch affiché sur #/roadmap, destiné à l'équipe XRPL (jury
 * Make Waves). Les chiffres sont vérifiables dans le code ou dans docs/
 * (PAPER-WALLET-MAINNET.md, SPEC.md) ; aucun chiffre de traction
 * (règle growth/context/05-facts.md). Voix : pas de « sans risque », pas de
 * promesse de gain, tutoiement en FR (docs/BRAND.md § Voice).
 */
import type { Locale } from "../../i18n/locale";
import type { Localized } from "../learn/types";
import type {
  Cta,
  Fact,
  FundingStep,
  Phase,
  Point,
  Primitive,
  RawCta,
  RawFact,
  RawFundingStep,
  RawPhase,
  RawPoint,
  RawPrimitive,
  RawRoadmapContent,
  RawStage,
  RoadmapContent,
  Stage,
} from "./types";

/** Raccourci d'écriture : une chaîne bilingue. */
function L(en: string, fr: string): Localized {
  return { en, fr };
}

/** Total de `pnpm test` — chiffre vérifiable, à remettre à jour avec la suite.
 * Il se compte lui-même : ajouter un test qui le garde le ferait bouger. */
export const TEST_COUNT = 1213;

export const ROADMAP_CONTENT: RawRoadmapContent = {
  hero: {
    eyebrow: L("For the XRPL team · Make Waves 2026", "Pour l'équipe XRPL · Make Waves 2026"),
    titleA: L("The XRP Ledger has the exchange.", "Le XRP Ledger a la place de marché."),
    titleB: L("Tide brings the traders.", "Tide amène les traders."),
    lead: L(
      "Tide is the merit-based on-ramp to trading on XRPL. People learn with virtual money on markets no simulator offers, prove themselves in leagues and cash-prize competitions, earn the right to trade real capital, and trade on the native DEX. Every learner becomes a funded XRPL account. Every track record lives on the ledger. The DEX comes at the end.",
      "Tide est la porte d'entrée au mérite vers le trading sur XRPL. On y apprend avec de l'argent fictif sur des marchés qu'aucun simulateur ne propose, on se prouve en ligues et en compétitions à cash prize, on gagne le droit de trader du capital réel, et on trade sur le DEX natif. Chaque apprenant devient un compte XRPL financé. Chaque historique vit sur le registre. Le DEX arrive au bout.",
    ),
    seoDescription: L(
      "Tide is the merit-based on-ramp to trading on XRPL: learn with virtual money, prove it in competitions, earn real capital, trade on the native DEX.",
      "Tide est la porte d'entrée au mérite du trading sur XRPL : apprends en argent fictif, prouve-le en compétition, gagne du capital réel, trade sur le DEX natif.",
    ),
  },

  thesis: {
    label: L("The thesis", "La thèse"),
    title: L("Why this is the project XRPL needs.", "Pourquoi c'est le projet dont XRPL a besoin."),
    lead: L(
      "XRPL has the infrastructure of an exchange and none of its crowd. Tide is the machine that makes the crowd.",
      "XRPL a l'infrastructure d'une place de marché et aucune de sa foule. Tide est la machine qui fabrique la foule.",
    ),
    points: [
      {
        title: L("The ledger has liquidity, not traders", "Le registre a de la liquidité, pas de traders"),
        body: L(
          "A native order book, an AMM, RLUSD, settlement in seconds. And the retail trading crowd is on Binance and Hyperliquid. No project brings people to the DEX. Tide's entire product is that pipeline.",
          "Un carnet d'ordres natif, un AMM, RLUSD, un règlement en quelques secondes. Et la foule des traders particuliers est sur Binance et Hyperliquid. Aucun projet n'amène des gens au DEX. Tout le produit Tide, c'est ce pipeline.",
        ),
      },
      {
        title: L("Every other simulator stops at the simulation", "Tous les autres simulateurs s'arrêtent à la simulation"),
        body: L(
          "TradingView, Investopedia and exchange testnets end when the game ends. Tide's simulation ends on a funded XRPL account, a track record on the ledger, and real capital to trade. The score has consequences.",
          "TradingView, Investopedia et les testnets d'exchanges s'arrêtent quand le jeu s'arrête. La simulation Tide débouche sur un compte XRPL financé, un historique sur le registre, et du capital réel à trader. Le score a des conséquences.",
        ),
      },
      {
        title: L("You paper trade what no simulator offers", "On y trade en paper ce qu'aucun simulateur ne propose"),
        body: L(
          "Crypto spot on the top 250 markets, perpetuals with leverage, and prediction markets on real events, side by side in one terminal. Beginners learn the instruments that define today's trading, not a stock game from the nineties. Tokenised stocks join as they land on XRPL.",
          "Le spot crypto sur les 250 premiers marchés, les perpétuels à levier, et les marchés prédictifs sur de vrais événements, côte à côte dans un seul terminal. Les débutants apprennent les instruments qui définissent le trading d'aujourd'hui, pas un jeu boursier des années 90. Les actions tokenisées suivront à mesure qu'elles arrivent sur XRPL.",
        ),
      },
      {
        title: L("The stack is already a funded-trader engine", "La stack est déjà un moteur de traders financés"),
        body: L(
          "Server-enforced risk rules (max capital, max daily loss, max trades, max leverage, kill switch), custodial accounts encrypted server-side, a Live execution planner on the native DEX, an on-chain reputation. Assembled, they are the path from a first lesson to real capital on XRPL.",
          "Des règles de risque appliquées côté serveur (capital max, perte max par jour, trades max, levier max, kill switch), des comptes custodiaux chiffrés côté serveur, un planificateur d'exécution Live sur le DEX natif, une réputation on-chain. Assemblés, c'est le chemin d'une première leçon jusqu'à du capital réel sur XRPL.",
        ),
      },
      {
        title: L("Humans and AI agents on the same rails", "Humains et agents IA sur les mêmes rails"),
        body: L(
          "Tide is MCP-native: an agent from Claude Desktop or Cursor trades through the same 20 tools a human uses, under a signed mandate. The first venue on XRPL where people and bots compete on one leaderboard.",
          "Tide est natif MCP : un agent depuis Claude Desktop ou Cursor trade via les mêmes 20 outils qu'un humain, sous un mandat signé. Le premier lieu sur XRPL où des gens et des bots concourent sur un seul classement.",
        ),
      },
    ],
  },

  stages: {
    label: L("Live today", "En ligne aujourd'hui"),
    title: L("Learn. Prove. Trade.", "Apprends. Prouve. Trade."),
    lead: L(
      "Three stages, one product, all in production at tidetrade.xyz.",
      "Trois étapes, un produit, le tout en production sur tidetrade.xyz.",
    ),
    items: [
      {
        id: "learn",
        index: "01",
        label: L("Learn", "Apprendre"),
        title: L("Tide School and the guided sandbox", "Tide School et le bac à sable guidé"),
        body: L(
          "Sixteen bilingual lessons across four tracks, from what a market order is to how leverage liquidates you. A nineteen-step interactive tutorial on live prices where you place a first spot order, open a 10x perp and watch it get liquidated, then size a position at 1% risk. No account needed, and by construction it cannot write to the server.",
          "Seize leçons bilingues sur quatre pistes, de « c'est quoi un ordre au marché » à « comment le levier te liquide ». Un tutoriel interactif de dix-neuf étapes sur prix réels où tu passes un premier ordre spot, ouvres un perp 10x et le regardes se faire liquider, puis dimensionnes une position à 1 % de risque. Sans compte, et par construction il ne peut rien écrire côté serveur.",
        ),
        facts: [
          { k: L("Lessons", "Leçons"), v: L("16", "16") },
          { k: L("Tracks", "Pistes"), v: L("4", "4") },
          { k: L("Tutorial steps", "Étapes du tuto"), v: L("19", "19") },
          { k: L("Languages", "Langues"), v: L("EN / FR", "FR / EN") },
        ],
        cta: { label: L("Open Tide School", "Ouvrir Tide School"), path: "/learn" },
      },
      {
        id: "prove",
        index: "02",
        label: L("Prove", "Prouver"),
        title: L("Paper trading, cash-prize competitions, on-chain proof", "Paper trading, compétitions à cash prize, preuve on-chain"),
        body: L(
          "$10,000 of virtual capital on real prices. Crypto spot on the top 250 markets, perpetuals up to 100x with isolated margin, prediction markets on real events. Market and limit orders, take-profit and stop-loss, maker and taker fees, real order books from XRPL, Binance and Hyperliquid. A leaderboard where humans and AI agents rank on the same numbers. The first competition with a cash prize in XRP is open now. Milestones become badges, claimable as soulbound NFTs on XRPL.",
          "10 000 $ de capital fictif sur des prix réels. Spot crypto sur les 250 premiers marchés, perpétuels jusqu'à 100x en marge isolée, marchés prédictifs sur de vrais événements. Ordres au marché et limite, take-profit et stop-loss, frais maker et taker, vrais carnets d'ordres XRPL, Binance et Hyperliquid. Un classement où humains et agents IA sont notés sur les mêmes chiffres. La première compétition à cash prize en XRP est ouverte. Les jalons deviennent des badges, réclamables en NFT soulbound sur XRPL.",
        ),
        facts: [
          { k: L("Starting capital", "Capital de départ"), v: L("$10,000", "10 000 $") },
          { k: L("Markets", "Marchés"), v: L("Spot · Perps · Prediction", "Spot · Perps · Prédictifs") },
          { k: L("Max leverage (simulated)", "Levier max (simulé)"), v: L("100x", "100x") },
          { k: L("Cash-prize competition", "Compétition à cash prize"), v: L("Open now", "Ouverte") },
        ],
        cta: { label: L("See the competition", "Voir la compétition"), path: "/competitions" },
      },
      {
        id: "trade",
        index: "03",
        label: L("Trade", "Trader"),
        title: L("Real spot on the native XRPL DEX", "Du vrai spot sur le DEX natif XRPL"),
        body: L(
          "Same terminal, one toggle. Live mode signs a real OfferCreate on the XRP Ledger through Xaman or GemWallet, non-custodial, XRP against RLUSD, with best execution across the order book and the AMM and a slippage bound computed server-side. Every transaction carries Tide's SourceTag, and Tide takes no fee on swaps. Competition winnings land in the XRPL account Tide created for the player: the first real XRP a beginner trades is earned, not bought.",
          "Le même terminal, un seul interrupteur. Le mode Live signe un vrai OfferCreate sur le XRP Ledger via Xaman ou GemWallet, non-custodial, XRP contre RLUSD, avec la meilleure exécution entre carnet et AMM et une borne de slippage calculée côté serveur. Chaque transaction porte le SourceTag de Tide, et Tide ne prend aucun frais sur les swaps. Les gains de compétition arrivent dans le compte XRPL que Tide a créé pour le joueur : le premier vrai XRP qu'un débutant trade, il l'a gagné, pas acheté.",
        ),
        facts: [
          { k: L("Quote", "Contrepartie"), v: L("RLUSD", "RLUSD") },
          { k: L("Wallets", "Wallets"), v: L("Xaman · GemWallet", "Xaman · GemWallet") },
          { k: L("Swap fee", "Frais de swap"), v: L("0", "0") },
          { k: L("Settlement", "Règlement"), v: L("3 to 5 s", "3 à 5 s") },
        ],
        cta: { label: L("Open the terminal", "Ouvrir le terminal"), path: "/dashboard" },
      },
    ],
  },

  roadmap: {
    label: L("Roadmap", "Feuille de route"),
    title: L("From a first lesson to real capital on XRPL.", "D'une première leçon à du capital réel sur XRPL."),
    lead: L(
      "Dated, and in the order it ships. Education first, competitions now, funded traders next, the DEX at the end.",
      "Datée, et dans l'ordre de livraison. L'éducation d'abord, les compétitions maintenant, les traders financés ensuite, le DEX au bout.",
    ),
    phases: [
      {
        status: "now",
        label: L("Live now", "En ligne"),
        when: L("September 2026", "Septembre 2026"),
        title: L("The foundation is in production", "La fondation est en production"),
        lead: L(
          "Everything on this page above the roadmap is live.",
          "Tout ce qui précède la feuille de route sur cette page est en ligne.",
        ),
        items: [
          {
            title: L("Funded onboarding", "Onboarding financé"),
            body: L(
              "Tide creates and funds the learner's first XRPL account. No exchange, no KYC, no purchase.",
              "Tide crée et finance le premier compte XRPL de l'apprenant. Pas d'exchange, pas de KYC, pas d'achat.",
            ),
          },
          {
            title: L("First cash-prize competition", "Première compétition à cash prize"),
            body: L(
              "Open now: paper trading on live prices, prize paid in XRP on the ledger, to an account the winner did not have to open.",
              "Ouverte : paper trading sur prix réels, prix payé en XRP sur le registre, vers un compte que le gagnant n'a pas eu à ouvrir.",
            ),
          },
          {
            title: L("Live spot on the native DEX", "Spot Live sur le DEX natif"),
            body: L(
              "XRP/RLUSD through Xaman or GemWallet, best execution across book and AMM, every transaction tagged.",
              "XRP/RLUSD via Xaman ou GemWallet, meilleure exécution entre carnet et AMM, chaque transaction taguée.",
            ),
          },
          {
            title: L("AI agents under mandate", "Agents IA sous mandat"),
            body: L(
              "20 MCP tools, server-enforced limits, kill switch. Humans and agents on one leaderboard.",
              "20 outils MCP, limites appliquées côté serveur, kill switch. Humains et agents sur un seul classement.",
            ),
          },
        ],
      },
      {
        status: "next",
        label: L("Next", "Ensuite"),
        when: L("Q4 2026", "T4 2026"),
        title: L("Education at scale, competition as a habit", "L'éducation à l'échelle, la compétition comme habitude"),
        lead: L(
          "The school becomes a programme and the leaderboard becomes a weekly rhythm.",
          "L'école devient un programme et le classement devient un rythme hebdomadaire.",
        ),
        items: [
          {
            title: L("Video lessons, online workshops, webinars", "Leçons vidéo, workshops en ligne, webinaires"),
            body: L(
              "The sixteen written lessons become a full programme: recorded lessons, live online workshops, and webinars with guests from the XRPL ecosystem.",
              "Les seize leçons écrites deviennent un programme complet : leçons enregistrées, workshops en ligne en direct, et webinaires avec des invités de l'écosystème XRPL.",
            ),
          },
          {
            title: L("The AI coach", "Le coach IA"),
            body: L(
              "After every trade, a review: what happened and why. Every week, a report on position sizing, plan discipline and bias. Static lessons become personal feedback, built on the agent stack that already exists.",
              "Après chaque trade, une relecture : ce qui s'est passé et pourquoi. Chaque semaine, un rapport sur la taille des positions, la discipline du plan et les biais. Les leçons statiques deviennent un feedback personnel, bâti sur la stack agent qui existe déjà.",
            ),
          },
          {
            title: L("Weekly leagues", "Ligues hebdomadaires"),
            body: L(
              "Groups of thirty, promotion and relegation every week, streaks, shareable result cards. Competition stops being an event and becomes a routine.",
              "Des groupes de trente, promotion et relégation chaque semaine, des streaks, des cartes de résultat partageables. La compétition cesse d'être un événement et devient une routine.",
            ),
          },
          {
            title: L("Tide for classrooms", "Tide pour les classes"),
            body: L(
              "A teacher opens a class, every student gets a funded XRPL account, classes compete. The channel universities have used for simulators for fifteen years, now producing XRPL accounts.",
              "Un prof ouvre une classe, chaque étudiant reçoit un compte XRPL financé, les classes s'affrontent. Le canal que les universités utilisent pour les simulateurs depuis quinze ans, qui produit désormais des comptes XRPL.",
            ),
          },
          {
            title: L("Competitions created by others", "Des compétitions créées par d'autres"),
            body: L(
              "An educator, an XRPL project or a community launches its own tournament, funds the prize pool on the multisig account, brings its audience. Tide becomes the platform; the ecosystem brings the players.",
              "Un éducateur, un projet XRPL ou une communauté lance son propre tournoi, finance la cagnotte sur le compte multisig, amène son audience. Tide devient la plateforme ; l'écosystème amène les joueurs.",
            ),
          },
        ],
      },
      {
        status: "then",
        label: L("Then", "Puis"),
        when: L("H1 2027", "S1 2027"),
        title: L("Funded traders", "Des traders financés"),
        lead: L(
          "The simulation earns something real.",
          "La simulation rapporte quelque chose de réel.",
        ),
        items: [
          {
            title: L("The evaluation", "L'évaluation"),
            body: L(
              "Pass a paper evaluation on Tide with the risk rules the platform already enforces on agents: max capital, max daily loss, max trades, max leverage.",
              "Réussir une évaluation en paper sur Tide avec les règles de risque que la plateforme applique déjà aux agents : capital max, perte max par jour, trades max, levier max.",
            ),
          },
          {
            title: L("Real capital on XRPL", "Du capital réel sur XRPL"),
            body: L(
              "Trade a funded account on the native DEX under the same server-enforced guards, and share the results with Tide. The first XRP a beginner trades is capital they earned the right to.",
              "Trader un compte financé sur le DEX natif sous les mêmes garde-fous côté serveur, et partager les résultats avec Tide. Le premier XRP qu'un débutant trade est un capital dont il a gagné le droit.",
            ),
          },
          {
            title: L("A reputation any XRPL app can read", "Une réputation lisible par toute app XRPL"),
            body: L(
              "The track record NFTs become an open credential: rank, weeks active, competitions won, verifiable by any application on the ledger.",
              "Les NFT d'historique deviennent un credential ouvert : rang, semaines actives, compétitions gagnées, vérifiable par n'importe quelle application sur le registre.",
            ),
          },
        ],
      },
      {
        status: "later",
        label: L("Later", "Plus tard"),
        when: L("2027", "2027"),
        title: L("Cross-market, for real", "Multi-marchés, pour de vrai"),
        lead: L(
          "As Ripple tokenises real-world assets on XRPL, Tide is the retail venue that already trained the traders.",
          "À mesure que Ripple tokenise des actifs réels sur XRPL, Tide est la place de marché retail qui a déjà formé les traders.",
        ),
        items: [
          {
            title: L("Tokenised stocks and indices on XRPL", "Actions et indices tokenisés sur XRPL"),
            body: L(
              "Paper first, on the same terminal, then live as the assets land on the ledger.",
              "En paper d'abord, sur le même terminal, puis en live à mesure que les actifs arrivent sur le registre.",
            ),
          },
          {
            title: L("The Tide DEX", "Le DEX Tide"),
            body: L(
              "Detailed below. The perpetuals engine that runs in paper today becomes a real venue.",
              "Détaillé ci-dessous. Le moteur de perpétuels qui tourne en paper aujourd'hui devient une vraie place de marché.",
            ),
          },
        ],
      },
    ],
  },

  dex: {
    label: L("The DEX", "Le DEX"),
    badge: L("Not available yet · coming next", "Pas encore disponible · arrive ensuite"),
    title: L("TideTrade, the future Hyperliquid, on XRPL.", "TideTrade, le futur Hyperliquid, sur XRPL."),
    lead: L(
      "Hyperliquid proved that a venue is not a matching engine, it is a crowd of traders who trust it. Tide builds the crowd first, and the venue ships in two steps that do not wait for anyone else's roadmap.",
      "Hyperliquid a prouvé qu'une place de marché n'est pas un moteur d'appariement, c'est une foule de traders qui lui fait confiance. Tide construit d'abord la foule, et la place de marché arrive en deux temps qui n'attendent la feuille de route de personne.",
    ),
    steps: [
      {
        title: L("v0 · Off-chain matching, on-chain money", "v0 · Appariement off-chain, argent on-chain"),
        body: L(
          "The perpetuals engine that already runs in paper (positions, isolated margin, liquidation, maker and taker fees) goes live. Margin and settlement in RLUSD on the ledger, through a multisig clearing account, every settlement a tagged Payment.",
          "Le moteur de perpétuels qui tourne déjà en paper (positions, marge isolée, liquidation, frais maker et taker) passe en réel. Marge et règlement en RLUSD sur le registre, via un compte de clearing multisig, chaque règlement étant un Payment tagué.",
        ),
      },
      {
        title: L("v1 · Matching on the ledger", "v1 · L'appariement sur le registre"),
        body: L(
          "When XRPL's native programmability ships, matching moves on-chain. The trader base, the track records and the liquidity are already there.",
          "Quand la programmabilité native de XRPL sera là, l'appariement passe on-chain. La base de traders, les historiques et la liquidité sont déjà là.",
        ),
      },
      {
        title: L("Why it holds together", "Pourquoi ça tient"),
        body: L(
          "Tide takes no fee on spot. The venue is where the business lives: a school that produces traders, leagues that keep them, a DEX that receives them.",
          "Tide ne prend aucun frais sur le spot. Le business vit dans la place de marché : une école qui produit des traders, des ligues qui les gardent, un DEX qui les reçoit.",
        ),
      },
    ],
  },

  tech: {
    label: L("For XRPL engineers", "Pour les ingénieurs XRPL"),
    title: L("Under the hood", "Sous le capot"),
    lead: L(
      "Everything Tide does on-chain uses primitives that have been live on mainnet for years. No smart contract, no bridge, no oracle. This section is for the people who will read our transactions.",
      "Tout ce que Tide fait on-chain repose sur des primitives en production sur le mainnet depuis des années. Aucun smart contract, aucun bridge, aucun oracle. Cette section est pour ceux qui liront nos transactions.",
    ),
    fundingTitle: L("Funded onboarding, transaction by transaction", "L'onboarding financé, transaction par transaction"),
    fundingLead: L(
      "Why Tide funds the first account: the product is educational, the ledger makes it affordable (an account exists at 1 XRP of reserve, a transaction costs a fraction of a cent), and the account is the first line of the learner's on-chain track record. Cost to Tide: 2.22 XRP per learner, nearly all of which ends in the account they keep.",
      "Pourquoi Tide finance le premier compte : le produit est pédagogique, le registre le rend abordable (un compte existe à 1 XRP de réserve, une transaction coûte une fraction de centime), et le compte est la première ligne de l'historique on-chain de l'apprenant. Coût pour Tide : 2,22 XRP par apprenant, dont la quasi-totalité finit dans le compte qu'il garde.",
    ),
    funding: [
      {
        title: L("The starter account", "Le compte de départ"),
        tx: ["Payment · 2.22 XRP"],
        body: L(
          "Tide generates a starter account, encrypts its key with AES-256-GCM (never sent to the browser) and funds it with 2.22 XRP from a dedicated hot wallet: the base reserve plus what the next steps cost. Until it is funded, the backend refuses every Paper order.",
          "Tide génère un compte de départ, chiffre sa clé en AES-256-GCM (jamais envoyée au navigateur) et le finance avec 2,22 XRP depuis un hot wallet dédié : la réserve de base plus ce que coûtent les étapes suivantes. Tant qu'il n'est pas financé, le backend refuse tout ordre Paper.",
        ),
      },
      {
        title: L("The first trade", "Le premier trade"),
        tx: [],
        body: L(
          "The first fill on real prices unlocks the First Trade badge. Nothing is submitted to the ledger at this step.",
          "Le premier fill sur prix réels débloque le badge First Trade. Rien n'est soumis au registre à cette étape.",
        ),
      },
      {
        title: L("The proof", "La preuve"),
        tx: ["Payment · 1.21 XRP", "NFTokenMint", "NFTokenCreateOffer", "NFTokenAcceptOffer"],
        body: L(
          "Tide creates the account the learner keeps, funded by the starter with 1.21 XRP. The Tide issuer mints the First Trade NFT (XLS-20, non-transferable), offers it for 0 XRP, and the account accepts it.",
          "Tide crée le compte que l'apprenant garde, financé par le compte de départ avec 1,21 XRP. L'émetteur Tide mint le NFT First Trade (XLS-20, non transférable), le propose pour 0 XRP, et le compte l'accepte.",
        ),
      },
      {
        title: L("The starter retires", "Le compte de départ se retire"),
        tx: ["AccountDelete · 0.2 XRP"],
        body: L(
          "The starter account is deleted and its remaining balance flows into the kept account. Its encrypted key is wiped; a tombstone (address, status, transaction hashes) stays for audit.",
          "Le compte de départ est supprimé et son solde restant coule dans le compte gardé. Sa clé chiffrée est effacée ; une pierre tombale (adresse, statut, hashes de transaction) reste pour l'audit.",
        ),
      },
      {
        title: L("Existing wallets", "Wallets existants"),
        // Se connecter ne soumet rien : les tx de ce parcours sont celles des
        // étapes ci-dessus, signées par le wallet du user (Xaman, GemWallet).
        tx: [],
        body: L(
          "A user with a wallet connects it instead. Paper trading runs under their own address, the same badges apply, and they sign the NFT acceptance themselves. Tide never holds their keys.",
          "Un utilisateur qui a déjà un wallet le connecte à la place. Le paper trading tourne sous sa propre adresse, les mêmes badges s'appliquent, et il signe lui-même l'acceptation du NFT. Tide ne détient jamais ses clés.",
        ),
      },
    ],
    primitivesTitle: L("XRPL primitives in use", "Primitives XRPL utilisées"),
    primitives: [
      {
        name: "OfferCreate + AMM (XLS-30)",
        role: L(
          "Real spot swaps in Live mode, routed across the order book and the AMM for best execution.",
          "Les vrais swaps spot du mode Live, routés entre carnet d'ordres et AMM pour la meilleure exécution.",
        ),
      },
      {
        name: "Payment + Memos",
        role: L(
          "Funding of starter accounts, tournament tickets, prize payouts. The Memo carries the competition id.",
          "Financement des comptes de départ, tickets de tournoi, paiement des gagnants. Le Memo porte l'identifiant de la compétition.",
        ),
      },
      {
        name: "SourceTag",
        role: L(
          "Every Tide transaction is tagged. It is the hackathon's attribution counter, and our own metrics indexer reads it back.",
          "Chaque transaction Tide est taguée. C'est le compteur d'attribution du hackathon, et notre propre indexeur de métriques le relit.",
        ),
      },
      {
        name: "NFTokenMint / Offer / Accept (XLS-20)",
        role: L(
          "Soulbound badges: First Trade, Weekly Trade Proof. Minted by a dedicated issuer, accepted by the user.",
          "Badges soulbound : First Trade, Weekly Trade Proof. Mintés par un émetteur dédié, acceptés par l'utilisateur.",
        ),
      },
      {
        name: "AccountDelete",
        role: L(
          "Retires starter accounts and moves their balance into the account the learner keeps.",
          "Met à la retraite les comptes de départ et transfère leur solde dans le compte que l'apprenant garde.",
        ),
      },
      {
        name: "SignerListSet",
        role: L(
          "Multisig operator account holding prize pools, paying winners by tagged Payment. The clearing account of the DEX v0 uses the same primitive.",
          "Compte opérateur multisig qui détient les cagnottes et paie les gagnants par Payment tagué. Le compte de clearing du DEX v0 repose sur la même primitive.",
        ),
      },
      {
        name: "RLUSD",
        role: L(
          "The dollar quote of Live mode, and the margin currency of the DEX v0. Verified issuer, mainnet.",
          "La contrepartie dollar du mode Live, et la monnaie de marge du DEX v0. Émetteur vérifié, mainnet.",
        ),
      },
      {
        name: "Xaman · GemWallet",
        role: L(
          "Non-custodial signing for people who already own a wallet. Payloads are plain XRPL transaction templates.",
          "Signature non-custodiale pour ceux qui ont déjà un wallet. Les payloads sont de simples gabarits de transaction XRPL.",
        ),
      },
    ],
    notUsed: L(
      "Deliberately not used: XLS-47 price oracles (nothing on-chain consumes them), the EVM sidechain (its activity would not carry the L1 SourceTag), Batch (disabled on mainnet). Native smart contracts (XLS-100) are the trigger of the DEX v1, not a dependency of anything before it.",
      "Volontairement écartés : les oracles de prix XLS-47 (rien on-chain ne les consomme), la sidechain EVM (son activité ne porterait pas le SourceTag du L1), Batch (désactivé sur le mainnet). Les smart contracts natifs (XLS-100) sont le déclencheur du DEX v1, pas une dépendance de ce qui précède.",
    ),
    stackTitle: L("Stack and security", "Stack et sécurité"),
    stack: [
      {
        title: L("Frontend", "Frontend"),
        body: L(
          "Vue 3, Vite, strict TypeScript. A hash router with no dependency, bilingual messages co-located per component, typed content blocks (no markdown, no v-html). Real charts and order books from Binance, CoinGecko, GeckoTerminal, Gate, Hyperliquid and XRPL book_offers, with silent fallback when a public feed drops.",
          "Vue 3, Vite, TypeScript strict. Un routeur hash sans dépendance, des messages bilingues co-localisés par composant, des blocs de contenu typés (pas de markdown, pas de v-html). Graphiques et carnets réels depuis Binance, CoinGecko, GeckoTerminal, Gate, Hyperliquid et book_offers XRPL, avec repli silencieux quand un flux public tombe.",
        ),
      },
      {
        title: L("Backend", "Backend"),
        body: L(
          "Node, Fastify, SQLite. A pure domain package (@tide/core: paper, positions, competitions, payouts, leaderboard) with no I/O, services on top, HTTP on top of that. Dual-source price feed, CEX and on-chain, with a divergence guard.",
          "Node, Fastify, SQLite. Un paquet de domaine pur (@tide/core : paper, positions, compétitions, paiements, classement) sans I/O, des services par-dessus, du HTTP par-dessus encore. Flux de prix à double source, CEX et on-chain, avec garde de divergence.",
        ),
      },
      {
        title: L("XRPL", "XRPL"),
        body: L(
          "xrpl.js. Transaction builders for OfferCreate, Payment, NFT mint/offer/accept, AccountDelete and SignerListSet, all tagged. AMM spot reader, order book reader, a best-execution planner with a slippage bound, an engine_result classifier, and the SourceTag attribution indexer.",
          "xrpl.js. Des constructeurs de transaction pour OfferCreate, Payment, mint/offre/acceptation NFT, AccountDelete et SignerListSet, tous tagués. Lecteur de spot AMM, lecteur de carnet, planificateur de meilleure exécution avec borne de slippage, classifieur d'engine_result, et l'indexeur d'attribution SourceTag.",
        ),
      },
      {
        title: L("Custody and operations", "Garde et opérations"),
        body: L(
          "Starter keys encrypted with AES-256-GCM under a versioned master key, decrypted in memory only to sign. Whitelisted response schemas, so a seed can never leak into a DTO. Mainnet-only runtime that refuses testnet endpoints. Three separate keys: a hot funder holding only the campaign budget, a dedicated NFT issuer, a cold recovery address. Timing-safe admin token, admin console absent from production builds.",
          "Clés des comptes de départ chiffrées en AES-256-GCM sous une clé maître versionnée, déchiffrées en mémoire seulement pour signer. Schémas de réponse en liste blanche, donc une seed ne peut jamais fuiter dans un DTO. Runtime mainnet uniquement, qui refuse les endpoints testnet. Trois clés séparées : un funder chaud qui ne détient que le budget de campagne, un émetteur NFT dédié, une adresse de récupération froide. Jeton admin à comparaison en temps constant, console admin absente du build de production.",
        ),
      },
      {
        title: L("AI agents", "Agents IA"),
        body: L(
          "@tide/mcp: 20 tools shared by external clients (Claude Desktop, Cursor) and the in-app chat. A mandate sets max capital, daily loss, trades per day, leverage, pairs and expiry. Every limit is enforced server-side before every call. Any Anthropic-compatible endpoint works.",
          "@tide/mcp : 20 outils partagés par les clients externes (Claude Desktop, Cursor) et le chat intégré. Un mandat fixe capital max, perte journalière, trades par jour, levier, paires et expiration. Chaque limite est appliquée côté serveur avant chaque appel. N'importe quel endpoint compatible Anthropic fonctionne.",
        ),
      },
      {
        title: L("Quality", "Qualité"),
        body: L(
          `${TEST_COUNT.toLocaleString("en-US")} tests, type-checking across 8 workspaces, ESLint with no-explicit-any as an error, and no "as any" anywhere in the codebase.`,
          `${TEST_COUNT.toLocaleString("fr-FR")} tests, vérification de types sur 8 workspaces, ESLint avec no-explicit-any en erreur, et aucun « as any » dans tout le code.`,
        ),
      },
    ],
  },

  cta: {
    title: L("Open Tide.", "Ouvre Tide."),
    body: L(
      "Everything above the roadmap is live at tidetrade.xyz. Start with the school, or go straight to the terminal.",
      "Tout ce qui précède la feuille de route est en ligne sur tidetrade.xyz. Commence par l'école, ou va droit au terminal.",
    ),
    primary: { label: L("Open the terminal", "Ouvrir le terminal"), path: "/dashboard" },
    secondary: { label: L("Tide School", "Tide School"), path: "/learn" },
  },
};

/* ---- Résolution mono-langue ---- */

const pick = (s: Localized, l: Locale): string => s[l];
const fact = (f: RawFact, l: Locale): Fact => ({ k: pick(f.k, l), v: pick(f.v, l) });
const cta = (c: RawCta, l: Locale): Cta => ({ label: pick(c.label, l), path: c.path });
const point = (p: RawPoint, l: Locale): Point => ({ title: pick(p.title, l), body: pick(p.body, l) });
const stage = (s: RawStage, l: Locale): Stage => ({
  id: s.id,
  index: s.index,
  label: pick(s.label, l),
  title: pick(s.title, l),
  body: pick(s.body, l),
  facts: s.facts.map((f) => fact(f, l)),
  cta: cta(s.cta, l),
});
const step = (s: RawFundingStep, l: Locale): FundingStep => ({
  title: pick(s.title, l),
  tx: s.tx,
  body: pick(s.body, l),
});
const primitive = (p: RawPrimitive, l: Locale): Primitive => ({ name: p.name, role: pick(p.role, l) });
const phase = (p: RawPhase, l: Locale): Phase => ({
  status: p.status,
  label: pick(p.label, l),
  when: pick(p.when, l),
  title: pick(p.title, l),
  lead: pick(p.lead, l),
  items: p.items.map((i) => point(i, l)),
});

/** Contenu de la page résolu pour une langue. */
export function resolveRoadmap(l: Locale, raw: RawRoadmapContent = ROADMAP_CONTENT): RoadmapContent {
  return {
    hero: {
      eyebrow: pick(raw.hero.eyebrow, l),
      titleA: pick(raw.hero.titleA, l),
      titleB: pick(raw.hero.titleB, l),
      lead: pick(raw.hero.lead, l),
      seoDescription: pick(raw.hero.seoDescription, l),
    },
    thesis: {
      label: pick(raw.thesis.label, l),
      title: pick(raw.thesis.title, l),
      lead: pick(raw.thesis.lead, l),
      points: raw.thesis.points.map((p) => point(p, l)),
    },
    stages: {
      label: pick(raw.stages.label, l),
      title: pick(raw.stages.title, l),
      lead: pick(raw.stages.lead, l),
      items: raw.stages.items.map((s) => stage(s, l)),
    },
    roadmap: {
      label: pick(raw.roadmap.label, l),
      title: pick(raw.roadmap.title, l),
      lead: pick(raw.roadmap.lead, l),
      phases: raw.roadmap.phases.map((p) => phase(p, l)),
    },
    dex: {
      label: pick(raw.dex.label, l),
      badge: pick(raw.dex.badge, l),
      title: pick(raw.dex.title, l),
      lead: pick(raw.dex.lead, l),
      steps: raw.dex.steps.map((p) => point(p, l)),
    },
    tech: {
      label: pick(raw.tech.label, l),
      title: pick(raw.tech.title, l),
      lead: pick(raw.tech.lead, l),
      fundingTitle: pick(raw.tech.fundingTitle, l),
      fundingLead: pick(raw.tech.fundingLead, l),
      funding: raw.tech.funding.map((s) => step(s, l)),
      primitivesTitle: pick(raw.tech.primitivesTitle, l),
      primitives: raw.tech.primitives.map((p) => primitive(p, l)),
      notUsed: pick(raw.tech.notUsed, l),
      stackTitle: pick(raw.tech.stackTitle, l),
      stack: raw.tech.stack.map((p) => point(p, l)),
    },
    cta: {
      title: pick(raw.cta.title, l),
      body: pick(raw.cta.body, l),
      primary: cta(raw.cta.primary, l),
      secondary: cta(raw.cta.secondary, l),
    },
  };
}
