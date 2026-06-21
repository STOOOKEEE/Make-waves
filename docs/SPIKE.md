# Spike d'attribution mainnet — chemin critique #1

> But : **prouver, AVANT d'écrire l'intégration live, qu'une transaction taggée avec notre `SourceTag` est bien attribuée à Tide** (le compteur de l'orga monte). Si ça ne marche pas, tout le modèle change.

À faire par Armand (toi seul as le wallet mainnet et les clés). Le code qui construit la tx est déjà fait et testé (`@tide/xrpl`).

## Pré-requis

- Un wallet XRPL **mainnet financé** (un peu de XRP pour les frais + le micro-montant).
- L'app **Xaman** (ex-XUMM) pour signer en non-custodial.
- Le `SourceTag` choisi pour Tide, **déclaré à l'orga** (entier uint32 **non nul**).

## Étapes

1. **Réserver / déclarer le `SourceTag`** auprès de l'orga (et confirmer que c'est bien le mode d'attribution — cf. questions ci-dessous).
2. **Construire une tx taggée** (le script imprime le JSON, sans toucher à tes clés) :
   ```bash
   TIDE_ACCOUNT=rTonWallet... \
   TIDE_DESTINATION=rDestination... \
   TIDE_SOURCE_TAG=12345 \
   pnpm --filter @tide/api spike:tx
   ```
   Il sort un `Payment` taggé (inscription/buy-in) **et** un `OfferCreate` taggé (swap, pour la métrique volume).
3. **Signer + soumettre** l'une des deux via Xaman (ou `xrpl.js` avec ta seed **en local**, jamais commitée), en **mainnet**.
4. **Vérifier l'attribution** : sur [xrpscan.com](https://xrpscan.com) la tx doit porter ton `SourceTag` ; et le **compteur de l'orga** doit s'incrémenter (volume et/ou compte actif).

## Critère de succès

✅ Le compteur d'attribution de l'orga monte pour notre `SourceTag` après la tx. → on peut câbler l'intégration live en confiance.
❌ Sinon → demander à l'orga le mécanisme exact d'attribution **avant** d'écrire quoi que ce soit de live.

## Questions à poser à l'orga (cf. SPEC §10)

- [ ] Le `SourceTag` est-il bien **le** moyen d'attribution (ou faut-il enregistrer un wallet/app) ?
- [ ] Définition d'un **« compte actif »** : 1 tx suffit ? une tx sans transfert de valeur compte-t-elle ? comptes distincts ? période ?
- [ ] Le **volume self-généré** (notre bot) compte-t-il ?
- [ ] L'activité **EVM Sidechain** est-elle comptée ? (hypothèse : non)

## Après le spike

Une fois validé, on attaque l'intégration live (à écrire alors, et à tester sur ton mainnet) :
adaptateur xrpl `Client` réel, payloads **Xaman** (clés XUMM dans `.env`, jamais commitées),
indexeur qui lit les tx taggées → alimente `SqliteAttributionStore` (déjà prêt).
