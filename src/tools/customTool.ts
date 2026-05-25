import { z } from "zod";

import type { ToolDefinition, ToolServices } from "../types/ToolTypes.js";

interface CustomToolInput {
  action: string;
  payload?: unknown;
}

export function createCustomTool(services: ToolServices): ToolDefinition<CustomToolInput> {
  return {
    name: "custom_action",
    title: "Custom Action",
    description: "Placeholder for domain-specific side effects or orchestrated workflows.",
    inputSchemaId: "https://mcp-server.local/schemas/customToolSchema.json",
    outputSchemaId: "https://mcp-server.local/schemas/commonTypes.json#/definitions/toolEnvelope",
    requiredScopes: ["tools:write"],
    annotations: {
      title: "Custom Action",
      readOnlyHint: false,
      idempotentHint: false,
    },
    inputShape: {
      action: z.string().min(1),
      payload: z.unknown().optional(),
    },
    async execute(input, context) {
      services.logger.info("Custom action invoked", {
        action: input.action,
        requestId: context.requestId,
      });

      return {
        tool: "custom_action",
        source: "custom-domain-handler",
        timestamp: new Date().toISOString(),
        data: {
          acknowledged: true,
          action: input.action,
          payload: input.payload ?? null,
        },
      };
    },
    summarize(output) {
      const data = output.data as { action?: string };
      return `Custom action ${data.action ?? "unknown"} acknowledged.`;
    },
  };
}