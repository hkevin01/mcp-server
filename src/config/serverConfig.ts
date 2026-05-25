import "dotenv/config";

import type { TransportMode } from "../types/ContextTypes.js";

export interface ServerConfig {
  serverName: string;
  serverVersion: string;
  environment: string;
  transport: TransportMode;
  host: string;
  port: number;
  corsOrigins: string[] | "*";
  executionTimeoutMs: number;
  auth: {
    enabled: boolean;
    headerName: string;
    apiKeys: Set<string>;
    allowAnonymousStdio: boolean;
  };
  mission: {
    missionId: string;
    missionName: string;
    environment: string;
  };
  integrations: {
    jiraBaseUrl?: string;
    jiraToken?: string;
    nasaAssuranceBaseUrl?: string;
    nasaAssuranceToken?: string;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
  };
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readTransport(value: string | undefined): TransportMode {
  return value === "stdio" ? "stdio" : "http";
}

function readOrigins(value: string | undefined): string[] | "*" {
  if (!value || value.trim() === "*") {
    return "*";
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function readApiKeys(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function loadServerConfig(): ServerConfig {
  return {
    serverName: process.env.MCP_SERVER_NAME ?? "mcp-server",
    serverVersion: process.env.MCP_SERVER_VERSION ?? "0.1.0",
    environment: process.env.NODE_ENV ?? "development",
    transport: readTransport(process.env.MCP_TRANSPORT),
    host: process.env.MCP_HOST ?? "127.0.0.1",
    port: readNumber(process.env.MCP_PORT, 8080),
    corsOrigins: readOrigins(process.env.MCP_CORS_ORIGINS),
    executionTimeoutMs: readNumber(process.env.MCP_EXECUTION_TIMEOUT_MS, 15000),
    auth: {
      enabled: readBoolean(process.env.MCP_AUTH_ENABLED, false),
      headerName: (process.env.MCP_API_KEY_HEADER ?? "x-mcp-api-key").toLowerCase(),
      apiKeys: readApiKeys(process.env.MCP_API_KEYS),
      allowAnonymousStdio: true,
    },
    mission: {
      missionId: process.env.MISSION_ID ?? "mission-sample",
      missionName: process.env.MISSION_NAME ?? "Mission Control Scaffold",
      environment: process.env.MISSION_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    },
    integrations: {
      jiraBaseUrl: process.env.JIRA_BASE_URL,
      jiraToken: process.env.JIRA_TOKEN,
      nasaAssuranceBaseUrl: process.env.NASA_ASSURANCE_BASE_URL,
      nasaAssuranceToken: process.env.NASA_ASSURANCE_TOKEN,
    },
    logging: {
      level: (process.env.MCP_LOG_LEVEL as ServerConfig["logging"]["level"] | undefined) ?? "info",
    },
  };
}