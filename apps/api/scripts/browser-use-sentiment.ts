/**
 * Démo Browser Use — récupère le sentiment / les news XRP pour nourrir l'agent Tide.
 *
 * Lance un agent navigateur (cloud Browser Use) qui va chercher le contexte marché
 * que les APIs de prix ne donnent pas (annonces, sentiment X, news), et le remonte
 * à l'agent de trading. Un agent qui nourrit un agent.
 *
 * Prérequis : BROWSER_USE_API_KEY=bu_... dans l'environnement
 *   (clé depuis cloud.browser-use.com/settings)
 * Run : pnpm dlx tsx apps/api/scripts/browser-use-sentiment.ts
 */
import { BrowserUseClient } from "browser-use-sdk";

const apiKey = process.env.BROWSER_USE_API_KEY;
if (!apiKey) {
  throw new Error(
    "BROWSER_USE_API_KEY manquant — récupère une clé bu_... sur cloud.browser-use.com/settings",
  );
}

const client = new BrowserUseClient({ apiKey });

async function main() {
  const task = await client.tasks.createTask({
    task:
      "Cherche sur le web et sur X/Twitter le sentiment et les news récentes " +
      "(dernières 24h) sur XRP et le XRP Ledger. Renvoie les 5 éléments les plus " +
      "marquants, chacun avec : source, titre, et un tag bullish / bearish / neutre.",
  });

  console.log("Agent navigateur Browser Use lancé, récupération du contexte marché…");

  const result = await task.complete();

  console.log("\n=== Sentiment XRP récupéré via Browser Use ===\n");
  console.log(result.output);
}

main().catch((err) => {
  console.error("Échec du run Browser Use :", err);
  process.exit(1);
});
