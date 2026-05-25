import { z } from "zod";

import type { ToolDefinition, ToolServices } from "../types/ToolTypes.js";

interface AssuranceInput {
  requirementId: string;
  includeEvidence?: boolean;
}

export function createNasaAssuranceTool(services: ToolServices): ToolDefinition<AssuranceInput> {
  return {
    name: "nasa_assurance_lookup",
    title: "NASA Assurance Lookup",
    description: "Retrieve requirement assurance status and optional evidence links.",
    inputSchemaId: "https://mcp-server.local/schemas/assuranceSchema.json",
    outputSchemaId: "https://mcp-server.local/schemas/commonTypes.json#/definitions/toolEnvelope",
    requiredScopes: ["tools:read"],
    annotations: {
      title: "NASA Assurance Lookup",
      readOnlyHint: true,
      idempotentHint: true,
    },
    inputShape: {
      requirementId: z.string().min(1),
      includeEvidence: z.boolean().optional(),
    },
    async execute(input) {
      const record = await services.nasaAssuranceClient.fetchRequirement(input.requirementId, {
        includeEvidence: input.includeEvidence,
      });

      return {
        tool: "nasa_assurance_lookup",
        source: services.nasaAssuranceClient.constructor.name,
        timestamp: new Date().toISOString(),
        data: record,
      };
    },
    summarize(output) {
      const data = output.data as { requirementId?: string; status?: string };
      return `Requirement ${data.requirementId ?? "unknown"} is ${data.status ?? "unknown"}.`;
    },
  };
}