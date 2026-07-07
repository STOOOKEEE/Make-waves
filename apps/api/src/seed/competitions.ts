import type { Competition } from "@tide/core";
import { CompetitionService } from "../services/competition-service";
import type { CompetitionStore } from "../store/competition-store";

/**
 * Compétitions de démonstration. Les `id` sont alignés sur le catalogue de
 * présentation du front (`apps/web/src/data/competitions.ts`) : le front fusionne
 * cet état live (participants, pot, statut) avec son contenu éditorial (nom,
 * visuel, descriptif). Seuls les paramètres économiques vivent ici ; tout le
 * décor reste côté front.
 */
export const SEED_COMPETITIONS: readonly Competition[] = [
  { id: "season-04", buyIn: 100, rakeRatio: 0.1, payoutWeights: [0.5, 0.3, 0.2] },
  { id: "friday-sprint", buyIn: 25, rakeRatio: 0.1, payoutWeights: [0.6, 0.25, 0.15] },
  { id: "whale-league", buyIn: 500, rakeRatio: 0.05, payoutWeights: [0.5, 0.3, 0.2] },
  { id: "defi-only", buyIn: 50, rakeRatio: 0.1, payoutWeights: [0.5, 0.3, 0.2] },
  { id: "season-05", buyIn: 100, rakeRatio: 0.1, payoutWeights: [0.5, 0.3, 0.2] },
  { id: "night-owls", buyIn: 50, rakeRatio: 0.1, payoutWeights: [0.6, 0.4] },
  { id: "solana-summer", buyIn: 100, rakeRatio: 0.1, payoutWeights: [0.5, 0.3, 0.2] },
  { id: "season-03", buyIn: 100, rakeRatio: 0.1, payoutWeights: [0.5, 0.3, 0.2] },
  { id: "flash-crash", buyIn: 25, rakeRatio: 0.1, payoutWeights: [0.6, 0.25, 0.15] },
];

/**
 * Crée les compétitions de démo manquantes. Idempotent : ignore celles déjà
 * présentes (relance au boot sans dupliquer). La création passe par le service
 * pour valider les paramètres économiques.
 */
export function seedCompetitions(store: CompetitionStore): void {
  const service = new CompetitionService(store);
  for (const competition of SEED_COMPETITIONS) {
    if (!store.has(competition.id)) {
      service.create(competition);
    }
  }
}
