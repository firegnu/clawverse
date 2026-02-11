import { z } from "zod";

export const agentIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const agentKindSchema = z.enum(["mock", "openclaw"]);
export const agentConnectionSchema = z.enum(["disconnected", "connecting", "connected", "error"]);
export const agentStateSchema = z.enum(["idle", "thinking", "running", "error"]);
export const messageRoleSchema = z.enum(["user", "assistant", "system"]);
export const messageSourceSchema = z.enum(["scene", "telegram", "agent"]);
const timestampSchema = z.number().int().positive();
const nullableTextSchema = z.string().min(1).nullable();

export const agentSummarySchema = z.object({
  id: agentIdSchema,
  name: z.string().min(1).max(80),
  kind: agentKindSchema,
  wsUrl: z.string().url().nullable(),
  connection: agentConnectionSchema,
  state: agentStateSchema,
  lastError: nullableTextSchema
});

export const createAgentInputSchema = z.object({
  id: agentIdSchema.optional(),
  name: z.string().min(1).max(80),
  kind: agentKindSchema,
  wsUrl: z.string().url().optional(),
  token: z.string().min(1).optional()
});

export const updateAgentInputSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  kind: agentKindSchema.optional(),
  wsUrl: z.string().url().optional(),
  token: z.string().min(1).optional()
});

export const clientChatSendSchema = z.object({
  type: z.literal("client.chat.send"),
  agentId: agentIdSchema,
  text: z.string().min(1).max(4000),
  clientMsgId: z.string().min(1).max(128)
});

export const clientEventSchema = z.discriminatedUnion("type", [clientChatSendSchema]);

export const serverAgentStateSchema = z.object({
  type: z.literal("server.agent.state"),
  agentId: agentIdSchema,
  state: agentStateSchema,
  ts: timestampSchema
});

export const serverAgentCatalogSchema = z.object({
  type: z.literal("server.agent.catalog"),
  agents: z.array(agentSummarySchema),
  ts: timestampSchema
});

export const serverChatMessageSchema = z.object({
  type: z.literal("server.chat.message"),
  agentId: agentIdSchema,
  role: messageRoleSchema,
  source: messageSourceSchema,
  text: z.string().min(1),
  msgId: z.string().min(1),
  ts: timestampSchema
});

export const serverStreamDeltaSchema = z.object({
  type: z.literal("server.stream.delta"),
  agentId: agentIdSchema,
  runId: z.string().min(1),
  delta: z.string(),
  ts: timestampSchema
});

export const serverErrorSchema = z.object({
  type: z.literal("server.error"),
  agentId: agentIdSchema.nullable(),
  code: z.string().min(1),
  message: z.string().min(1),
  ts: timestampSchema
});

export const serverEventSchema = z.discriminatedUnion("type", [
  serverAgentCatalogSchema,
  serverAgentStateSchema,
  serverChatMessageSchema,
  serverStreamDeltaSchema,
  serverErrorSchema
]);

export type AgentId = z.infer<typeof agentIdSchema>;
export type AgentKind = z.infer<typeof agentKindSchema>;
export type AgentConnection = z.infer<typeof agentConnectionSchema>;
export type AgentState = z.infer<typeof agentStateSchema>;
export type AgentSummary = z.infer<typeof agentSummarySchema>;
export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentInputSchema>;
export type ClientChatSend = z.infer<typeof clientChatSendSchema>;
export type ClientEvent = z.infer<typeof clientEventSchema>;
export type ServerEvent = z.infer<typeof serverEventSchema>;
