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

/** Logique de création d'un mandat pour un agent. La signature Xaman est
 *  gérée par `useWallet` (non-custodial), ce composable se contente de
 *  créer le mandat en statut `pending` côté backend. */
export function useMandate(client: TideClient) {
  const { userId } = useSession();
  const signing = ref(false);
  const signError = ref<string | null>(null);

  async function create(agentId: string, form: MandateForm): Promise<MandateDto> {
    if (!userId.value) throw new Error("No user session");
    signError.value = null;
    signing.value = true;
    try {
      return await client.createMandate({
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
    } catch (e) {
      signError.value = errorMessage(e);
      throw e;
    } finally {
      signing.value = false;
    }
  }

  return { create, signing, signError };
}