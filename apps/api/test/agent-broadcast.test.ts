import { describe, it, expect, vi } from "vitest";
import { AgentBroadcaster } from "../src/sse/agent-broadcast";

describe("AgentBroadcaster", () => {
  it("emits events to listeners", () => {
    const bc = new AgentBroadcaster();
    const handler = vi.fn();
    bc.on("event", handler);

    bc.emitEvent({ type: "agent_killed", agentId: "a1" });

    expect(handler).toHaveBeenCalledWith({ type: "agent_killed", agentId: "a1" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("supports multiple listeners", () => {
    const bc = new AgentBroadcaster();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bc.on("event", h1);
    bc.on("event", h2);

    bc.emitEvent({
      type: "agent_action",
      agentId: "a1",
      tool: "place_order",
      result: { ok: true },
    });

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
    expect(h1).toHaveBeenCalledWith({
      type: "agent_action",
      agentId: "a1",
      tool: "place_order",
      result: { ok: true },
    });
  });

  it("off() removes a listener", () => {
    const bc = new AgentBroadcaster();
    const handler = vi.fn();
    bc.on("event", handler);
    bc.off("event", handler);

    bc.emitEvent({ type: "agent_killed", agentId: "a1" });

    expect(handler).not.toHaveBeenCalled();
  });
});