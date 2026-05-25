import type { ExecutionContext } from "../types/ToolTypes.js";

export interface McpServerPlugin {
  name: string;
  onRequestStart?: (toolName: string, context: ExecutionContext, input: unknown) => Promise<void> | void;
  onRequestSuccess?: (toolName: string, context: ExecutionContext, output: unknown) => Promise<void> | void;
  onRequestError?: (toolName: string, context: ExecutionContext, error: unknown) => Promise<void> | void;
}

export function createBuiltinPlugins(): McpServerPlugin[] {
  return [
    {
      name: "request-logging",
      onRequestStart(toolName, context) {
        context.logger.info("Tool execution started", {
          toolName,
          requestId: context.requestId,
          subject: context.auth.subject,
        });
      },
      onRequestSuccess(toolName, context, output) {
        context.logger.info("Tool execution completed", {
          toolName,
          requestId: context.requestId,
          outputKeys: output && typeof output === "object" ? Object.keys(output as Record<string, unknown>) : [],
        });
      },
      onRequestError(toolName, context, error) {
        context.logger.error("Tool execution failed", {
          toolName,
          requestId: context.requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      },
    },
  ];
}