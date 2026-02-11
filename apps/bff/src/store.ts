import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AgentKind, AgentSummary } from "@clawverse/protocol";

export type StoredAgent = {
  id: string;
  name: string;
  kind: AgentKind;
  wsUrl: string | null;
  token: string | null;
};

const storeSchemaVersion = 1;

type StoreShape = {
  version: number;
  agents: StoredAgent[];
};

const defaultFile = resolve(process.cwd(), "data/agents.json");

export const storePath = process.env.AGENT_STORE_PATH ?? defaultFile;

const normalizeStoredAgent = (entry: Partial<StoredAgent>): StoredAgent | null => {
  if (!entry.id || !entry.name || !entry.kind) {
    return null;
  }
  if (entry.kind !== "mock" && entry.kind !== "openclaw") {
    return null;
  }
  return {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    wsUrl: entry.wsUrl ?? null,
    token: entry.token ?? null
  };
};

export const loadStoredAgents = async (): Promise<StoredAgent[]> => {
  try {
    const content = await readFile(storePath, "utf8");
    const parsed = JSON.parse(content) as StoreShape;
    if (!parsed || parsed.version !== storeSchemaVersion || !Array.isArray(parsed.agents)) {
      return [];
    }
    return parsed.agents.map((agent) => normalizeStoredAgent(agent)).filter((agent): agent is StoredAgent => !!agent);
  } catch {
    return [];
  }
};

export const saveStoredAgents = async (agents: StoredAgent[]): Promise<void> => {
  await mkdir(dirname(storePath), { recursive: true });
  const payload: StoreShape = { version: storeSchemaVersion, agents };
  await writeFile(storePath, JSON.stringify(payload, null, 2), "utf8");
};

export const toStoredAgents = (summaries: AgentSummary[], tokens: Map<string, string | null>): StoredAgent[] =>
  summaries.map((summary) => ({
    id: summary.id,
    name: summary.name,
    kind: summary.kind,
    wsUrl: summary.wsUrl,
    token: tokens.get(summary.id) ?? null
  }));
