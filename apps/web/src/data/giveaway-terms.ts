/* ===== Règlement de la tombola AirPods Max =====
 *
 * Texte juridique bilingue, stocké en articles typés. La parité FR/EN est
 * garantie à la compilation par `Localized` : un article ne peut pas exister
 * dans une seule langue, ce qui compte pour un règlement opposable.
 *
 * ⚠️ AVANT PUBLICATION : renseigner `ORGANISER`. Tant que l'entité juridique
 * n'est pas nommée, c'est la personne physique derrière Tide qui est
 * l'organisateur, avec tout ce que ça implique. C'est le point d'exposition
 * principal de l'opération, très loin devant n'importe quelle clause.
 */
import type { Locale } from "../i18n/locale";

/** Chaîne traduite (une entrée par langue supportée). */
export type Localized = Record<Locale, string>;

/**
 * Version du règlement. Toute modification de fond doit l'incrémenter :
 * l'acceptation est enregistrée avec cette valeur, donc une nouvelle version
 * invalide les acceptations précédentes et redemande la case à cocher.
 */
export const TERMS_VERSION = "2026-09-11";

/**
 * Identité de l'organisateur, telle qu'elle apparaît dans le règlement.
 *
 * Aucune mention d'immatriculation ni de siège n'est publiée : tant qu'aucune
 * entité n'est nommée ici, l'organisateur au sens juridique est la personne
 * physique derrière TideTrade.
 */
export const ORGANISER = {
  /** Nom sous lequel l'opération est organisée. */
  name: "TideTrade",
  /** Canal de contact public. */
  contact: "https://x.com/tidetradexyz",
} as const;

/** Délai maximum entre la publication des résultats Make Waves et le tirage. */
export const DRAW_WINDOW_DAYS = 7;

/** Délai laissé au gagnant pour se manifester avant un nouveau tirage. */
export const CLAIM_WINDOW_DAYS = 7;

/** Durée pendant laquelle les entrées restent reportables si la condition échoue. */
export const CARRY_OVER_MONTHS = 12;

export interface TermsArticle {
  /** Ancre stable, utilisée pour les liens profonds et les tests. */
  readonly id: string;
  readonly title: Localized;
  readonly paragraphs: readonly Localized[];
}

