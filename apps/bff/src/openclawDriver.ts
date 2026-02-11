import WebSocket from "ws";
import type { AgentId, AgentState, ServerEvent } from "@clawverse/protocol";
import { makeId, now } from "./utils";
import {
  asRecord,
  asText,
  buildAuthHeaders,
  buildConnectParams,
  buildSocketUrl,
  formatCloseReason,
  getAgentTimeoutSeconds,
  getErrorMessage
} from "./openclaw/protocol";
import { handleAgentEvent, handleChatEvent, readSessionDefaults } from "./openclaw/events";

type DriverHooks = {
  onState: (state: AgentState) => void;
  onEvent: (event: ServerEvent) => void;
  onConnected: () => void;
  onDisconnected: (reason: string | null) => void;
  onConnectionError: (message: string) => void;
};

export class OpenClawDriver {
  private socket: WebSocket | null = null;
  private runId = makeId("openclaw-run");
  private disconnectedByClient = false;
  private connected = false;
  private connectRequestId: string | null = null;
  private defaultAgentId = "main";
  private sessionKey: string | null = null;
  private pendingMethods = new Map<string, string>();

  constructor(
    private readonly agentId: AgentId,
    private readonly wsUrl: string,
    private readonly token: string | null,
    private readonly hooks: DriverHooks
  ) {}

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    this.disconnectedByClient = false;
    this.connected = false;
    this.connectRequestId = null;
    this.pendingMethods.clear();

    const socket = new WebSocket(buildSocketUrl(this.wsUrl, this.token), headersOption(this.token));
    this.socket = socket;
    socket.on("open", () => this.sendConnectRequest());
    socket.on("message", (raw) => this.handleInbound(raw.toString()));
    socket.on("error", (error) => this.hooks.onConnectionError(error.message));
    socket.on("close", (code, reason) => {
      this.connected = false;
      this.pendingMethods.clear();
      this.connectRequestId = null;
      const closeReason = this.disconnectedByClient ? null : formatCloseReason(code, reason.toString("utf8"));
      this.hooks.onDisconnected(closeReason);
      this.hooks.onState("idle");
      this.socket = null;
      this.disconnectedByClient = false;
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.disconnectedByClient = true;
    this.socket.close();
    this.socket = null;
  }

  send(text: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.connected) {
      throw new Error("Agent socket is not connected.");
    }
    const requestId = this.sendRequest("agent", {
      message: text,
      agentId: this.defaultAgentId,
      sessionKey: this.sessionKey ?? undefined,
      idempotencyKey: makeId("openclaw-turn"),
      timeout: getAgentTimeoutSeconds()
    });
    this.pendingMethods.set(requestId, "agent");
    this.hooks.onState("running");
  }

  private sendConnectRequest(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.connectRequestId) return;
    const requestId = this.sendRequest("connect", buildConnectParams(this.token));
    this.connectRequestId = requestId;
    this.pendingMethods.set(requestId, "connect");
  }

  private sendRequest(method: string, params: Record<string, unknown>): string {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) throw new Error("Agent socket is not connected.");
    const requestId = makeId("oc-req");
    this.socket.send(JSON.stringify({ type: "req", id: requestId, method, params }));
    return requestId;
  }

  private handleInbound(rawText: string): void {
    const frame = parseFrame(rawText);
    if (!frame) return;
    if (frame.type === "event") this.handleEventFrame(frame);
    if (frame.type === "res") this.handleResponseFrame(frame);
  }

  private handleEventFrame(frame: Record<string, unknown>): void {
    const eventName = asText(frame.event);
    const payload = asRecord(frame.payload);
    if (!eventName || !payload) return;
    if (eventName === "connect.challenge") return this.sendConnectRequest();
    if (eventName === "agent") {
      this.runId = handleAgentEvent(payload, { agentId: this.agentId, runId: this.runId, hooks: this.hooks });
      return;
    }
    if (eventName === "chat") handleChatEvent(payload, { agentId: this.agentId, runId: this.runId, hooks: this.hooks });
  }

  private handleResponseFrame(frame: Record<string, unknown>): void {
    const id = asText(frame.id);
    const ok = frame.ok === true;
    const payload = asRecord(frame.payload);
    const method = id ? this.pendingMethods.get(id) : undefined;
    if (id) this.pendingMethods.delete(id);

    if (method === "connect") return this.handleConnectResponse(ok, payload, frame);
    if (!ok) return this.emitRequestError(frame);
    if (method === "agent") {
      const runId = asText(payload?.runId);
      if (runId) this.runId = runId;
      if (asText(payload?.status) === "accepted") this.hooks.onState("running");
    }
  }

  private handleConnectResponse(ok: boolean, payload: Record<string, unknown> | null, frame: Record<string, unknown>): void {
    this.connectRequestId = null;
    if (!ok) {
      const message = getErrorMessage(frame) ?? "Gateway connect failed.";
      this.hooks.onConnectionError(message);
      if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.close(1008, message.slice(0, 120));
      return;
    }
    this.connected = true;
    const defaults = readSessionDefaults(payload, this.defaultAgentId, this.sessionKey);
    this.defaultAgentId = defaults.defaultAgentId;
    this.sessionKey = defaults.sessionKey;
    this.hooks.onConnected();
    this.hooks.onState("idle");
  }

  private emitRequestError(frame: Record<string, unknown>): void {
    const message = getErrorMessage(frame) ?? "Gateway request failed.";
    this.hooks.onState("error");
    this.hooks.onEvent({
      type: "server.error",
      agentId: this.agentId,
      code: "OPENCLAW_REQUEST_ERROR",
      message,
      ts: now()
    });
  }

}

const parseFrame = (rawText: string): Record<string, unknown> | null => {
  try {
    return asRecord(JSON.parse(rawText));
  } catch {
    return null;
  }
};

const headersOption = (token: string | null): { headers: Record<string, string> } | undefined => {
  const headers = buildAuthHeaders(token);
  return Object.keys(headers).length > 0 ? { headers } : undefined;
};
