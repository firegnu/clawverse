import type { AgentId, AgentSummary, CreateAgentInput } from "@clawverse/protocol";

const httpBase = import.meta.env.VITE_BFF_HTTP_URL ?? "http://localhost:8787";

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }
  return payload;
};

export const listAgents = async (): Promise<AgentSummary[]> => {
  const response = await fetch(`${httpBase}/api/agents`);
  return parseResponse<AgentSummary[]>(response);
};

export const createAgent = async (input: CreateAgentInput): Promise<AgentSummary> => {
  const response = await fetch(`${httpBase}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse<AgentSummary>(response);
};

export const connectAgent = async (agentId: AgentId): Promise<AgentSummary> => {
  const response = await fetch(`${httpBase}/api/agents/${agentId}/connect`, { method: "POST" });
  return parseResponse<AgentSummary>(response);
};

export const disconnectAgent = async (agentId: AgentId): Promise<AgentSummary> => {
  const response = await fetch(`${httpBase}/api/agents/${agentId}/disconnect`, { method: "POST" });
  return parseResponse<AgentSummary>(response);
};

export const removeAgent = async (agentId: AgentId): Promise<void> => {
  const response = await fetch(`${httpBase}/api/agents/${agentId}`, { method: "DELETE" });
  await parseResponse<{ ok: boolean }>(response);
};

