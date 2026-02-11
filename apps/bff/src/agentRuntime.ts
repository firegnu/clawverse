import type { AgentRecord, Broadcast } from "./agentRecord";
import { MockAgent } from "./mockAgent";
import { OpenClawDriver } from "./openclawDriver";
import { makeId, now } from "./utils";

type RuntimeHooks = {
  broadcast: Broadcast;
  emitCatalog: () => void;
  emitState: (record: AgentRecord, state: AgentRecord["state"]) => void;
};

export const connectRecord = (record: AgentRecord, hooks: RuntimeHooks): void => {
  if (record.connection === "connected" || record.connection === "connecting") {
    return;
  }
  record.lastError = null;

  if (record.kind === "mock") {
    record.mock = record.mock ?? new MockAgent(record.id, hooks.broadcast);
    record.connection = "connected";
    hooks.emitState(record, "idle");
    hooks.emitCatalog();
    return;
  }

  if (!record.wsUrl) {
    throw new Error(`Agent "${record.id}" is missing wsUrl.`);
  }
  record.connection = "connecting";
  record.openclaw = new OpenClawDriver(record.id, record.wsUrl, record.token, {
    onConnected: () => {
      record.connection = "connected";
      record.lastError = null;
      hooks.emitCatalog();
    },
    onDisconnected: () => {
      record.connection = "disconnected";
      hooks.emitCatalog();
    },
    onState: (state) => hooks.emitState(record, state),
    onEvent: (event) => hooks.broadcast(event),
    onConnectionError: (message) => {
      record.connection = "error";
      record.lastError = message;
      hooks.broadcast({
        type: "server.error",
        agentId: record.id,
        code: "AGENT_CONNECTION_ERROR",
        message,
        ts: now()
      });
      hooks.emitCatalog();
    }
  });
  record.openclaw.connect();
  hooks.emitCatalog();
};

export const disconnectRecord = (record: AgentRecord, hooks: RuntimeHooks): void => {
  if (record.openclaw) {
    record.openclaw.disconnect();
    record.openclaw = null;
  }
  record.connection = "disconnected";
  hooks.emitState(record, "idle");
  hooks.emitCatalog();
};

export const sendPrompt = (record: AgentRecord, text: string, hooks: RuntimeHooks): void => {
  hooks.broadcast({
    type: "server.chat.message",
    agentId: record.id,
    role: "user",
    source: "scene",
    text,
    msgId: makeId("msg"),
    ts: now()
  });

  if (record.connection !== "connected") connectRecord(record, hooks);
  if (record.kind === "mock") {
    record.mock?.run(text);
    return;
  }
  record.openclaw?.send(text);
};

