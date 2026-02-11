import type { AgentId, AgentState, ServerEvent } from "@clawverse/protocol";
import { makeId, now } from "../utils";
import { asRecord, asText, extractMessageText } from "./protocol";

type Hooks = {
  onState: (state: AgentState) => void;
  onEvent: (event: ServerEvent) => void;
};

type Context = {
  agentId: AgentId;
  runId: string;
  hooks: Hooks;
};

export const handleAgentEvent = (payload: Record<string, unknown>, context: Context): string => {
  const runId = asText(payload.runId) ?? context.runId;
  const stream = asText(payload.stream);
  const data = asRecord(payload.data);
  if (!stream || !data) return runId;

  if (stream === "lifecycle") {
    const phase = asText(data.phase);
    if (phase === "start") context.hooks.onState("running");
    if (phase === "end") context.hooks.onState("idle");
    if (phase === "error") context.hooks.onState("error");
    return runId;
  }

  if (stream !== "assistant") return runId;
  const delta = asText(data.delta);
  if (!delta) return runId;
  context.hooks.onEvent({ type: "server.stream.delta", agentId: context.agentId, runId, delta, ts: now() });
  return runId;
};

export const handleChatEvent = (payload: Record<string, unknown>, context: Context): void => {
  const state = asText(payload.state);
  if (state === "error") {
    context.hooks.onState("error");
    return;
  }
  const message = asRecord(payload.message);
  if (!message) return;

  const role = message.role === "system" ? "system" : message.role === "assistant" ? "assistant" : null;
  if (!role) return;
  const text = extractMessageText(message);
  if (!text) return;

  if (state === "final") {
    context.hooks.onEvent({
      type: "server.chat.message",
      agentId: context.agentId,
      role,
      source: "agent",
      text,
      msgId: makeId("openclaw-msg"),
      ts: now()
    });
    context.hooks.onState("idle");
    return;
  }

  if (state === "delta") context.hooks.onState("running");
};

export const readSessionDefaults = (
  payload: Record<string, unknown> | null,
  currentAgentId: string,
  currentSessionKey: string | null
): { defaultAgentId: string; sessionKey: string | null } => {
  const defaults = asRecord(asRecord(payload?.snapshot)?.sessionDefaults);
  const defaultAgentId = asText(defaults?.defaultAgentId) ?? currentAgentId;
  const sessionKey = asText(defaults?.mainSessionKey) ?? currentSessionKey;
  return { defaultAgentId, sessionKey };
};
