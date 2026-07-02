import type { RawArticle } from "../types";

/* Platform — track record vérifiable, SourceTag, passage au Live. Exactitude :
 * Live = spot XRP non-custodial taggé SourceTag ; attribution on-chain. */
export const onChainTrackRecord: RawArticle = {
  slug: "on-chain-track-record",
  category: "platform",
  difficulty: "intermediate",
  minutes: 6,
  title: {
    en: "Building an on-chain track record",
    fr: "Construire un track record on-chain",
  },
  dek: {
    en: "Talk is cheap; proof is on-chain. Turn practice into a verifiable record you own — then trade for real.",
    fr: "Les paroles ne coûtent rien ; la preuve est on-chain. Transforme ton entraînement en un track record vérifiable qui t'appartient — puis trade pour de vrai.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Anyone can claim they're a great trader. What Tide gives you is a record nobody can fake: your performance, anchored to the XRP Ledger. It's the bridge between learning for fun and trading with conviction.",
        fr: "N'importe qui peut prétendre être un excellent trader. Ce que Tide te donne, c'est un historique infalsifiable : ta performance, ancrée au XRP Ledger. C'est le pont entre apprendre pour le plaisir et trader avec conviction.",
      },
    },
    {
      type: "h",
      text: { en: "From paper score to on-chain proof", fr: "Du score paper à la preuve on-chain" },
    },
    {
      type: "p",
      text: {
        en: "Your Paper results build your rank and reputation on the leaderboard. When you go **Live**, your trades become real transactions on the XRPL DEX — public, timestamped, and impossible to edit after the fact. Your wins are no longer a screenshot; they're history.",
        fr: "Tes résultats Paper construisent ton rang et ta réputation au classement. Quand tu passes en **Live**, tes trades deviennent de vraies transactions sur le DEX XRPL — publiques, horodatées, impossibles à modifier après coup. Tes gains ne sont plus une capture d'écran ; ils sont de l'histoire.",
      },
    },
    {
      type: "h",
      text: { en: "What a SourceTag does", fr: "À quoi sert un SourceTag" },
    },
    {
      type: "p",
      text: {
        en: "Every Live swap Tide helps you sign carries a **SourceTag** — a small identifier stamped onto the transaction. It lets the network attribute the trade to Tide without touching custody of your funds: you still sign everything yourself in your own wallet. That tag is how on-chain activity can be counted and verified transparently.",
        fr: "Chaque swap Live que Tide t'aide à signer porte un **SourceTag** — un petit identifiant apposé sur la transaction. Il permet au réseau d'attribuer le trade à Tide sans jamais toucher à la garde de tes fonds : tu signes tout toi-même dans ton propre wallet. Ce tag, c'est ainsi que l'activité on-chain peut être comptée et vérifiée en toute transparence.",
      },
    },
    {
      type: "steps",
      items: [
        {
          en: "Prove your edge in Paper — climb competitions, build a leaderboard history.",
          fr: "Prouve ton edge en Paper — grimpe les compétitions, bâtis un historique de classement.",
        },
        {
          en: "Connect a non-custodial wallet (Xaman or GemWallet) when you're ready.",
          fr: "Connecte un wallet non-custodial (Xaman ou GemWallet) quand tu es prêt.",
        },
        {
          en: "Go Live: sign a real, tagged spot swap on the XRPL — your first verifiable on-chain trade.",
          fr: "Passe en Live : signe un vrai swap spot taggé sur le XRPL — ton premier trade on-chain vérifiable.",
        },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "You stay in control", fr: "Tu gardes le contrôle" },
      text: {
        en: "Non-custodial means Tide never holds or moves your money. Every Live transaction requires your signature in your own wallet — Tide prepares the bounded order (price and slippage limits included), you approve or reject it. The track record is yours, and so are the keys.",
        fr: "Non-custodial signifie que Tide ne détient ni ne déplace jamais ton argent. Chaque transaction Live exige ta signature dans ton propre wallet — Tide prépare l'ordre borné (limites de prix et de slippage incluses), tu l'approuves ou le refuses. Le track record est à toi, et les clés aussi.",
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
