import type { AgentConnection, AgentId, AgentKind, AgentState, AgentSummary, ServerEvent } from "@clawverse/protocol";
import { MockAgent } from "./mockAgent";
import { OpenClawDriver } from "./openclawDriver";
import type { StoredAgent } from "./store";

export type Broadcast = (event: ServerEvent) => void;

export type AgentRecord = {
  id: AgentId;
  name: string;
  kind: AgentKind;
  wsUrl: string | null;
  token: string | null;
  connection: AgentConnection;
  state: AgentState;
  lastError: string | null;
  mock: MockAgent | null;
  openclaw: OpenClawDriver | null;
};

export const makeRecord = (input: {
  id: AgentId;
  name: string;
  kind: AgentKind;
  wsUrl: string | null;
  token: string | null;
}): AgentRecord => ({
  ...input,
  connection: "disconnected",
  state: "idle",
  lastError: null,
  mock: null,
  openclaw: null
});

export const toSummary = (record: AgentRecord): AgentSummary => ({
  id: record.id,
  name: record.name,
  kind: record.kind,
  wsUrl: record.wsUrl,
  connection: record.connection,
  state: record.state,
  lastError: record.lastError
});

export const toStored = (record: AgentRecord): StoredAgent => ({
  id: record.id,
  name: record.name,
  kind: record.kind,
  wsUrl: record.wsUrl,
  token: record.token
});