export const TERMS: readonly TermsArticle[] = [
  {
    id: "organiser",
    title: { en: "Organiser", fr: "Organisateur" },
    paragraphs: [
      {
        en: `This promotional operation is organised by ${ORGANISER.name} (the "Organiser"), operator of the tidetrade.xyz website.`,
        fr: `La présente opération promotionnelle est organisée par ${ORGANISER.name} (l'« Organisateur »), éditeur du site tidetrade.xyz.`,
      },
      {
        en: `Any question about the operation is addressed to the Organiser through its public account at ${ORGANISER.contact}.`,
        fr: `Toute question relative à l'opération est adressée à l'Organisateur via son compte public ${ORGANISER.contact}.`,
      },
    ],
  },
  {
    id: "object",
    title: { en: "Purpose of the operation", fr: "Objet de l'opération" },
    paragraphs: [
      {
        en: "The Organiser is holding a free prize draw, with no obligation to purchase, whose prize is one pair of Apple AirPods Max headphones, awarded to a single winner.",
        fr: "L'Organisateur met en place un tirage au sort gratuit, sans obligation d'achat, dont le lot est une paire de casques Apple AirPods Max, attribuée à un gagnant unique.",
      },
      {
        en: "The operation is announced on the Organiser's X account and on the tidetrade.xyz website. These rules are freely accessible on the operation page for its entire duration.",
        fr: "L'opération est annoncée sur le compte X de l'Organisateur et sur le site tidetrade.xyz. Le présent règlement est librement accessible sur la page de l'opération pendant toute sa durée.",
      },
    ],
  },
  {
    id: "condition",
    title: {
      en: "Condition precedent: the Make Waves grand prize",
      fr: "Condition suspensive : le grand prix Make Waves",
    },
    paragraphs: [
      {
        en: "Awarding the prize is subject to a condition precedent, stated on the operation page before any entry: the prize is awarded only if the Tide project wins the grand prize of the Make Waves hackathon organised by XRPL Commons.",
        fr: "L'attribution du lot est soumise à une condition suspensive, énoncée sur la page de l'opération avant toute participation : le lot n'est attribué que si le projet Tide remporte le grand prix du hackathon Make Waves organisé par XRPL Commons.",
      },
      {
        en: "Only the grand prize triggers the award. A category prize, a special mention, a jury award, a placing on the podium or any other distinction that is not the grand prize does not trigger it.",
        fr: "Seul le grand prix déclenche l'attribution. Un prix de catégorie, une mention spéciale, un prix du jury, un classement sur le podium ou toute autre distinction qui ne serait pas le grand prix ne la déclenche pas.",
      },
      {
        en: "The condition is deemed fulfilled or failed by reference to the official results published by XRPL Commons. The Organiser has no influence over those results, does not take part in the jury's deliberation and cannot predict its outcome.",
        fr: "La réalisation ou la défaillance de la condition s'apprécie au regard des résultats officiels publiés par XRPL Commons. L'Organisateur n'a aucune influence sur ces résultats, ne participe pas à la délibération du jury et ne peut en préjuger.",
      },
      {
        en: "If the condition fails, no prize is awarded and no compensation of any kind is due. Article 17 sets out what happens to entries in that case.",
        fr: "En cas de défaillance de la condition, aucun lot n'est attribué et aucune compensation d'aucune sorte n'est due. L'article 17 précise le sort des entrées dans ce cas.",
      },
    ],
  },
  {
    id: "schedule",
    title: { en: "Duration and schedule", fr: "Durée et calendrier" },
    paragraphs: [
      {
        en: "Entries open on the day the operation is published and close on 19 September 2026 at 23:59 UTC. Any entry recorded after that time is void.",
        fr: "Les participations sont ouvertes à compter de la publication de l'opération et closent le 19 septembre 2026 à 23h59 UTC. Toute participation enregistrée après cette heure est nulle.",
      },
      {
        en: `The draw is held within ${DRAW_WINDOW_DAYS} days of the official publication of the Make Waves results, and only if the condition in Article 3 is fulfilled. No date for those results is set by these rules, as the Organiser does not control the schedule.`,
        fr: `Le tirage au sort intervient dans les ${DRAW_WINDOW_DAYS} jours suivant la publication officielle des résultats de Make Waves, et uniquement si la condition de l'article 3 est réalisée. Le présent règlement ne fixe aucune date pour ces résultats, l'Organisateur n'en maîtrisant pas le calendrier.`,
      },
      {
        en: "The clocks displayed on the operation page are indicative. The times recorded by the Organiser's systems prevail.",
        fr: "Les horloges affichées sur la page de l'opération sont indicatives. Les heures enregistrées par les systèmes de l'Organisateur font foi.",
      },
    ],
  },
  {
    id: "eligibility",
    title: { en: "Eligibility", fr: "Conditions d'éligibilité" },
    paragraphs: [
      {
        en: "The operation is open to any natural person aged 18 or over on the closing date, acting in a personal capacity, wherever this type of free prize draw is permitted by the laws applicable to them.",
        fr: "L'opération est ouverte à toute personne physique âgée de 18 ans ou plus à la date de clôture, agissant à titre personnel, partout où ce type de tirage au sort gratuit est autorisé par la loi qui lui est applicable.",
      },
      {
        en: "It is the entrant's responsibility to make sure they may lawfully take part. Entering from a jurisdiction where such an operation is prohibited or subject to a prior authorisation that has not been obtained renders the entry void.",
        fr: "Il appartient au participant de s'assurer qu'il peut légalement prendre part à l'opération. Une participation depuis une juridiction où ce type d'opération est interdit ou soumis à une autorisation préalable non obtenue est nulle.",
      },
      {
        en: "The Organiser may exclude one or more territories at any time if the applicable law, a platform requirement or a shipping constraint makes participation from those territories impossible or unlawful.",
        fr: "L'Organisateur peut à tout moment exclure un ou plusieurs territoires si la loi applicable, une exigence de plateforme ou une contrainte d'expédition rend la participation depuis ces territoires impossible ou illicite.",
      },
    ],
  },
  {
    id: "exclusions",
    title: { en: "Exclusions", fr: "Exclusions" },
    paragraphs: [
      {
        en: "The following may not take part: the members, employees and contractors of the Organiser, the members of the Make Waves jury and the staff of XRPL Commons, and the members of their immediate households.",
        fr: "Ne peuvent pas participer : les membres, salariés et prestataires de l'Organisateur, les membres du jury Make Waves et le personnel de XRPL Commons, ainsi que les membres de leur foyer.",
      },
      {
        en: "Accounts identified by the Organiser as operator accounts, test accounts, load accounts or automated agents are excluded from the draw and hold no entries.",
        fr: "Les comptes identifiés par l'Organisateur comme comptes d'exploitation, comptes de test, comptes de charge ou agents automatisés sont exclus du tirage et ne détiennent aucune entrée.",
      },
    ],
  },
  {
    id: "entry",
    title: { en: "How to enter", fr: "Modalités de participation" },
    paragraphs: [
      {
        en: "Entry is free and involves no purchase, no payment, no subscription and no deposit at any point.",
        fr: "La participation est gratuite et n'implique aucun achat, aucun paiement, aucun abonnement et aucun dépôt à aucun moment.",
      },
      {
        en: "Entering requires connecting an XRP Ledger wallet to tidetrade.xyz and signing the connection request. On Tide, that wallet is the account: there is no registration form, no email address and no password.",
        fr: "Participer suppose de connecter un wallet XRP Ledger à tidetrade.xyz et de signer la demande de connexion. Sur Tide, ce wallet est le compte : il n'existe ni formulaire d'inscription, ni adresse e-mail, ni mot de passe.",
      },
      {
        en: "The XRP Ledger requires every account to hold a base reserve for it to exist on the ledger. That reserve remains the entrant's property at all times, is not a fee, is not collected by the Organiser and is never transferred to it.",
        fr: "Le XRP Ledger impose à tout compte de détenir une réserve de base pour exister sur le registre. Cette réserve demeure à tout moment la propriété du participant, ne constitue pas des frais, n'est pas perçue par l'Organisateur et ne lui est jamais transférée.",
      },
      {
        en: "Accepting these rules, by ticking the box provided for that purpose, is a prerequisite to entering.",
        fr: "L'acceptation du présent règlement, par la case prévue à cet effet, est un préalable à la participation.",
      },
    ],
  },
  {
    id: "entries",
    title: { en: "How entries are counted", fr: "Décompte des entrées" },
    paragraphs: [
      {
        en: "Each entrant holds a number of entries determined by the actions they have completed: one entry for connecting an XRP Ledger wallet, three entries for placing a first paper trade on Tide, and two entries per referred friend who themselves connects a wallet and places a first paper trade.",
        fr: "Chaque participant détient un nombre d'entrées déterminé par les actions qu'il a réalisées : une entrée pour la connexion d'un wallet XRP Ledger, trois entrées pour le premier ordre paper passé sur Tide, et deux entrées par ami parrainé qui connecte lui-même un wallet et passe un premier ordre paper.",
      },
      {
        en: "Paper trading involves virtual capital only. It never involves real money, a deposit or a real market position.",
        fr: "Le paper trading porte exclusivement sur du capital virtuel. Il n'implique jamais d'argent réel, de dépôt ni de position réelle sur un marché.",
      },
      {
        en: "The referral mechanism is announced on the operation page and is opened at a later date. Until it is opened, referral entries are neither counted nor claimable. The other entries are counted from the outset.",
        fr: "Le mécanisme de parrainage est annoncé sur la page de l'opération et ouvert ultérieurement. Tant qu'il n'est pas ouvert, les entrées de parrainage ne sont ni comptabilisées ni réclamables. Les autres entrées sont comptabilisées dès l'origine.",
      },
      {
        en: "The count recorded by the Organiser's systems on the closing date is the only one that is binding. The figure displayed on screen is indicative and each entrant only ever sees their own.",
        fr: "Le décompte enregistré par les systèmes de l'Organisateur à la date de clôture fait seul foi. Le chiffre affiché à l'écran est indicatif et chaque participant ne voit que le sien.",
      },
    ],
  },
  {
    id: "uniqueness",
    title: { en: "One entry set per person", fr: "Unicité de la participation" },
    paragraphs: [
      {
        en: "Each natural person holds one single set of entries, whatever the number of wallets, devices, browsers or X accounts they use.",
        fr: "Chaque personne physique détient un seul jeu d'entrées, quel que soit le nombre de wallets, d'appareils, de navigateurs ou de comptes X qu'elle utilise.",
      },
      {
        en: "Where several wallets appear to belong to the same person, the Organiser keeps a single one, at its choice, and removes the others from the draw.",
        fr: "Lorsque plusieurs wallets apparaissent rattachés à une même personne, l'Organisateur en conserve un seul, de son choix, et retire les autres du tirage.",
      },
    ],
  },
  {
    id: "fraud",
    title: {
      en: "Fraud, multiple accounts and automation",
      fr: "Fraude, comptes multiples et automatisation",
    },
    paragraphs: [
      {
        en: "Any attempt to inflate the number of entries by artificial means, in particular creating multiple accounts or wallets, using scripts or bots, referring fictitious persons, buying entries, or exploiting a technical flaw in the site, results in the exclusion of the entrant and of all their entries.",
        fr: "Toute tentative d'augmenter artificiellement le nombre d'entrées, notamment par la création de comptes ou de wallets multiples, l'usage de scripts ou de robots, le parrainage de personnes fictives, l'achat d'entrées ou l'exploitation d'une faille technique du site, entraîne l'exclusion du participant et de la totalité de ses entrées.",
      },
      {
        en: "Exclusion may be decided at any time, including after the draw. In that case a new draw is held among the remaining valid entries.",
        fr: "L'exclusion peut être prononcée à tout moment, y compris après le tirage. Dans ce cas, un nouveau tirage est effectué parmi les entrées valables restantes.",
      },
      {
        en: "The Organiser reserves the right to seek compensation for the loss caused by fraudulent conduct.",
        fr: "L'Organisateur se réserve le droit de demander réparation du préjudice causé par des agissements frauduleux.",
      },
    ],
  },
  {
    id: "prize",
    title: { en: "The prize", fr: "Description du lot" },
    paragraphs: [
      {
        en: "The prize is one pair of Apple AirPods Max headphones, with an indicative retail value of about 579 euros including tax at the date these rules are published. The colour depends on availability in the winner's country and is not chosen by the winner.",
        fr: "Le lot est une paire de casques Apple AirPods Max, d'une valeur commerciale indicative d'environ 579 euros toutes taxes comprises à la date de publication du présent règlement. Le coloris dépend des disponibilités dans le pays du gagnant et n'est pas au choix de ce dernier.",
      },
      {
        en: "One prize is awarded, for the whole operation, to a single winner.",
        fr: "Un seul lot est attribué, pour l'ensemble de l'opération, à un gagnant unique.",
      },
      {
        en: "The prize is personal and non-transferable. It may not be exchanged for its value in cash, in cryptocurrency or in any other benefit, nor sold, nor assigned by the winner before delivery.",
        fr: "Le lot est personnel et incessible. Il ne peut être échangé contre sa valeur en numéraire, en cryptomonnaie ou contre tout autre avantage, ni vendu, ni cédé par le gagnant avant sa remise.",
      },
      {
        en: "The indicative value is given for information. It does not bind the Organiser and does not entitle anyone to any payment.",
        fr: "La valeur indicative est communiquée à titre d'information. Elle n'engage pas l'Organisateur et n'ouvre droit à aucun versement.",
      },
    ],
  },
  {
    id: "substitution",
    title: { en: "Prize substitution", fr: "Remplacement du lot" },
    paragraphs: [
      {
        en: "If the prize becomes unavailable, in particular because the model is discontinued, because of a supply shortage, a price change, a customs restriction or any cause outside the Organiser's control, the Organiser may replace it with a prize of equal or greater value.",
        fr: "Si le lot devient indisponible, notamment en raison de l'arrêt du modèle, d'une rupture d'approvisionnement, d'une évolution tarifaire, d'une restriction douanière ou de toute cause échappant au contrôle de l'Organisateur, l'Organisateur peut le remplacer par un lot de valeur égale ou supérieure.",
      },
      {
        en: "Substitution gives rise to no compensation and no right of refusal beyond declining the prize.",
        fr: "Le remplacement n'ouvre droit à aucune compensation ni à aucun droit de refus autre que le renoncement au lot.",
      },
    ],
  },
  {
    id: "draw",
    title: { en: "Selecting the winner", fr: "Désignation du gagnant" },
    paragraphs: [
      {
        en: "The winner is drawn at random from all valid entries. Each entry counts as one chance, so an entrant holding four entries has four chances in the same draw.",
        fr: "Le gagnant est désigné par tirage au sort parmi l'ensemble des entrées valables. Chaque entrée compte pour une chance : un participant détenant quatre entrées dispose donc de quatre chances dans le même tirage.",
      },
      {
        en: "The draw is carried out by the Organiser, without a bailiff, as the applicable rules on free promotional prize draws do not require one.",
        fr: "Le tirage est effectué par l'Organisateur, sans huissier, la réglementation applicable aux loteries publicitaires gratuites n'en imposant pas.",
      },
      {
        en: "Before the prize is handed over, the Organiser checks that the drawn winner meets the eligibility conditions and has actually completed the actions on which their entries are based.",
        fr: "Avant remise du lot, l'Organisateur vérifie que le gagnant tiré au sort remplit les conditions d'éligibilité et a effectivement réalisé les actions ouvrant droit à ses entrées.",
      },
    ],
  },
  {
    id: "announcement",
    title: { en: "Announcement and contact", fr: "Annonce et prise de contact" },
    paragraphs: [
      {
        en: "The winner is announced on the Organiser's X account. The Organiser reaches them through the XRP Ledger wallet used to enter, by any means allowing that wallet's holder to be identified.",
        fr: "Le gagnant est annoncé sur le compte X de l'Organisateur. L'Organisateur le contacte par l'intermédiaire du wallet XRP Ledger utilisé pour participer, par tout moyen permettant d'identifier le détenteur de ce wallet.",
      },
      {
        en: "The winner is asked for their X handle so that the Organiser can check that they follow the Organiser's account and have reposted the announcement. Those two conditions are checked on the drawn winner only, and never on other entrants.",
        fr: "Il est demandé au gagnant son pseudonyme X afin que l'Organisateur puisse vérifier qu'il suit le compte de l'Organisateur et qu'il a reposté l'annonce. Ces deux conditions ne sont vérifiées que sur le gagnant tiré au sort, et jamais sur les autres participants.",
      },
      {
        en: "Entering implies no obligation on the winner to publish anything. The winner may ask not to be named publicly.",
        fr: "La participation n'emporte aucune obligation de publication à la charge du gagnant. Celui-ci peut demander à ne pas être nommé publiquement.",
      },
    ],
  },
  {
    id: "claim",
    title: {
      en: "Claim period and redraw",
      fr: "Délai de réclamation et nouveau tirage",
    },
    paragraphs: [
      {
        en: `The winner has ${CLAIM_WINDOW_DAYS} days from the first contact attempt to reply and provide the information needed to deliver the prize, in particular a postal address.`,
        fr: `Le gagnant dispose de ${CLAIM_WINDOW_DAYS} jours à compter de la première tentative de contact pour se manifester et fournir les informations nécessaires à la remise du lot, notamment une adresse postale.`,
      },
      {
        en: `Failing a reply within that period, or if the checks in Article 13 are unsuccessful, the winner is deemed to have waived the prize and a new draw is held under the same conditions, as many times as necessary.`,
        fr: `À défaut de réponse dans ce délai, ou si les vérifications prévues à l'article 13 n'aboutissent pas, le gagnant est réputé renoncer au lot et un nouveau tirage est effectué dans les mêmes conditions, autant de fois que nécessaire.`,
      },
      {
        en: "A prize that has been waived gives rise to no compensation.",
        fr: "Un lot auquel il a été renoncé n'ouvre droit à aucune compensation.",
      },
    ],
  },
  {
    id: "delivery",
    title: {
      en: "Delivery, duties and taxes",
      fr: "Livraison, droits de douane et taxes",
    },
    paragraphs: [
      {
        en: "The Organiser bears the shipping costs of the prize to the address given by the winner.",
        fr: "L'Organisateur prend en charge les frais d'expédition du lot à l'adresse communiquée par le gagnant.",
      },
      {
        en: "Any customs duty, import tax, local levy or declaration required by the winner's country of residence is the winner's responsibility. The Organiser cannot list those obligations for every country and gives no advice on the matter.",
        fr: "Tout droit de douane, taxe à l'importation, prélèvement local ou déclaration exigés par le pays de résidence du gagnant sont à la charge de ce dernier. L'Organisateur ne peut recenser ces obligations pour chaque pays et ne fournit aucun conseil en la matière.",
      },
      {
        en: "Risk passes to the winner on handover to the carrier. In the event of loss or damage in transit, the Organiser undertakes to file the claim with the carrier but cannot guarantee its outcome.",
        fr: "Les risques sont transférés au gagnant à la remise au transporteur. En cas de perte ou d'avarie durant le transport, l'Organisateur s'engage à effectuer la réclamation auprès du transporteur, sans pouvoir en garantir l'issue.",
      },
    ],
  },
  {
    id: "carryover",
    title: {
      en: "Carrying entries over if the condition fails",
      fr: "Report des entrées en cas de défaillance de la condition",
    },
    paragraphs: [
      {
        en: "If the Tide project does not win the Make Waves grand prize, no prize is awarded under this operation.",
        fr: "Si le projet Tide ne remporte pas le grand prix Make Waves, aucun lot n'est attribué au titre de la présente opération.",
      },
      {
        en: `In that case, the entries validly acquired are kept and carried over to the next prize draw held by the Organiser, if one is held within ${CARRY_OVER_MONTHS} months of the publication of the Make Waves results. Beyond that period, the entries lapse.`,
        fr: `Dans ce cas, les entrées valablement acquises sont conservées et reportées sur le prochain tirage au sort organisé par l'Organisateur, s'il en organise un dans les ${CARRY_OVER_MONTHS} mois suivant la publication des résultats de Make Waves. Passé ce délai, les entrées deviennent caduques.`,
      },
      {
        en: "Carrying entries over is not an undertaking to hold a further operation. It gives rise to no right to a prize, to compensation or to any benefit whatsoever.",
        fr: "Le report ne constitue pas un engagement d'organiser une nouvelle opération. Il n'ouvre droit à aucun lot, à aucune indemnité ni à aucun avantage de quelque nature que ce soit.",
      },
      {
        en: "Whatever the outcome, the Tide account created to enter remains available to the entrant, free of charge, with the platform's usual features.",
        fr: "Quelle que soit l'issue, le compte Tide créé pour participer reste acquis au participant, gratuitement, avec les fonctionnalités habituelles de la plateforme.",
      },
    ],
  },
  {
    id: "changes",
    title: {
      en: "Amendment, suspension and cancellation",
      fr: "Modification, suspension et annulation",
    },
    paragraphs: [
      {
        en: "The Organiser may amend, shorten, extend, suspend or cancel the operation where circumstances beyond its reasonable control so require, in particular: proven fraud or a serious attempt at fraud, a technical failure affecting the fairness of the operation, unavailability of the prize, a legal, regulatory or tax change, a decision by a platform or an authority, a claim by a third party, or a force majeure event.",
        fr: "L'Organisateur peut modifier, écourter, prolonger, suspendre ou annuler l'opération lorsque des circonstances échappant à son contrôle raisonnable l'exigent, notamment : une fraude avérée ou une tentative sérieuse de fraude, une défaillance technique affectant la sincérité de l'opération, l'indisponibilité du lot, une évolution légale, réglementaire ou fiscale, une décision d'une plateforme ou d'une autorité, une réclamation d'un tiers, ou un événement de force majeure.",
      },
      {
        en: "Any amendment is published on the operation page and takes effect on publication. Entrants are asked to accept the amended rules again where the amendment affects the conditions of entry or the award of the prize.",
        fr: "Toute modification est publiée sur la page de l'opération et prend effet à compter de sa publication. Les participants sont invités à accepter à nouveau le règlement modifié lorsque la modification affecte les conditions de participation ou l'attribution du lot.",
      },
      {
        en: "Amendment, suspension or cancellation on one of the grounds set out above gives rise to no compensation, without prejudice to the Organiser's liability in the event of fraud or gross negligence on its part.",
        fr: "La modification, la suspension ou l'annulation pour l'un des motifs énoncés ci-dessus n'ouvre droit à aucune indemnité, sans préjudice de la responsabilité de l'Organisateur en cas de dol ou de faute lourde de sa part.",
      },
    ],
  },
  {
    id: "forcemajeure",
    title: { en: "Force majeure", fr: "Force majeure" },
    paragraphs: [
      {
        en: "The Organiser cannot be held liable where an event of force majeure, within the meaning of the applicable law and of settled case law, prevents the operation from running, the draw from being held or the prize from being delivered.",
        fr: "L'Organisateur ne peut être tenu pour responsable lorsqu'un cas de force majeure, au sens de la loi applicable et de la jurisprudence constante, empêche le déroulement de l'opération, la tenue du tirage ou la remise du lot.",
      },
      {
        en: "Where the impediment is temporary, the operation is suspended for its duration and resumes once the impediment ends, where that is still meaningful.",
        fr: "Lorsque l'empêchement est temporaire, l'opération est suspendue pour sa durée et reprend à la cessation de l'empêchement, si cela conserve un sens.",
      },
    ],
  },
  {
    id: "liability",
    title: { en: "Liability", fr: "Responsabilité" },
    paragraphs: [
      {
        en: "The Organiser cannot be held liable for a malfunction of the internet network, of the entrant's equipment, of a wallet application, of the XRP Ledger or of a third-party platform, which would prevent an entry from being taken into account.",
        fr: "L'Organisateur ne peut être tenu pour responsable d'un dysfonctionnement du réseau internet, de l'équipement du participant, d'une application de wallet, du XRP Ledger ou d'une plateforme tierce, qui empêcherait la prise en compte d'une participation.",
      },
      {
        en: "The entrant remains solely responsible for their wallet, its keys and its recovery phrase. The Organiser never asks for them, never holds them and can do nothing about their loss or theft.",
        fr: "Le participant demeure seul responsable de son wallet, de ses clés et de sa phrase de récupération. L'Organisateur ne les demande jamais, ne les détient jamais et ne peut rien en cas de perte ou de vol de celles-ci.",
      },
      {
        en: "Tide is a paper trading platform. Entering the operation is not investment advice, a recommendation or an invitation to invest real money.",
        fr: "Tide est une plateforme de paper trading. La participation à l'opération ne constitue ni un conseil en investissement, ni une recommandation, ni une incitation à engager de l'argent réel.",
      },
      {
        en: "None of the provisions of these rules limits the Organiser's liability in the event of fraud, gross negligence, personal injury, or in any case where the applicable law prohibits such a limitation.",
        fr: "Aucune stipulation du présent règlement ne limite la responsabilité de l'Organisateur en cas de dol, de faute lourde, de dommage corporel, ni dans les cas où la loi applicable interdit une telle limitation.",
      },
    ],
  },
  {
    id: "data",
    title: { en: "Personal data", fr: "Données personnelles" },
    paragraphs: [
      {
        en: "To run the operation, the Organiser processes the Tide account identity, the XRP Ledger address linked to it, the X handle supplied at entry, and the entries linked to that identity. The drawn winner may also be asked for a postal address needed to deliver the prize.",
        fr: "Pour les besoins de l'opération, l'Organisateur traite l'identité du compte Tide, l'adresse XRP Ledger qui lui est reliée, le pseudonyme X fourni lors de la participation et les entrées rattachées à cette identité. Le gagnant tiré au sort peut également être invité à fournir une adresse postale nécessaire à la remise du lot.",
      },
      {
        en: "The legal basis for the processing is performance of these rules, which the entrant accepts before entering. The data is kept for the time needed to run the operation, then for the period required to answer any claim.",
        fr: "La base légale du traitement est l'exécution du présent règlement, que le participant accepte avant de participer. Les données sont conservées le temps nécessaire au déroulement de l'opération, puis pendant la durée utile au traitement d'une éventuelle réclamation.",
      },
      {
        en: "The data is not sold and is not passed on to third parties, other than the carrier for delivering the prize.",
        fr: "Les données ne sont pas vendues et ne sont pas transmises à des tiers, hors le transporteur pour la remise du lot.",
      },
      {
        en: `Entrants may exercise their rights of access, rectification, erasure, restriction and objection by contacting the Organiser at ${ORGANISER.contact}.`,
        fr: `Le participant peut exercer ses droits d'accès, de rectification, d'effacement, de limitation et d'opposition en contactant l'Organisateur à ${ORGANISER.contact}.`,
      },
    ],
  },
  {
    id: "independence",
    title: {
      en: "Independence from third parties",
      fr: "Indépendance vis-à-vis des tiers",
    },
    paragraphs: [
      {
        en: "Apple and AirPods Max are trademarks of Apple Inc. Apple is not a sponsor of this operation, does not administer it and is in no way associated with it.",
        fr: "Apple et AirPods Max sont des marques d'Apple Inc. Apple n'est pas sponsor de cette opération, ne l'administre pas et n'y est associée d'aucune manière.",
      },
      {
        en: "This operation is in no way sponsored, endorsed or administered by, or associated with, X.",
        fr: "Cette opération n'est en aucune façon sponsorisée, soutenue ou administrée par X, ni associée à X.",
      },
      {
        en: "XRPL Commons organises the Make Waves hackathon but does not organise this operation, does not administer it and is in no way associated with it. Referring to the results of that hackathon is a factual condition and implies no partnership.",
        fr: "XRPL Commons organise le hackathon Make Waves mais n'organise pas la présente opération, ne l'administre pas et n'y est associée d'aucune manière. La référence aux résultats de ce hackathon constitue une condition de fait et n'emporte aucun partenariat.",
      },
      {
        en: "The 3D model displayed on the operation page is the work of Empty, published on Sketchfab and used under the Creative Commons Attribution 4.0 licence.",
        fr: "Le modèle 3D affiché sur la page de l'opération est l'oeuvre d'Empty, publiée sur Sketchfab et utilisée sous licence Creative Commons Attribution 4.0.",
      },
    ],
  },
  {
    id: "law",
    title: {
      en: "Governing law and claims",
      fr: "Droit applicable et réclamations",
    },
    paragraphs: [
      {
        en: "These rules are governed by French law, without prejudice to the mandatory protective provisions of the law of the country in which a consumer entrant is habitually resident.",
        fr: "Le présent règlement est soumis au droit français, sans préjudice des dispositions protectrices impératives de la loi du pays de résidence habituelle d'un participant consommateur.",
      },
      {
        en: "Any claim must be sent to the Organiser within thirty days of the end of the operation. The parties undertake to seek an amicable settlement before any legal action.",
        fr: "Toute réclamation doit être adressée à l'Organisateur dans les trente jours suivant la fin de l'opération. Les parties s'engagent à rechercher une solution amiable avant toute action contentieuse.",
      },
      {
        en: "If any provision of these rules is held to be void or unenforceable, the remaining provisions continue to have full effect.",
        fr: "Si une stipulation du présent règlement était déclarée nulle ou non écrite, les autres stipulations conserveraient leur plein effet.",
      },
    ],
  },
  {
    id: "acceptance",
    title: { en: "Acceptance of the rules", fr: "Acceptation du règlement" },
    paragraphs: [
      {
        en: "Ticking the box provided for that purpose amounts to full and unreserved acceptance of these rules, and in particular of the condition precedent set out in Article 3.",
        fr: "Le fait de cocher la case prévue à cet effet vaut acceptation pleine et entière du présent règlement, et en particulier de la condition suspensive énoncée à l'article 3.",
      },
      {
        en: `Acceptance is recorded with the version of the rules in force, referenced ${TERMS_VERSION}. Any new version requires acceptance again.`,
        fr: `L'acceptation est enregistrée avec la version du règlement en vigueur, référencée ${TERMS_VERSION}. Toute nouvelle version appelle une nouvelle acceptation.`,
      },
    ],
  },
];
