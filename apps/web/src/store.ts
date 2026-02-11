import { create } from "zustand";
import type { AgentId, AgentState, AgentSummary } from "@clawverse/protocol";

export type ChatMessage = {
  msgId: string;
  role: "user" | "assistant" | "system";
  source: "scene" | "telegram" | "agent";
  text: string;
  ts: number;
};

type ActiveStream = { runId: string; msgId: string } | null;

type StoreState = {
  selectedAgent: AgentId | null;
  connection: "disconnected" | "connected";
  agents: AgentSummary[];
  messages: Record<string, ChatMessage[]>;
  activeStreams: Record<string, ActiveStream>;
  setAgents: (agents: AgentSummary[]) => void;
  setSelectedAgent: (agentId: AgentId) => void;
  setConnection: (status: "disconnected" | "connected") => void;
  setAgentState: (agentId: AgentId, state: AgentState) => void;
  pushMessage: (agentId: AgentId, message: ChatMessage) => void;
  pushSystemError: (text: string, ts: number) => void;
  appendDelta: (agentId: AgentId, runId: string, delta: string, ts: number) => void;
};

const ensureBucket = <T>(record: Record<string, T>, key: string, fallback: T): Record<string, T> =>
  record[key] ? record : { ...record, [key]: fallback };

export const useAppStore = create<StoreState>((set) => ({
  selectedAgent: null,
  connection: "disconnected",
  agents: [],
  messages: {},
  activeStreams: {},
  setAgents: (agents) =>
    set((prev) => {
      const nextMessages = { ...prev.messages };
      const nextStreams = { ...prev.activeStreams };
      for (const agent of agents) {
        if (!nextMessages[agent.id]) nextMessages[agent.id] = [];
        if (!(agent.id in nextStreams)) nextStreams[agent.id] = null;
      }
      const selected = prev.selectedAgent && agents.some((agent) => agent.id === prev.selectedAgent)
        ? prev.selectedAgent
        : agents[0]?.id ?? null;
      return { agents, selectedAgent: selected, messages: nextMessages, activeStreams: nextStreams };
    }),
  setSelectedAgent: (agentId) => set({ selectedAgent: agentId }),
  setConnection: (status) => set({ connection: status }),
  setAgentState: (agentId, state) =>
    set((prev) => ({
      agents: prev.agents.map((agent) => (agent.id === agentId ? { ...agent, state } : agent)),
      activeStreams: state === "idle" ? { ...prev.activeStreams, [agentId]: null } : prev.activeStreams
    })),
  pushMessage: (agentId, message) =>
    set((prev) => ({
      messages: {
        ...ensureBucket(prev.messages, agentId, []),
        [agentId]: [...(prev.messages[agentId] ?? []), message]
      }
    })),
  pushSystemError: (text, ts) =>
    set((prev) => ({
      messages: {
        ...prev.messages,
        ...(prev.selectedAgent
          ? {
              [prev.selectedAgent]: [
                ...(prev.messages[prev.selectedAgent] ?? []),
                { msgId: `err-${prev.selectedAgent}-${ts}`, role: "system", source: "agent", text, ts }
              ]
            }
          : {})
      }
    })),
  appendDelta: (agentId, runId, delta, ts) =>
    set((prev) => {
      const current = prev.activeStreams[agentId];
      const msgId = current && current.runId === runId ? current.msgId : `assistant-${runId}`;
      const list = prev.messages[agentId] ?? [];
      const existingIndex = list.findIndex((item) => item.msgId === msgId);

      if (existingIndex >= 0) {
        const nextList = [...list];
        nextList[existingIndex] = { ...nextList[existingIndex], text: nextList[existingIndex].text + delta };
        return {
          messages: { ...prev.messages, [agentId]: nextList },
          activeStreams: { ...prev.activeStreams, [agentId]: { runId, msgId } }
        };
      }

      return {
        messages: {
          ...ensureBucket(prev.messages, agentId, []),
          [agentId]: [...list, { msgId, role: "assistant", source: "agent", text: delta, ts }]
        },
        activeStreams: { ...prev.activeStreams, [agentId]: { runId, msgId } }
      };
    })
}));
