import type { AgentId, AgentState, ServerEvent } from "@clawverse/protocol";
import { makeId, now, splitStream } from "./utils";

type Broadcast = (event: ServerEvent) => void;

const draftReply = (agentId: AgentId, prompt: string): string => {
  if (agentId === "local") {
    return `Local OpenClaw received: "${prompt}". I am simulating analysis, then returning a streamed response for the scene PoC.`;
  }
  return `VPS OpenClaw received: "${prompt}". I am running in mock mode and streaming chunks to validate routing and state transitions.`;
};

export class MockAgent {
  private state: AgentState = "idle";

  constructor(
    private readonly agentId: AgentId,
    private readonly broadcast: Broadcast
  ) {}

  getState(): AgentState {
    return this.state;
  }

  run(prompt: string): void {
    const runId = makeId(`run-${this.agentId}`);
    this.emitState("thinking");

    const chunks = splitStream(draftReply(this.agentId, prompt));
    let delay = 250;
    setTimeout(() => this.emitState("running"), delay);

    for (const chunk of chunks) {
      delay += 120;
      setTimeout(() => {
        this.broadcast({
          type: "server.stream.delta",
          agentId: this.agentId,
          runId,
          delta: chunk,
          ts: now()
        });
      }, delay);
    }

    setTimeout(() => this.emitState("idle"), delay + 180);
  }

  private emitState(next: AgentState): void {
    this.state = next;
    this.broadcast({
      type: "server.agent.state",
      agentId: this.agentId,
      state: next,
      ts: now()
    });
  }
}

