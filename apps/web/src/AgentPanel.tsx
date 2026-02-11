import type { AgentId, AgentKind, AgentSummary } from "@clawverse/protocol";

type AgentPanelProps = {
  agents: AgentSummary[];
  selectedAgent: AgentId | null;
  selectedSummaryText: string;
  statusMessage: string;
  name: string;
  kind: AgentKind;
  wsAgentUrl: string;
  token: string;
  onName: (value: string) => void;
  onKind: (value: AgentKind) => void;
  onWsUrl: (value: string) => void;
  onToken: (value: string) => void;
  onAddAgent: () => void;
  onSelect: (agentId: AgentId) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRemove: () => void;
};

export const AgentPanel = ({
  agents,
  selectedAgent,
  selectedSummaryText,
  statusMessage,
  name,
  kind,
  wsAgentUrl,
  token,
  onName,
  onKind,
  onWsUrl,
  onToken,
  onAddAgent,
  onSelect,
  onConnect,
  onDisconnect,
  onRemove
}: AgentPanelProps) => (
  <>
    <div className="agent-manager">
      <input value={name} placeholder="Agent name" onChange={(event) => onName(event.target.value)} />
      <select value={kind} onChange={(event) => onKind(event.target.value as AgentKind)}>
        <option value="mock">mock</option>
        <option value="openclaw">openclaw</option>
      </select>
      <input value={wsAgentUrl} placeholder="ws://127.0.0.1:8787/ws" onChange={(event) => onWsUrl(event.target.value)} />
      <input value={token} placeholder="token (optional)" onChange={(event) => onToken(event.target.value)} />
      <button onClick={onAddAgent}>Add Agent</button>
    </div>

    <div className="agent-tabs">
      {agents.map((agent) => (
        <button key={agent.id} className={selectedAgent === agent.id ? "tab active" : "tab"} onClick={() => onSelect(agent.id)}>
          {agent.name} · {agent.connection}
        </button>
      ))}
    </div>

    <div className="agent-actions">
      <button disabled={!selectedAgent} onClick={onConnect}>
        Connect
      </button>
      <button disabled={!selectedAgent} onClick={onDisconnect}>
        Disconnect
      </button>
      <button disabled={!selectedAgent} onClick={onRemove}>
        Remove
      </button>
      <small>{selectedSummaryText}</small>
    </div>
    <div style={{ padding: "0 10px 8px", color: "#9ab2d7", fontSize: "12px" }}>{statusMessage}</div>
  </>
);
