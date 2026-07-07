import type { RawArticle } from "../types";

/* Platform — track record vérifiable, SourceTag, passage au Live. Exactitude :
 * Live = spot XRP/RLUSD non-custodial taggé SourceTag ; attribution on-chain.
 * Même profondeur/format que what-is-trading (gold standard). Ton « tu ». */
export const onChainTrackRecord: RawArticle = {
  slug: "on-chain-track-record",
  category: "platform",
  difficulty: "intermediate",
  minutes: 8,
  popular: false,
  updated: "2026-07-02",
  keywords: [
    "on-chain track record",
    "verifiable trading record",
    "xrpl dex trading",
    "non-custodial wallet",
    "sourcetag attribution",
    "proof of trading performance",
    "paper to live trading",
  ],
  title: {
    en: "Building an on-chain track record",
    fr: "Construire un track record on-chain",
  },
  seoTitle: {
    en: "On-Chain Track Record: Prove Your Trading, Own the Proof",
    fr: "Track record on-chain : prouve ton trading, garde la preuve",
  },
  seoDescription: {
    en: "Build an on-chain track record on Tide: turn Paper results into verifiable XRPL trades, understand SourceTag attribution, and go Live non-custodially.",
    fr: "Construis un track record on-chain sur Tide : transforme tes résultats Paper en trades XRPL vérifiables, comprends l'attribution SourceTag et passe en Live non-custodial.",
  },
  dek: {
    en: "Talk is cheap; proof is on-chain. Turn practice into a verifiable record you own — then trade for real.",
    fr: "Les paroles ne coûtent rien ; la preuve est on-chain. Transforme ton entraînement en un track record vérifiable qui t'appartient — puis trade pour de vrai.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Anyone can claim they're a great trader — a lucky screenshot, a cropped PnL, a story about the one trade that 10x'd. An **on-chain track record** is the opposite of talk: your performance anchored to the XRP Ledger, public and impossible to edit after the fact. This guide shows how Tide turns your practice into that kind of proof, why it matters, and exactly what happens when you cross from Paper into real, verifiable trading.",
        fr: "N'importe qui peut prétendre être un excellent trader — une capture chanceuse, un PnL recadré, l'histoire du trade qui a fait x10. Un **track record on-chain**, c'est l'inverse du blabla : ta performance ancrée au XRP Ledger, publique et impossible à modifier après coup. Ce guide montre comment Tide transforme ton entraînement en cette preuve-là, pourquoi ça compte, et exactement ce qui se passe quand tu passes de Paper au trading réel et vérifiable.",
      },
    },
    {
      type: "h",
      text: { en: "What an on-chain track record actually is", fr: "C'est quoi, un track record on-chain" },
    },
    {
      type: "p",
      text: {
        en: "A track record is simply the history of what you did and how it turned out. Most trading records live in a private database you have to trust — the platform could edit them, lose them, or inflate them. An **on-chain track record** lives on a public ledger instead: once your trade is confirmed on the XRPL, it's timestamped, signed by your own key, and visible to anyone forever. Nobody — not even Tide — can quietly rewrite it.",
        fr: "Un track record, c'est simplement l'historique de ce que tu as fait et de comment ça a tourné. La plupart des historiques de trading vivent dans une base privée que tu dois croire sur parole — la plateforme peut les modifier, les perdre ou les gonfler. Un **track record on-chain** vit sur un registre public : une fois ton trade confirmé sur le XRPL, il est horodaté, signé par ta propre clé, et visible par n'importe qui pour toujours. Personne — pas même Tide — ne peut le réécrire en douce.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Verifiable** — anyone can look up the transaction and check it themselves, no login required.",
          fr: "**Vérifiable** — n'importe qui peut retrouver la transaction et la vérifier lui-même, sans compte.",
        },
        {
          en: "**Tamper-proof** — a confirmed XRPL transaction can't be deleted or back-dated.",
          fr: "**Infalsifiable** — une transaction XRPL confirmée ne peut être ni supprimée ni antidatée.",
        },
        {
          en: "**Portable** — it's tied to your wallet, not to Tide. Your record follows you, not the platform.",
          fr: "**Portable** — il est lié à ton wallet, pas à Tide. Ton historique te suit, toi, pas la plateforme.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "From paper score to on-chain proof", fr: "Du score Paper à la preuve on-chain" },
    },
    {
      type: "p",
      text: {
        en: "Your **Paper** results build your rank and reputation on the leaderboard first. That's where you learn the reflexes with virtual capital and zero risk. When you go **Live**, your trades become real transactions on the XRPL DEX — public, timestamped, and impossible to edit. Your wins stop being a screenshot and become history the whole network can read.",
        fr: "Tes résultats **Paper** construisent d'abord ton rang et ta réputation au classement. C'est là que tu acquiers les réflexes avec un capital virtuel et zéro risque. Quand tu passes en **Live**, tes trades deviennent de vraies transactions sur le DEX XRPL — publiques, horodatées, impossibles à modifier. Tes gains cessent d'être une capture d'écran et deviennent de l'histoire que tout le réseau peut lire.",
      },
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Two modes, one identity", fr: "Deux modes, une identité" },
      text: {
        en: "Paper and Live share the same prices, the same charts and the same leaderboard. Paper is where you prove the edge cheaply; Live is where you notarise it on-chain. You don't restart — you graduate.",
        fr: "Paper et Live partagent les mêmes prix, les mêmes graphiques et le même classement. Paper est là où tu prouves ton edge à moindre coût ; Live est là où tu le notaries on-chain. Tu ne repars pas de zéro — tu montes en grade.",
      },
    },
    {
      type: "h",
      text: { en: "What a SourceTag does", fr: "À quoi sert un SourceTag" },
    },
    {
      type: "p",
      text: {
        en: "Every Live swap Tide helps you sign carries a **SourceTag** — a small numeric identifier stamped onto the transaction. It lets the network attribute the trade to Tide without ever touching custody of your funds: you still sign everything yourself in your own wallet. That tag is how on-chain activity can be counted and verified transparently — the trade proves itself *and* proves it came through Tide, in the same public record.",
        fr: "Chaque swap Live que Tide t'aide à signer porte un **SourceTag** — un petit identifiant numérique apposé sur la transaction. Il permet au réseau d'attribuer le trade à Tide sans jamais toucher à la garde de tes fonds : tu signes tout toi-même dans ton propre wallet. Ce tag, c'est ainsi que l'activité on-chain peut être comptée et vérifiée en toute transparence — le trade se prouve lui-même *et* prouve qu'il est passé par Tide, dans le même registre public.",
      },
    },
    {
      type: "example",
      title: { en: "Anatomy of a tagged Live swap", fr: "Anatomie d'un swap Live taggé" },
      rows: [
        { k: { en: "Type", fr: "Type" }, v: { en: "OfferCreate (spot)", fr: "OfferCreate (spot)" } },
        { k: { en: "Pair", fr: "Paire" }, v: { en: "XRP / RLUSD", fr: "XRP / RLUSD" } },
        { k: { en: "Signed by", fr: "Signé par" }, v: { en: "your wallet key", fr: "ta clé de wallet" } },
        { k: { en: "SourceTag", fr: "SourceTag" }, v: { en: "Tide identifier", fr: "identifiant Tide" } },
        { k: { en: "Recorded on", fr: "Enregistré sur" }, v: { en: "XRPL Mainnet", fr: "XRPL Mainnet" } },
      ],
    },
    {
      type: "h",
      text: { en: "The path from Paper to a verifiable record", fr: "Le chemin de Paper au record vérifiable" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Prove your edge in Paper — climb competitions, build a leaderboard history with virtual capital.",
          fr: "Prouve ton edge en Paper — grimpe les compétitions, bâtis un historique de classement avec un capital virtuel.",
        },
        {
          en: "Connect a non-custodial wallet (Xaman or GemWallet) when you're ready to make it real.",
          fr: "Connecte un wallet non-custodial (Xaman ou GemWallet) quand tu es prêt à rendre ça réel.",
        },
        {
          en: "Go Live: sign a real, tagged spot swap on the XRPL — your first verifiable on-chain trade.",
          fr: "Passe en Live : signe un vrai swap spot taggé sur le XRPL — ton premier trade on-chain vérifiable.",
        },
        {
          en: "Repeat with discipline — each signed swap adds another honest line to a record only the market writes.",
          fr: "Recommence avec discipline — chaque swap signé ajoute une ligne honnête de plus à un historique que seul le marché écrit.",
        },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "Your on-chain record comes from **Live** only, and Live is a real **spot** swap — **XRP against RLUSD**, nothing else. It's non-custodial: Tide never holds or moves your money, it prepares a bounded order (price and slippage limits included) and you sign or reject it in your own wallet. Live is **not** perp and has **no leverage** — that lives in Paper. There is **no fee on swaps**; Tide earns from poker-style tournament rake, not from your trades.",
        fr: "Ton historique on-chain vient uniquement du **Live**, et le Live est un vrai swap **spot** — **XRP contre RLUSD**, rien d'autre. C'est non-custodial : Tide ne détient ni ne déplace jamais ton argent, il prépare un ordre borné (limites de prix et de slippage incluses) et tu le signes ou le refuses dans ton propre wallet. Le Live n'est **pas** du perp et n'a **aucun levier** — ça, c'est dans Paper. Il n'y a **aucune fee sur les swaps** ; Tide se rémunère sur le rake des tournois type poker, pas sur tes trades.",
      },
    },
    {
      type: "h",
      text: { en: "Where Paper stops and the ledger begins", fr: "Où Paper s'arrête et où le registre commence" },
    },
    {
      type: "p",
      text: {
        en: "It's worth being precise about the boundary. In **Paper**, perp with up to 100x leverage, limit orders and TP/SL all exist — but they're a simulation. Leverage is isolated margin, realized PnL is floored at −margin when you close, there's no server-side auto-liquidation, and TP/SL and limit orders are **client-side triggers** (your browser tab has to stay open for them to fire). That's fantastic for training your reflexes. None of it, however, becomes an on-chain record. Only a signed **Live spot swap** touches the XRPL and joins your verifiable history.",
        fr: "Il vaut la peine d'être précis sur la frontière. En **Paper**, le perp jusqu'à 100x de levier, les ordres limit et les TP/SL existent tous — mais c'est une simulation. Le levier est en marge isolée, le PnL réalisé est plafonné à −marge à la fermeture, il n'y a pas de liquidation auto côté serveur, et les TP/SL et ordres limit sont des **déclencheurs côté client** (ton onglet doit rester ouvert pour qu'ils se déclenchent). C'est parfait pour entraîner tes réflexes. Rien de tout ça, en revanche, ne devient un record on-chain. Seul un **swap spot Live** signé touche le XRPL et rejoint ton historique vérifiable.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "You stay in control", fr: "Tu gardes le contrôle" },
      text: {
        en: "Non-custodial means Tide never holds or moves your money. Every Live transaction requires your signature in your own wallet — Tide prepares the bounded order, you approve or reject it. The track record is yours, and so are the keys.",
        fr: "Non-custodial signifie que Tide ne détient ni ne déplace jamais ton argent. Chaque transaction Live exige ta signature dans ton propre wallet — Tide prépare l'ordre borné, tu l'approuves ou le refuses. Le track record est à toi, et les clés aussi.",
      },
    },
    {
      type: "h",
      text: { en: "Why a verifiable record is worth building", fr: "Pourquoi un historique vérifiable vaut la peine" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Credibility** — a public, tamper-proof record beats any screenshot when you want to be taken seriously.",
          fr: "**Crédibilité** — un historique public et infalsifiable bat n'importe quelle capture quand tu veux être pris au sérieux.",
        },
        {
          en: "**Honesty with yourself** — you can't quietly delete the losers, so the numbers stay real and you improve faster.",
          fr: "**Honnêteté avec toi-même** — impossible d'effacer discrètement les trades perdants, donc les chiffres restent vrais et tu progresses plus vite.",
        },
        {
          en: "**Ownership** — tied to your wallet, your record survives any single platform. It's an asset you carry.",
          fr: "**Propriété** — lié à ton wallet, ton historique survit à n'importe quelle plateforme. C'est un actif que tu emportes.",
        },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Earn the right to go Live", fr: "Mérite ton passage en Live" },
      text: {
        en: "Don't rush the ledger. Use Paper to prove — over dozens of trades, not one lucky night — that your expectancy is positive. When your leaderboard history says the edge is real, that's the moment a Live swap is worth signing. On-chain proof is only impressive if what it records is genuinely good.",
        fr: "Ne précipite pas le registre. Sers-toi de Paper pour prouver — sur des dizaines de trades, pas une soirée chanceuse — que ton espérance est positive. Quand ton historique de classement dit que l'edge est réel, c'est le moment où un swap Live vaut la peine d'être signé. La preuve on-chain n'impressionne que si ce qu'elle enregistre est vraiment bon.",
      },
    },
    {
      type: "quote",
      text: {
        en: "In this game, the market keeps the only scoreboard that counts. On-chain, it never lies.",
        fr: "Dans ce jeu, le marché tient le seul tableau des scores qui compte. On-chain, il ne ment jamais.",
      },
    },
  ],
  related: ["how-tide-works", "winning-competitions", "what-is-trading"],
};
