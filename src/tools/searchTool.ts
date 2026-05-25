import { z } from "zod";

import type { ToolDefinition, ToolServices } from "../types/ToolTypes.js";

interface SearchInput {
  query: string;
  domain?: string;
  maxResults?: number;
}

export function createSearchTool(services: ToolServices): ToolDefinition<SearchInput> {
  return {
    name: "search_knowledge",
    title: "Search Knowledge",
    description: "Search indexed operational and assurance knowledge.",
    inputSchemaId: "https://mcp-server.local/schemas/searchSchema.json",
    outputSchemaId: "https://mcp-server.local/schemas/commonTypes.json#/definitions/toolEnvelope",
    requiredScopes: ["tools:read"],
    annotations: {
      title: "Search Knowledge",
      readOnlyHint: true,
      idempotentHint: true,
    },
    inputShape: {
      query: z.string().min(1),
      domain: z.string().min(1).optional(),
      maxResults: z.number().int().min(1).max(25).optional(),
    },
    async execute(input) {
      const hits = await services.dbClient.search(input.query, {
        domain: input.domain,
        maxResults: input.maxResults,
      });

      return {
        tool: "search_knowledge",
        source: services.dbClient.constructor.name,
        timestamp: new Date().toISOString(),
        data: {
          hits,
          query: input.query,
        },
      };
    },
    summarize(output) {
      const hits = Array.isArray((output.data as { hits?: unknown[] }).hits)
        ? ((output.data as { hits?: unknown[] }).hits ?? [])
        : [];
      return `Returned ${hits.length} search hit(s).`;
    },
  };
}