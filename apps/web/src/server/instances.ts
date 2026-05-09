import { defineHandler } from "nitro/h3";
import { execFile } from "child_process";
import { homedir } from "os";
import { basename, join } from "path";
import { readFileSync, existsSync } from "fs";
import { promisify } from "util";
import { isContainerRunning } from "./lib/docker";

const CONFIG_PATH = join(homedir(), ".portal.json");
const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 1_500;
const PROBE_TIMEOUT_MS = 500;
const SESSION_STATS_TIMEOUT_MS = 2_500;
const SESSION_STATS_COUNT_LIMIT = 10_001;
const SESSION_STATS_DISPLAY_LIMIT = SESSION_STATS_COUNT_LIMIT - 1;

type InstanceType = "process" | "docker";
type InstanceSource = "config" | "discovered";

interface PortalInstance {
  id: string;
  name: string;
  directory: string;
  port: number | null;
  opencodePort: number;
  hostname: string;
  opencodePid: number | null;
  webPid: number | null;
  startedAt: string;
  instanceType: InstanceType;
  containerId: string | null;
}

interface ListeningPort {
  pid: number | null;
  command: string | null;
  port: number;
  host: string;
}

interface ProjectInfo {
  name?: string;
  worktree?: string;
}

interface SessionStats {
  count: number;
  hasMore: boolean;
  lastUpdatedAt: string | null;
}

interface ProbeResult {
  host: string;
  port: number;
  version: string;
  project: ProjectInfo | null;
  sessionStats: SessionStats | null;
}

interface PortalConfig {
  instances: PortalInstance[];
}

function readConfig(): PortalConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, "utf-8");
      const config = JSON.parse(content);
      config.instances = config.instances.map((instance: PortalInstance) => ({
        ...instance,
        instanceType: instance.instanceType || "process",
        containerId: instance.containerId || null,
        opencodePid: instance.opencodePid ?? null,
        webPid: instance.webPid ?? null,
      }));
      return config;
    }
  } catch (error) {
    console.warn(
      `[config] Failed to read config file:`,
      error instanceof Error ? error.message : error,
    );
  }
  return { instances: [] };
}

function isProcessRunning(pid: number | null): boolean {
  if (pid === null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command: string, args: string[]): Promise<string> {
  try {
    const result = await execFileAsync(command, args, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      timeout: COMMAND_TIMEOUT_MS,
    });
    return String(result.stdout);
  } catch {
    return "";
  }
}

function parseAddressPort(
  address: string,
): { host: string; port: number } | null {
  const match = address.match(
    /^(?:TCP\s+)?(\[[^\]]+\]|[^:]+):(\d+)(?:\s|$|\()/,
  );
  if (!match) return null;

  const host = match[1].replace(/^\[|\]$/g, "");
  const port = Number.parseInt(match[2], 10);
  if (!Number.isSafeInteger(port) || port <= 0 || port > 65_535) return null;

  return { host, port };
}

function parseLsof(output: string): ListeningPort[] {
  const ports: ListeningPort[] = [];
  let pid: number | null = null;
  let command: string | null = null;

  for (const line of output.split("\n")) {
    if (!line) continue;
    const field = line[0];
    const value = line.slice(1);

    if (field === "p") {
      pid = Number.parseInt(value, 10);
      if (!Number.isSafeInteger(pid)) pid = null;
      command = null;
      continue;
    }

    if (field === "c") {
      command = value || null;
      continue;
    }

    if (field !== "n") continue;

    const parsed = parseAddressPort(value);
    if (!parsed) continue;

    ports.push({
      pid,
      command,
      port: parsed.port,
      host: parsed.host,
    });
  }

  return ports;
}

async function getListeningPorts(): Promise<ListeningPort[]> {
  const output = await runCommand("lsof", [
    "-nP",
    "-iTCP",
    "-sTCP:LISTEN",
    "-F",
    "pcn",
  ]);

  const seen = new Set<string>();
  const ports: ListeningPort[] = [];

  for (const item of parseLsof(output)) {
    const key = `${item.host}:${item.port}:${item.pid ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ports.push(item);
  }

  return ports;
}

function getProbeHosts(host: string): string[] {
  if (!host || host === "*" || host === "0.0.0.0" || host === "::") {
    return ["localhost", "127.0.0.1", "::1"];
  }

  if (host === "127.0.0.1" || host === "localhost") {
    return ["localhost", "127.0.0.1"];
  }

  if (host === "::1") {
    return ["::1", "localhost"];
  }

  return [host];
}

function formatUrlHost(host: string): string {
  return host.includes(":") ? `[${host}]` : host;
}

async function fetchJson<T>(
  url: string,
  options: { headers?: HeadersInit; timeoutMs?: number } = {},
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? PROBE_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function getTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function getSessionUpdatedAt(session: unknown): number | null {
  if (!session || typeof session !== "object") return null;
  const time = (session as { time?: unknown }).time;
  if (!time || typeof time !== "object") return null;

  return getTimestamp((time as { updated?: unknown }).updated);
}

async function fetchSessionList(
  baseUrl: string,
  headers: HeadersInit | undefined,
  scopedToProject: boolean,
): Promise<unknown[] | null> {
  const params = new URLSearchParams({
    limit: String(SESSION_STATS_COUNT_LIMIT),
  });
  if (scopedToProject) {
    params.set("scope", "project");
  }

  const sessions = await fetchJson<unknown>(`${baseUrl}/session?${params}`, {
    headers,
    timeoutMs: SESSION_STATS_TIMEOUT_MS,
  });

  return Array.isArray(sessions) ? sessions : null;
}

async function fetchSessionStats(
  baseUrl: string,
  directory?: string,
): Promise<SessionStats | null> {
  const headers = directory
    ? { "x-opencode-directory": directory }
    : undefined;
  const sessions =
    (await fetchSessionList(baseUrl, headers, true)) ??
    (await fetchSessionList(baseUrl, headers, false));

  if (!sessions) return null;

  const hasMore = sessions.length > SESSION_STATS_DISPLAY_LIMIT;
  const count = hasMore ? SESSION_STATS_DISPLAY_LIMIT : sessions.length;
  const lastUpdated = sessions[0] ? getSessionUpdatedAt(sessions[0]) : null;

  return {
    count,
    hasMore,
    lastUpdatedAt: lastUpdated ? new Date(lastUpdated).toISOString() : null,
  };
}

function isOpenCodeHealth(
  value: unknown,
): value is { healthy: true; version: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.healthy === true && typeof candidate.version === "string";
}

async function probeOpenCode(
  port: number,
  hosts: string[],
  directory?: string,
): Promise<ProbeResult | null> {
  const uniqueHosts = [...new Set(hosts)];

  for (const host of uniqueHosts) {
    const baseUrl = `http://${formatUrlHost(host)}:${port}`;
    const health = await fetchJson<unknown>(`${baseUrl}/global/health`);
    if (!isOpenCodeHealth(health)) continue;

    const headers = directory
      ? { "x-opencode-directory": directory }
      : undefined;
    const [project, sessionStats] = await Promise.all([
      fetchJson<ProjectInfo>(`${baseUrl}/project/current`, { headers }),
      fetchSessionStats(baseUrl, directory),
    ]);

    return {
      host,
      port,
      version: health.version,
      project,
      sessionStats,
    };
  }

  return null;
}

