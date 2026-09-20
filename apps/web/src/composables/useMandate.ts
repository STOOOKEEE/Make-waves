import { ref } from "vue";
import type { MandateDto, TideClient } from "@tide/client";
import { errorMessage } from "./messages";
import { useSession } from "./useSession";

/** Nombre de millisecondes dans une journée (base du calcul de `validUntil`). */
const MS_PER_DAY = 86_400_000;

/** Formulaire de création d'un mandat : bornes de risque + méta-données. */
export interface MandateForm {
  capitalMax: number;
  perteMaxJour: number;
  maxTradesPerDay: number;
  maxLeverage: number;
  pairesAutorisees: string[];
  style: "momentum" | "mean_reversion" | "dca" | "grid" | "mixed" | null;
  validDays: number;
}

/** Signature simulée tant que Xaman n'est pas branché (le backend ne la vérifie
 *  pas). À remplacer par la vraie signature non-custodiale avant le mode Live. */
const SIMULATED_SIGNATURE = "ui-simulated-signature";

/** Logique de création d'un mandat pour un agent : crée le mandat (`pending`)
 *  puis l'active via le callback de signature. La signature Xaman réelle
 *  (non-custodial) n'étant pas branchée, on passe une signature simulée pour
 *  rendre l'agent utilisable en paper/démo — sans mandat actif, le chat et les
 *  outils refusent (garde serveur). */
export function useMandate(client: TideClient) {
  const { userId } = useSession();
  const signing = ref(false);
  const signError = ref<string | null>(null);

  async function create(agentId: string, form: MandateForm): Promise<MandateDto> {
    if (!userId.value) throw new Error("No user session");
    signError.value = null;
    signing.value = true;
    try {
      const pending = await client.createMandate({
        agentId,
        userId: userId.value,
        capitalMax: form.capitalMax,
        perteMaxJour: form.perteMaxJour,
        maxTradesPerDay: form.maxTradesPerDay,
        maxLeverage: form.maxLeverage,
        pairesAutorisees: form.pairesAutorisees,
        style: form.style,
        validUntil: Date.now() + form.validDays * MS_PER_DAY,
      });
      // Active le mandat (signature simulée) → l'agent devient opérationnel.
      return await client.signMandate(pending.id, SIMULATED_SIGNATURE);
    } catch (e) {
      signError.value = errorMessage(e);
      throw e;
    } finally {
      signing.value = false;
    }
  }

  return { create, signing, signError };
}