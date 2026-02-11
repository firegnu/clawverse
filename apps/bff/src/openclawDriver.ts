import WebSocket from "ws";
import type { AgentId, AgentState, ServerEvent } from "@clawverse/protocol";
import { serverEventSchema } from "@clawverse/protocol";
import { makeId, now } from "./utils";

type DriverHooks = {
  onState: (state: AgentState) => void;
  onEvent: (event: ServerEvent) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onConnectionError: (message: string) => void;
};

const pickState = (raw: Record<string, unknown>): AgentState | null => {
  const values = [raw.state, raw.status, raw.phase, (raw.data as Record<string, unknown> | undefined)?.state];
  for (const value of values) {
    if (value === "idle" || value === "thinking" || value === "running" || value === "error") {
      return value;
    }
  }
  return null;
};

const pickDelta = (raw: Record<string, unknown>): string | null => {
  const candidates = [
    raw.delta,
    raw.chunk,
    raw.textDelta,
    (raw.data as Record<string, unknown> | undefined)?.delta,
    (raw.data as Record<string, unknown> | undefined)?.text
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
};

const pickMessage = (raw: Record<string, unknown>): { role: "assistant" | "system"; text: string } | null => {
  const text = raw.text ?? (raw.data as Record<string, unknown> | undefined)?.text;
  if (typeof text !== "string" || text.length === 0) {
    return null;
  }
  const role = raw.role === "system" ? "system" : "assistant";
  return { role, text };
};

export class OpenClawDriver {
  private socket: WebSocket | null = null;
  private runId = makeId("openclaw-run");

  constructor(
    private readonly agentId: AgentId,
    private readonly wsUrl: string,
    private readonly token: string | null,
    private readonly hooks: DriverHooks
  ) {}

  connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }
    const headers = this.token ? { Authorization: `Bearer ${this.token}` } : undefined;
    const socket = new WebSocket(this.wsUrl, headers ? { headers } : undefined);
    this.socket = socket;

    socket.on("open", () => {
      this.hooks.onConnected();
      this.hooks.onState("idle");
    });
    socket.on("message", (raw) => this.handleInbound(raw.toString()));
    socket.on("error", (error) => this.hooks.onConnectionError(error.message));
    socket.on("close", () => {
      this.hooks.onDisconnected();
      this.hooks.onState("idle");
    });
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }
    this.socket.close();
    this.socket = null;
  }

  send(text: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Agent socket is not connected.");
    }
    this.socket.send(
      JSON.stringify({
        method: "send/agent",
        params: { text }
      })
    );
  }

  private handleInbound(rawText: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return;
    }

    const direct = serverEventSchema.safeParse(parsed);
    if (direct.success) {
      this.hooks.onEvent(direct.data);
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }
    const raw = parsed as Record<string, unknown>;

    const state = pickState(raw);
    if (state) {
      this.hooks.onState(state);
    }

    const delta = pickDelta(raw);
    if (delta) {
      this.hooks.onEvent({
        type: "server.stream.delta",
        agentId: this.agentId,
        runId: this.runId,
        delta,
        ts: now()
      });
    }

    const message = pickMessage(raw);
    if (message) {
      this.hooks.onEvent({
        type: "server.chat.message",
        agentId: this.agentId,
        role: message.role,
        source: "agent",
        text: message.text,
        msgId: makeId("openclaw-msg"),
        ts: now()
      });
    }
  }
}
