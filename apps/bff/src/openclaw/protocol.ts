export const buildAuthHeaders = (token: string | null): Record<string, string> => {
  if (!token) return {};
  return { "x-auth-token": token, Authorization: `Bearer ${token}` };
};

export const buildSocketUrl = (rawUrl: string, token: string | null): string => {
  if (!token) return rawUrl;
  const appendQuery = (process.env.OPENCLAW_APPEND_TOKEN_QUERY ?? "true").toLowerCase() === "true";
  if (!appendQuery) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has("token")) url.searchParams.set("token", token);
    return url.toString();
  } catch {
    return rawUrl;
  }
};

export const buildConnectParams = (token: string | null): Record<string, unknown> => ({
  minProtocol: 3,
  maxProtocol: 3,
  client: { id: "cli", version: clientVersion(), platform: "macos", mode: "cli" },
  role: "operator",
  scopes: ["operator.read", "operator.write"],
  caps: [],
  commands: [],
  permissions: {},
  ...(token ? { auth: { token } } : {}),
  locale: "en-US",
  userAgent: `clawverse-bff/${clientVersion()}`
});

export const getAgentTimeoutSeconds = (): number => {
  const value = Number(process.env.OPENCLAW_AGENT_TIMEOUT_SECONDS ?? "120");
  return Number.isFinite(value) && value > 0 ? value : 120;
};

export const formatCloseReason = (code: number, reason: string): string => {
  const tail = reason.trim().length > 0 ? `: ${reason.trim()}` : "";
  return `socket closed (${code})${tail}`;
};

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

export const asText = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

export const getErrorMessage = (frame: Record<string, unknown>): string | null => {
  const error = asRecord(frame.error);
  return asText(error?.message);
};

export const extractMessageText = (message: Record<string, unknown>): string | null => {
  const direct = asText(message.text);
  if (direct) return direct;
  const content = message.content;
  if (!Array.isArray(content)) return null;
  const chunks: string[] = [];
  for (const item of content) {
    const chunk = asRecord(item);
    if (!chunk || chunk.type !== "text") continue;
    const text = asText(chunk.text);
    if (text) chunks.push(text);
  }
  return chunks.length > 0 ? chunks.join("") : null;
};

const clientVersion = (): string => process.env.npm_package_version ?? "0.1.0";
