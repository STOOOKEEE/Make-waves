import { buildBuyInPayment, buildLiveOffer } from "@tide/xrpl";

// Construit une transaction XRPL TAGGÉE (SourceTag) prête à être signée via Xaman,
// pour le spike d'attribution mainnet. Ne touche à AUCUNE clé : il imprime juste
// le JSON de la tx. Tu la signes/soumets toi-même (Xaman), puis tu vérifies que
// le compteur d'attribution de l'orga monte. Voir docs/SPIKE.md.
//
// Usage : TIDE_ACCOUNT=r... TIDE_DESTINATION=r... TIDE_SOURCE_TAG=12345 \
//         pnpm --filter @tide/api spike:tx

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    console.error(`Variable d'environnement manquante: ${name}`);
    process.exit(1);
  }
  return value;
}

const account = requireEnv("TIDE_ACCOUNT");
const destination = requireEnv("TIDE_DESTINATION");
const sourceTag = Number(requireEnv("TIDE_SOURCE_TAG"));
const amountDrops = process.env["TIDE_AMOUNT_DROPS"] ?? "1000000"; // 1 XRP par défaut

try {
  const payment = buildBuyInPayment({
    account,
    destination,
    amount: amountDrops,
    sourceTag,
    competitionId: "spike",
  });
  console.log("=== Payment taggé (inscription / buy-in) ===");
  console.log(JSON.stringify(payment, null, 2));

  // Variante OfferCreate (swap) pour tester la métrique de VOLUME : ici on offre
  // des drops XRP contre un montant de token (à adapter à une vraie paire/issuer).
  const offer = buildLiveOffer({
    account,
    gives: amountDrops,
    wants: { currency: "USD", issuer: destination, value: "1" },
    sourceTag,
  });
  console.log("\n=== OfferCreate taggé (swap, pour la métrique volume) ===");
  console.log(JSON.stringify(offer, null, 2));

  console.log(
    "\nÉtapes : signe l'une de ces tx via Xaman, soumets-la en mainnet, puis vérifie\n" +
      "sur xrpscan.com et le compteur de l'orga que la tx est bien attribuée à ton SourceTag.",
  );
} catch (error) {
  console.error(
    "Échec construction tx:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
