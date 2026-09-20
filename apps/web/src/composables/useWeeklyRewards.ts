import { ref } from "vue";
import type { WeeklyRewardDto } from "@tide/client";
import { errorMessage } from "./messages";

export interface WeeklyRewardsClient {
  weeklyRewards(userId: string): Promise<WeeklyRewardDto[]>;
  claimWeeklyReward(userId: string, week: string): Promise<WeeklyRewardDto>;
}

/** Récompenses gagnées par semaine active ; le mint ne part qu'après le click Claim. */
export function useWeeklyRewards(client: WeeklyRewardsClient) {
  const rewards = ref<readonly WeeklyRewardDto[]>([]);
  const claiming = ref<string | null>(null);
  const error = ref("");

  async function load(userId: string): Promise<void> {
    if (userId.trim() === "") return;
    try {
      rewards.value = await client.weeklyRewards(userId);
      error.value = "";
    } catch (cause) {
      error.value = errorMessage(cause);
    }
  }

  async function claim(userId: string, week: string): Promise<void> {
    claiming.value = week;
    error.value = "";
    try {
      await client.claimWeeklyReward(userId, week);
      await load(userId);
    } catch (cause) {
      error.value = errorMessage(cause);
    } finally {
      claiming.value = null;
    }
  }

  return { rewards, claiming, error, load, claim };
}
