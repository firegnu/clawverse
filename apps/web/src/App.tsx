import { useEffect, useMemo, useRef, useState } from "react";
import {
  clientChatSendSchema,
  createAgentInputSchema,
  serverEventSchema,
  type AgentId,
  type AgentKind
} from "@clawverse/protocol";
import { Scene } from "./scene/Scene";
import { useAppStore } from "./store";
import { connectAgent, createAgent, disconnectAgent, listAgents, removeAgent } from "./api";
import { AgentPanel } from "./AgentPanel";

const wsUrl = import.meta.env.VITE_BFF_WS_URL ?? "ws://localhost:8787/ws";

export default function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const [input, setInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("Ready.");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AgentKind>("mock");
  const [wsAgentUrl, setWsAgentUrl] = useState("");
  const [token, setToken] = useState("");
  const {
    agents,
    selectedAgent,
    connection,
    messages,
    setAgents,
    setSelectedAgent,
    setConnection,
    setAgentState,
    pushMessage,
    pushSystemError,
    appendDelta
  } = useAppStore();

  const refreshAgents = async () => {
    try {
      setAgents(await listAgents());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to fetch agents.");
      pushSystemError(error instanceof Error ? error.message : "Failed to fetch agents.", Date.now());
    }
  };

  useEffect(() => {
    void refreshAgents();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnection("connected");
    ws.onclose = () => setConnection("disconnected");
    ws.onerror = () => setConnection("disconnected");
    ws.onmessage = (event) => {
      let raw: unknown;
      try {
        raw = JSON.parse(event.data as string);
      } catch {
        pushSystemError("Received malformed event payload.", Date.now());
        return;
      }

      const parsed = serverEventSchema.safeParse(raw);
      if (!parsed.success) {
        pushSystemError("Received event with invalid schema.", Date.now());
        return;
      }

      const msg = parsed.data;
      if (msg.type === "server.agent.catalog") setAgents(msg.agents);
      if (msg.type === "server.agent.state") setAgentState(msg.agentId, msg.state);
      if (msg.type === "server.chat.message") pushMessage(msg.agentId, msg);
      if (msg.type === "server.stream.delta") appendDelta(msg.agentId, msg.runId, msg.delta, msg.ts);
      if (msg.type === "server.error") pushSystemError(`${msg.code}: ${msg.message}`, msg.ts);
    };

    return () => ws.close();
  }, [appendDelta, pushMessage, pushSystemError, setAgentState, setConnection, setAgents]);

  useEffect(() => {
    if (kind === "openclaw" && wsAgentUrl.trim().length === 0) {
      setWsAgentUrl("ws://127.0.0.1:18789");
      setStatusMessage("Tip: OpenClaw default is ws://127.0.0.1:18789 (no /ws).");
    }
  }, [kind, wsAgentUrl]);

  const selectedMessages = useMemo(() => {
    if (!selectedAgent) return [];
    return messages[selectedAgent] ?? [];
  }, [messages, selectedAgent]);

  const sendMessage = () => {
    const text = input.trim();
    if (!selectedAgent || !text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const outgoing = clientChatSendSchema.parse({
      type: "client.chat.send",
      agentId: selectedAgent,
      text,
      clientMsgId: `client-${Date.now()}`
    });
    wsRef.current.send(JSON.stringify(outgoing));
    setInput("");
  };

  const addAgent = async () => {
    try {
      const safeName = name.trim() || `agent-${agents.length + 1}`;
      if (kind === "openclaw" && !wsAgentUrl.trim()) {
        setStatusMessage("OpenClaw agent requires a WebSocket URL.");
        return;
      }
      const parsed = createAgentInputSchema.parse({
        name: safeName,
        kind,
        wsUrl: wsAgentUrl.trim() || undefined,
        token: token.trim() || undefined
      });
      const created = await createAgent(parsed);
      setStatusMessage(`Added agent: ${created.name} (${created.kind}).`);
      await refreshAgents();
      setName("");
      setWsAgentUrl("");
      setToken("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to add agent.");
      pushSystemError(error instanceof Error ? error.message : "Failed to add agent.", Date.now());
    }
  };

  const runAgentAction = async (task: () => Promise<unknown>) => {
    try {
      await task();
      setStatusMessage("Agent action completed.");
      await refreshAgents();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Agent action failed.");
      pushSystemError(error instanceof Error ? error.message : "Agent action failed.", Date.now());
    }
  };

  const selectedSummary = agents.find((agent) => agent.id === selectedAgent) ?? null;

  return (
    <main className="app-shell">
      <section className="scene-panel">
        <header className="titlebar">
          <h1>Clawverse PoC</h1>
          <span className={`badge ${connection}`}>{connection}</span>
        </header>
        <div className="scene-canvas">
          <Scene selectedAgent={selectedAgent} agents={agents} onSelect={(id: AgentId) => setSelectedAgent(id)} />
        </div>
      </section>

      <section className="chat-panel">
        <AgentPanel
          agents={agents}
          selectedAgent={selectedAgent}
          selectedSummaryText={selectedSummary ? `${selectedSummary.kind} · ${selectedSummary.state}` : "No agent selected"}
          statusMessage={statusMessage}
          name={name}
          kind={kind}
          wsAgentUrl={wsAgentUrl}
          token={token}
          onName={setName}
          onKind={setKind}
          onWsUrl={setWsAgentUrl}
          onToken={setToken}
          onAddAgent={addAgent}
          onSelect={setSelectedAgent}
          onConnect={() => selectedAgent && void runAgentAction(() => connectAgent(selectedAgent))}
          onDisconnect={() => selectedAgent && void runAgentAction(() => disconnectAgent(selectedAgent))}
          onRemove={() => selectedAgent && void runAgentAction(() => removeAgent(selectedAgent))}
        />

        <div className="chat-log">
          {selectedMessages.map((message) => (
            <article key={message.msgId} className={`msg ${message.role}`}>
              <header>
                <strong>{message.role}</strong>
                <small>{message.source}</small>
              </header>
              <p>{message.text}</p>
            </article>
          ))}
        </div>

        <div className="composer">
          <input
            value={input}
            placeholder={selectedAgent ? `Send to ${selectedAgent}` : "Select an agent first"}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} disabled={!selectedAgent}>
            Send
          </button>
        </div>
      </section>
    </main>
  );
}
