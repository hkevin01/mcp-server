import type { IncomingHttpHeaders } from "node:http";
import type { z } from "zod";

import type { ResolvedContext, TransportMode } from "./ContextTypes.js";
import type { LoggingService } from "../services/loggingService.js";

export interface AuthContext {
  subject: string;
  roles: string[];
  scopes: string[];
  authenticated: boolean;
  authType: "api-key" | "local" | "anonymous";
}

export interface ExecutionContext {
  requestId: string;
  sessionId?: string;
  transport: TransportMode;
  auth: AuthContext;
  headers: IncomingHttpHeaders;
  contexts: ResolvedContext;
  logger: LoggingService;
  executionTimeoutMs: number;
  rawMcpContext?: unknown;
}

export interface ToolDefinition<Input = any, Output = Record<string, unknown>> {
  name: string;
  title: string;
  description: string;
  inputSchemaId: string;
  outputSchemaId?: string;
  requiredScopes?: string[];
  annotations?: Record<string, boolean | string | number>;
  inputShape: Record<string, z.ZodTypeAny>;
  execute: (input: Input, context: ExecutionContext) => Promise<Output>;
  summarize?: (output: Output) => string;
}

export interface ToolRegistryResult<Output = Record<string, unknown>> {
  result: Output;
  summary: string;
}

export interface ToolServices {
  jiraClient: {
    search: (query: string, options?: { limit?: number; projectKey?: string }) => Promise<unknown[]>;
  };
  nasaAssuranceClient: {
    fetchRequirement: (requirementId: string, options?: { includeEvidence?: boolean }) => Promise<Record<string, unknown>>;
  };
  dbClient: {
    search: (query: string, options?: { domain?: string; maxResults?: number }) => Promise<unknown[]>;
  };
  logger: LoggingService;
}