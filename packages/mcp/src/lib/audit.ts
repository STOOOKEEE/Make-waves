import { randomUUID } from "node:crypto";
import type { AgentAction, AgentActionsStore } from "../types";

export interface RecordActionInput {
  readonly agentId: string;
  readonly userId: string;
  readonly toolName: string;
  readonly params: unknown;
  readonly result: unknown;
  readonly error: string | null;
  readonly idempotencyKey: string | null;
}

export async function recordAction(
  store: AgentActionsStore,
  input: RecordActionInput,
): Promise<void> {
  const action: AgentAction = {
    id: randomUUID(),
    agentId: input.agentId,
    userId: input.userId,
    toolName: input.toolName,
    toolParams: JSON.stringify(input.params),
    result:
      input.result !== null && input.result !== undefined
        ? JSON.stringify(input.result)
        : null,
    error: input.error,
    idempotencyKey: input.idempotencyKey,
    executedAt: Date.now(),
  };
  await store.record(action);
}