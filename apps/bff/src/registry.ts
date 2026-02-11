import type { AgentId, AgentState, ClientEvent, CreateAgentInput, ServerEvent, UpdateAgentInput } from "@clawverse/protocol";
import { connectRecord, disconnectRecord, sendPrompt } from "./agentRuntime";
import { makeRecord, toStored, toSummary, type AgentRecord, type Broadcast } from "./agentRecord";
import { loadStoredAgents, saveStoredAgents } from "./store";
import { now, toSafeId } from "./utils";

export class AgentRegistry {
  private readonly records = new Map<AgentId, AgentRecord>();

  constructor(private readonly broadcast: Broadcast) {}

  async initialize(): Promise<void> {
    const stored = await loadStoredAgents();
    for (const entry of stored) {
      this.records.set(
        entry.id,
        makeRecord({ id: entry.id, name: entry.name, kind: entry.kind, wsUrl: entry.wsUrl, token: entry.token })
      );
    }
  }

  listSummaries() {
    return Array.from(this.records.values())
      .map((record) => toSummary(record))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getHealth(): { total: number; connected: number } {
    const summaries = this.listSummaries();
    return {
      total: summaries.length,
      connected: summaries.filter((agent) => agent.connection === "connected").length
    };
  }

  async createAgent(input: CreateAgentInput) {
    const id = input.id ?? this.makeUniqueId(input.name);
    if (this.records.has(id)) throw new Error(`Agent id "${id}" already exists.`);
    if (input.kind === "openclaw" && !input.wsUrl) throw new Error("OpenClaw agent requires wsUrl.");

    const record = makeRecord({
      id,
      name: input.name,
      kind: input.kind,
      wsUrl: input.wsUrl ?? null,
      token: input.token ?? null
    });
    this.records.set(id, record);
    await this.persist();
    this.emitCatalog();
    return toSummary(record);
  }

  async updateAgent(id: AgentId, input: UpdateAgentInput) {
    const record = this.mustGet(id);
    const reconnect = record.connection === "connected";
    disconnectRecord(record, this.runtimeHooks());

    if (input.name) record.name = input.name;
    if (input.kind) record.kind = input.kind;
    if (typeof input.wsUrl === "string") record.wsUrl = input.wsUrl;
    if (typeof input.token === "string") record.token = input.token;
    record.lastError = null;
    record.state = "idle";

    await this.persist();
    if (reconnect) connectRecord(record, this.runtimeHooks());
    this.emitCatalog();
    return toSummary(record);
  }

  async removeAgent(id: AgentId): Promise<void> {
    const record = this.mustGet(id);
    disconnectRecord(record, this.runtimeHooks());
    this.records.delete(id);
    await this.persist();
    this.emitCatalog();
  }

  connectAgent(id: AgentId) {
    const record = this.mustGet(id);
    connectRecord(record, this.runtimeHooks());
    return toSummary(record);
  }

  disconnectAgent(id: AgentId) {
    const record = this.mustGet(id);
    disconnectRecord(record, this.runtimeHooks());
    return toSummary(record);
  }

  handleClientEvent(event: ClientEvent): void {
    if (event.type !== "client.chat.send") return;

    const record = this.records.get(event.agentId);
    if (!record) {
      this.broadcast({
        type: "server.error",
        agentId: null,
        code: "AGENT_NOT_FOUND",
        message: `Agent "${event.agentId}" does not exist.`,
        ts: now()
      });
      return;
    }

    try {
      sendPrompt(record, event.text, this.runtimeHooks());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown send error.";
      record.connection = "error";
      record.lastError = message;
      this.broadcast({
        type: "server.error",
        agentId: record.id,
        code: "SEND_FAILED",
        message,
        ts: now()
      });
      this.emitCatalog();
    }
  }

  buildCatalogEvent(): ServerEvent {
    return { type: "server.agent.catalog", agents: this.listSummaries(), ts: now() };
  }

  private runtimeHooks() {
    return {
      broadcast: this.broadcast,
      emitCatalog: () => this.emitCatalog(),
      emitState: (record: AgentRecord, state: AgentState) => this.emitState(record, state)
    };
  }

  private emitState(record: AgentRecord, state: AgentState): void {
    record.state = state;
    this.broadcast({ type: "server.agent.state", agentId: record.id, state, ts: now() });
  }

  private emitCatalog(): void {
    this.broadcast(this.buildCatalogEvent());
  }

  private makeUniqueId(name: string): AgentId {
    const base = toSafeId(name);
    let candidate = base;
    let index = 1;
    while (this.records.has(candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  private mustGet(id: AgentId): AgentRecord {
    const record = this.records.get(id);
    if (!record) throw new Error(`Agent "${id}" does not exist.`);
    return record;
  }

  private async persist(): Promise<void> {
    await saveStoredAgents(Array.from(this.records.values()).map((record) => toStored(record)));
  }
}