function directoryName(directory: string): string {
  const normalized = directory.replace(/\\+/g, "/").replace(/\/+$/g, "");
  return basename(normalized) || directory;
}

function createDiscoveredInstance(
  probe: ProbeResult,
  listener?: ListeningPort,
) {
  const directory = probe.project?.worktree ?? "Unknown directory";
  const name =
    probe.project?.name ??
    (probe.project?.worktree
      ? directoryName(probe.project.worktree)
      : `OpenCode :${probe.port}`);

  return {
    id: `opencode-${probe.host}-${probe.port}`,
    name,
    directory,
    port: probe.port,
    hostname: probe.host,
    opencodePid: listener?.pid ?? null,
    webPid: null,
    startedAt: null,
    instanceType: "process" as const,
    containerId: null,
    source: "discovered" as const,
    version: probe.version,
    sessionStats: probe.sessionStats,
    state: "running" as const,
    status: `Discovered on ${probe.host}:${probe.port}`,
  };
}

async function discoverOpenCodeServers(
  configuredPorts: Set<number>,
): Promise<ReturnType<typeof createDiscoveredInstance>[]> {
  const listeners = await getListeningPorts();
  const listenersByPort = new Map<number, ListeningPort>();

  for (const listener of listeners) {
    if (!listenersByPort.has(listener.port)) {
      listenersByPort.set(listener.port, listener);
    }
  }

  const probePorts = [...new Set(listeners.map((listener) => listener.port))];
  const discovered = await Promise.all(
    probePorts.map(async (port) => {
      if (configuredPorts.has(port)) return null;

      const listenersForPort = listeners.filter(
        (listener) => listener.port === port,
      );
      const hosts = listenersForPort.flatMap((listener) =>
        getProbeHosts(listener.host),
      );
      const probe = await probeOpenCode(
        port,
        hosts.length ? hosts : ["localhost"],
      );
      if (!probe) return null;

      return createDiscoveredInstance(probe, listenersByPort.get(port));
    }),
  );

  return discovered.filter((instance) => instance !== null);
}

export default defineHandler(async () => {
  const config = readConfig();
  const configuredPorts = new Set(
    config.instances.map((instance) => instance.opencodePort),
  );

  const instancePromises = config.instances.map(async (instance) => {
    let opencodeRunning = false;
    if (instance.instanceType === "docker") {
      opencodeRunning = await isContainerRunning(instance.containerId);
    } else {
      opencodeRunning = isProcessRunning(instance.opencodePid);
    }
    const webRunning = isProcessRunning(instance.webPid);
    const probe = await probeOpenCode(
      instance.opencodePort,
      [
        instance.hostname && instance.hostname !== "0.0.0.0"
          ? instance.hostname
          : "localhost",
        "127.0.0.1",
      ],
      instance.directory,
    );

    if (!opencodeRunning && !probe) {
      return null;
    }

    return {
      id: instance.id,
      name:
        instance.name ||
        probe?.project?.name ||
        directoryName(instance.directory),
      directory: probe?.project?.worktree ?? instance.directory,
      port: instance.opencodePort,
      hostname: instance.hostname,
      opencodePid: instance.opencodePid,
      webPid: instance.webPid,
      startedAt: instance.startedAt,
      instanceType: instance.instanceType,
      containerId: instance.containerId,
      source: "config" as InstanceSource,
      version: probe?.version ?? null,
      sessionStats: probe?.sessionStats ?? null,
      state: "running" as const,
      status: instance.startedAt
        ? `Running since ${new Date(instance.startedAt).toLocaleString()}`
        : `Running on ${instance.hostname}:${instance.opencodePort}`,
    };
  });

  const [configuredResults, discoveredInstances] = await Promise.all([
    Promise.all(instancePromises),
    discoverOpenCodeServers(configuredPorts),
  ]);
  const instances = [
    ...configuredResults.filter((instance) => instance !== null),
    ...discoveredInstances,
  ];

  return {
    total: instances.length,
    instances,
  };
});
