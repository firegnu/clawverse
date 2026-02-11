import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer } from "ws";
import {
  clientEventSchema,
  createAgentInputSchema,
  serverEventSchema,
  updateAgentInputSchema,
  type AgentId,
  type ServerEvent
} from "@clawverse/protocol";
import { AgentRegistry } from "./registry";
import { now } from "./utils";

const port = Number(process.env.PORT ?? "8787");
const host = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });
await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
});

const clients = new Set<import("ws").WebSocket>();
const sendToClient = (client: import("ws").WebSocket, event: ServerEvent): void => {
  if (client.readyState !== client.OPEN) {
    return;
  }
  client.send(JSON.stringify(serverEventSchema.parse(event)));
};

const broadcast = (event: ServerEvent): void => {
  const payload = JSON.stringify(serverEventSchema.parse(event));
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
};

const registry = new AgentRegistry(broadcast);
await registry.initialize();

app.get("/health", async () => ({
  status: "ok",
  ts: now(),
  agents: registry.getHealth()
}));

app.get("/api/agents", async () => registry.listSummaries());

app.post("/api/agents", async (request, reply) => {
  const parsed = createAgentInputSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.status(400);
    return { error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }
  try {
    return await registry.createAgent(parsed.data);
  } catch (error) {
    reply.status(400);
    return { error: error instanceof Error ? error.message : "Failed to create agent." };
  }
});

app.patch<{ Params: { agentId: AgentId } }>("/api/agents/:agentId", async (request, reply) => {
  const parsed = updateAgentInputSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.status(400);
    return { error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }
  try {
    return await registry.updateAgent(request.params.agentId, parsed.data);
  } catch (error) {
    reply.status(400);
    return { error: error instanceof Error ? error.message : "Failed to update agent." };
  }
});

app.delete<{ Params: { agentId: AgentId } }>("/api/agents/:agentId", async (request, reply) => {
  try {
    await registry.removeAgent(request.params.agentId);
    return { ok: true };
  } catch (error) {
    reply.status(400);
    return { error: error instanceof Error ? error.message : "Failed to remove agent." };
  }
});

app.post<{ Params: { agentId: AgentId } }>("/api/agents/:agentId/connect", async (request, reply) => {
  try {
    return registry.connectAgent(request.params.agentId);
  } catch (error) {
    reply.status(400);
    return { error: error instanceof Error ? error.message : "Failed to connect agent." };
  }
});

app.post<{ Params: { agentId: AgentId } }>("/api/agents/:agentId/disconnect", async (request, reply) => {
  try {
    return registry.disconnectAgent(request.params.agentId);
  } catch (error) {
    reply.status(400);
    return { error: error instanceof Error ? error.message : "Failed to disconnect agent." };
  }
});

const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (client) => {
  clients.add(client);

  sendToClient(client, registry.buildCatalogEvent());
  for (const agent of registry.listSummaries()) {
    sendToClient(client, {
      type: "server.agent.state",
      agentId: agent.id,
      state: agent.state,
      ts: now()
    });
  }

  client.on("message", (raw) => {
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(raw.toString());
    } catch {
      sendToClient(client, {
        type: "server.error",
        agentId: null,
        code: "INVALID_JSON",
        message: "Message must be valid JSON.",
        ts: now()
      });
      return;
    }

    const parsedEvent = clientEventSchema.safeParse(parsedRaw);
    if (!parsedEvent.success) {
      sendToClient(client, {
        type: "server.error",
        agentId: null,
        code: "INVALID_EVENT",
        message: parsedEvent.error.issues.map((issue) => issue.message).join("; "),
        ts: now()
      });
      return;
    }

    registry.handleClientEvent(parsedEvent.data);
  });

  client.on("close", () => clients.delete(client));
  client.on("error", () => clients.delete(client));
});

app.server.on("upgrade", (request, socket, head) => {
  if (request.url !== "/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
});

await app.listen({ port, host });
app.log.info(`BFF listening on http://${host}:${port}`);
